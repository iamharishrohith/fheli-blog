const state = {
  personnel: [],
  ledger: [],
  cameraStream: null,
};

const panels = [...document.querySelectorAll('.panel')];
const navItems = [...document.querySelectorAll('.nav-item')];
const form = document.getElementById('personnel-form');
const formMessage = document.getElementById('form-message');
const personnelCards = document.getElementById('personnel-cards');
const ledgerRows = document.getElementById('ledger-rows');
const cameraPreview = document.getElementById('camera-preview');
const captureCanvas = document.getElementById('capture-canvas');
const capturedPhoto = document.getElementById('captured-photo');
const facePhotoInput = document.getElementById('face-photo');

navItems.forEach((item) => {
  item.addEventListener('click', () => {
    navItems.forEach((nav) => nav.classList.remove('active'));
    panels.forEach((panel) => panel.classList.add('hidden'));
    item.classList.add('active');
    document.getElementById(item.dataset.panel).classList.remove('hidden');
  });
});

document.getElementById('start-camera').addEventListener('click', startCamera);
document.getElementById('capture-face').addEventListener('click', captureFace);
document.getElementById('refresh-personnel').addEventListener('click', loadData);
document.getElementById('reset-form').addEventListener('click', resetForm);
form.addEventListener('submit', savePersonnel);

async function startCamera() {
  try {
    state.cameraStream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'user', width: { ideal: 960 }, height: { ideal: 720 } },
      audio: false,
    });
    cameraPreview.srcObject = state.cameraStream;
    setMessage('Camera started. Center your face, then capture.', 'ok');
  } catch (error) {
    setMessage(`Camera error: ${error.message}`, 'error');
  }
}

function captureFace() {
  if (!state.cameraStream) {
    setMessage('Start the camera before capturing a face.', 'error');
    return;
  }

  const context = captureCanvas.getContext('2d');
  context.drawImage(cameraPreview, 0, 0, captureCanvas.width, captureCanvas.height);
  const photo = captureCanvas.toDataURL('image/jpeg', 0.82);
  facePhotoInput.value = photo;
  capturedPhoto.src = photo;
  capturedPhoto.classList.add('visible');
  setMessage('Face image captured for the demo record.', 'ok');
}

async function savePersonnel(event) {
  event.preventDefault();

  const payload = Object.fromEntries(new FormData(form).entries());
  payload.consent = payload.consent === 'on';

  try {
    const response = await fetch('/api/personnel', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || 'Unable to save record.');
    }

    setMessage(`Stored ${result.full_name} (${result.employee_code}).`, 'ok');
    resetForm(false);
    await loadData();
  } catch (error) {
    setMessage(error.message, 'error');
  }
}

function resetForm(clearMessage = true) {
  form.reset();
  facePhotoInput.value = '';
  capturedPhoto.removeAttribute('src');
  capturedPhoto.classList.remove('visible');
  if (clearMessage) {setMessage('', '');}
}

async function deletePersonnel(id) {
  const response = await fetch(`/api/personnel/${id}`, { method: 'DELETE' });
  if (!response.ok) {
    const result = await response.json();
    setMessage(result.error || 'Delete failed.', 'error');
    return;
  }
  await loadData();
}

async function loadData() {
  const [personnelResponse, ledgerResponse] = await Promise.all([
    fetch('/api/personnel'),
    fetch('/api/ledger'),
  ]);

  state.personnel = await personnelResponse.json();
  state.ledger = await ledgerResponse.json();
  renderMetrics();
  renderPersonnel();
  renderLedger();
}

function renderMetrics() {
  document.getElementById('metric-personnel').textContent = state.personnel.length;
  document.getElementById('metric-faces').textContent =
    state.personnel.filter((record) => record.face_photo).length;
  document.getElementById('metric-ledger').textContent = state.ledger.length;
}

function renderPersonnel() {
  personnelCards.innerHTML = '';

  if (state.personnel.length === 0) {
    personnelCards.innerHTML = '<p class="empty">No demo records stored yet.</p>';
    return;
  }

  state.personnel.forEach((record) => {
    const card = document.createElement('article');
    card.className = 'record-card';
    card.innerHTML = `
      <img class="record-photo" src="${record.face_photo || ''}" alt="${escapeHtml(record.full_name)} face">
      <div class="record-body">
        <strong>${escapeHtml(record.full_name)}</strong>
        <span>${escapeHtml(record.employee_code)}</span>
        <p>${escapeHtml(record.role)} · ${escapeHtml(record.department)}</p>
        <small>${escapeHtml(record.site_location)}</small>
      </div>
      <button class="delete-btn" type="button">Delete</button>
    `;
    card.querySelector('.delete-btn').addEventListener('click', () => deletePersonnel(record.id));
    personnelCards.appendChild(card);
  });
}

function renderLedger() {
  ledgerRows.innerHTML = '';

  if (state.ledger.length === 0) {
    ledgerRows.innerHTML = '<tr><td colspan="6">No mobile sync records yet.</td></tr>';
    return;
  }

  state.ledger.forEach((record) => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${escapeHtml(record.personnel_id)}</td>
      <td>${escapeHtml(record.device_id)}</td>
      <td>${Number(record.verification_score).toFixed(3)}</td>
      <td>${Number(record.latitude).toFixed(5)}, ${Number(record.longitude).toFixed(5)}</td>
      <td>${escapeHtml(record.verification_status)}</td>
      <td>${new Date(record.received_at).toLocaleString()}</td>
    `;
    ledgerRows.appendChild(row);
  });
}

function setMessage(text, type) {
  formMessage.textContent = text;
  formMessage.className = `message ${type}`;
}

function escapeHtml(value) {
  return String(value || '').replace(/[&<>"']/g, (char) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  }[char]));
}

loadData();
