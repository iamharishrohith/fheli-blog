/* eslint-env node */
const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');
const { groth16 } = require('snarkjs');

const app = express();
const PORT = process.env.PORT || 3000;
const dataDir = process.env.FIELDID_DATA_DIR || path.join(__dirname, 'data');
const uploadDir = path.join(dataDir, 'uploads');
const facesDir = path.join(uploadDir, 'faces');
const dbPath = process.env.FIELDID_DB_PATH || path.join(dataDir, 'fieldid_registry_live.db');
const personnelStorePath = path.join(dataDir, 'demo_personnel.json');

fs.mkdirSync(facesDir, { recursive: true });
ensureJsonStore();

// Enable CORS and raw body parsing for batched sync operations
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(uploadDir));

// 1. Establish SQLite secure ledger database
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Failed to open Datalake secure ledger database:', err);
  } else {
    console.log('Datalake 3.0 Ledger SQLite Database opened successfully.');
    createTables();
  }
});

function createTables() {
  // Sync Log registry
  db.serialize(() => {
    db.run(`
      CREATE TABLE IF NOT EXISTS sync_ledger (
        id TEXT PRIMARY KEY NOT NULL,
        device_id TEXT NOT NULL,
        personnel_id TEXT NOT NULL,
        timestamp INTEGER NOT NULL,
        latitude REAL NOT NULL,
        longitude REAL NOT NULL,
        verification_score REAL NOT NULL,
        liveness_score REAL NOT NULL,
        zk_proof TEXT NOT NULL,
        verification_status TEXT NOT NULL,
        payload_hash TEXT NOT NULL,
        received_at INTEGER NOT NULL
      )
    `, handleDbInitError('sync_ledger'));

    db.run(`
      CREATE TABLE IF NOT EXISTS demo_personnel (
        id TEXT PRIMARY KEY NOT NULL,
        full_name TEXT NOT NULL,
        employee_code TEXT UNIQUE NOT NULL,
        department TEXT NOT NULL,
        role TEXT NOT NULL,
        phone TEXT,
        email TEXT,
        site_location TEXT NOT NULL,
        face_photo TEXT,
        consent INTEGER NOT NULL DEFAULT 0,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      )
    `, handleDbInitError('demo_personnel'));
  });
}

function handleDbInitError(tableName) {
  return (err) => {
    if (err) {
      console.error(`Failed to initialize ${tableName}:`, err);
    }
  };
}

// 2. AWS Ingestion Endpoint: /v1/fieldid-sync
// Processes, decodes, and verifies zero-knowledge Groth16 cryptographic attendance proofs
app.post('/v1/fieldid-sync', async (req, res) => {
  console.log(`[Datalake Gateway] Received attendance sync batch at: ${new Date().toISOString()}`);

  const { deviceId, records } = req.body;

  if (!records || !Array.isArray(records)) {
    return res.status(400).json({ status: 'ERROR', message: 'Invalid payload: batched records missing.' });
  }

  const verifiedRecords = [];
  const failedRecords = [];

  const verificationKeyPath = process.env.ZK_VERIFICATION_KEY_PATH
    || path.join(__dirname, 'assets', 'attendance.vkey.json');
  const verificationKey = loadVerificationKey(verificationKeyPath);

  if (!verificationKey) {
    return res.status(503).json({
      status: 'ERROR',
      message: 'ZK verification key is not configured on the gateway.',
    });
  }

  for (const record of records) {
    try {
      console.log(`[Cryptographic Audit] Checking zk-Proof for User: ${record.personnelId}`);

      if (!record.zkProof || !Array.isArray(record.zkPublicInputs)) {
        throw new Error('Missing Groth16 proof payload or public inputs.');
      }

      const parsedProof = typeof record.zkProof === 'string'
        ? JSON.parse(record.zkProof)
        : record.zkProof;
      const isValid = await groth16.verify(
        verificationKey,
        record.zkPublicInputs.map(String),
        parsedProof
      );

      if (isValid) {
        console.log(`[PASS] Cryptographic constraints satisfied for User: ${record.personnelId}. Logging transaction.`);

        // Log in persistent SQLite secure ledger
        db.run(
          'INSERT OR REPLACE INTO sync_ledger (id, device_id, personnel_id, timestamp, latitude, longitude, verification_score, liveness_score, zk_proof, verification_status, payload_hash, received_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
          [
            record.id,
            deviceId || 'Unknown-Edge',
            record.personnelId,
            record.timestamp,
            record.latitude,
            record.longitude,
            record.verificationScore,
            record.livenessScore,
            record.zkProof,
            'VERIFIED_SUCCESS',
            record.payloadHash,
            Date.now(),
          ]
        );

        verifiedRecords.push(record.id);
      } else {
        console.warn(`[WARN] Cryptographic proof failed verification parameters for User: ${record.personnelId}. Logging anomaly.`);
        failedRecords.push(record.id);
      }
    } catch (err) {
      console.error(`[FAIL] Verification exception for Record: ${record.id}. Error:`, err);
      failedRecords.push(record.id);
    }
  }

  // Purge-on-Receipt standard handshake response
  res.json({
    status: 'SUCCESS',
    statusCode: 200,
    timestamp: Date.now(),
    receipt: {
      deviceId,
      processedCount: records.length,
      verified: verifiedRecords,
      failed: failedRecords,
    },
  });
});

function loadVerificationKey(verificationKeyPath) {
  try {
    return JSON.parse(fs.readFileSync(verificationKeyPath, 'utf8'));
  } catch (err) {
    console.error(`Failed to load ZK verification key at ${verificationKeyPath}:`, err.message);
    return null;
  }
}

// 3. Admin Ledger API
// Serves records to the glassmorphic administrative interface
app.get('/api/ledger', (req, res) => {
  db.all('SELECT * FROM sync_ledger ORDER BY received_at DESC', (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
    } else {
      res.json(rows);
    }
  });
});

app.get('/api/personnel', (req, res) => {
  res.json(readPersonnelStore());
});

app.get('/api/personnel/export', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Content-Disposition', 'attachment; filename="nhai-fieldid-demo-personnel.json"');
  res.send(JSON.stringify({ exportedAt: Date.now(), records: readPersonnelStore() }, null, 2));
});

app.post('/api/personnel', (req, res) => {
  const {
    fullName,
    employeeCode,
    department,
    role,
    phone = '',
    email = '',
    siteLocation,
    facePhoto = '',
    consent,
  } = req.body;

  if (!fullName || !employeeCode || !department || !role || !siteLocation) {
    res.status(400).json({ error: 'Name, employee code, department, role, and site location are required.' });
    return;
  }

  if (!consent) {
    res.status(400).json({ error: 'Consent is required before storing demo face data.' });
    return;
  }

  const now = Date.now();
  const id = `DEMO_${now}`;
  const storedFacePhoto = storeFacePhoto(id, facePhoto);

  const records = readPersonnelStore();
  if (records.some((record) => record.employee_code === employeeCode.trim())) {
    res.status(409).json({ error: 'Employee code already exists.' });
    return;
  }

  const record = {
    id,
    full_name: fullName.trim(),
    employee_code: employeeCode.trim(),
    department: department.trim(),
    role: role.trim(),
    phone: phone.trim(),
    email: email.trim(),
    site_location: siteLocation.trim(),
    face_photo: storedFacePhoto,
    consent: 1,
    created_at: now,
    updated_at: now,
  };

  records.unshift(record);
  writePersonnelStore(records);
  res.status(201).json(record);
});

app.delete('/api/personnel/:id', (req, res) => {
  const records = readPersonnelStore();
  const record = records.find((item) => item.id === req.params.id);

  if (!record) {
    res.status(404).json({ error: 'Personnel record not found.' });
    return;
  }

  deleteFacePhoto(record.face_photo || '');
  writePersonnelStore(records.filter((item) => item.id !== req.params.id));
  res.json({ status: 'DELETED', id: req.params.id });
});

function ensureJsonStore() {
  if (!fs.existsSync(personnelStorePath)) {
    fs.writeFileSync(personnelStorePath, '[]');
  }
}

function readPersonnelStore() {
  ensureJsonStore();
  return JSON.parse(fs.readFileSync(personnelStorePath, 'utf8'));
}

function writePersonnelStore(records) {
  fs.writeFileSync(personnelStorePath, JSON.stringify(records, null, 2));
}

function storeFacePhoto(id, facePhoto) {
  if (!facePhoto || typeof facePhoto !== 'string') {
    return '';
  }

  const match = facePhoto.match(/^data:image\/(png|jpeg|jpg);base64,(.+)$/);
  if (!match) {
    return facePhoto;
  }

  const extension = match[1] === 'png' ? 'png' : 'jpg';
  const filename = `${id}.${extension}`;
  fs.writeFileSync(path.join(facesDir, filename), Buffer.from(match[2], 'base64'));
  return `/uploads/faces/${filename}`;
}

function deleteFacePhoto(facePhotoPath) {
  if (!facePhotoPath.startsWith('/uploads/faces/')) {
    return;
  }

  const filename = path.basename(facePhotoPath);
  const fullPath = path.join(facesDir, filename);
  try {
    if (fs.existsSync(fullPath)) {
      fs.unlinkSync(fullPath);
    }
  } catch (err) {
    console.warn(`Could not delete captured face image ${filename}:`, err.message);
  }
}

// Start Gateway
app.listen(PORT, () => {
  console.log('================================================================');
  console.log('     DATALAKE 3.0: SECURE BIOMETRICS sync API GATEWAY           ');
  console.log(`     OFFLINE INGESTION & CRYPTO PROVER ONLINE ON PORT: ${PORT}  `);
  console.log('================================================================');
});
