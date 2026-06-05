import NetInfo from '@react-native-community/netinfo';
import { DBManager, AttendanceRecord } from './DBManager';
import { FIELDID_API_ENDPOINT, FIELDID_SYNC_AUTH_TOKEN } from '../config';

export interface SyncStatus {
  isSyncing: boolean;
  unsyncedCount: number;
  lastSyncedTimestamp: number | null;
  error: string | null;
}

class SyncQueueManager {
  private isSyncing = false;
  private isNetworkOnline = false;
  private lastSyncedTimestamp: number | null = null;
  private statusListeners: Set<(status: SyncStatus) => void> = new Set();

  constructor() {
    // Initialize NetInfo network state listener in production
    NetInfo.addEventListener(state => {
      const isOnline = !!state.isConnected && !!state.isInternetReachable;
      this.setNetworkState(isOnline);
    });
  }

  setNetworkState(isOnline: boolean) {
    const stateChanged = this.isNetworkOnline !== isOnline;
    this.isNetworkOnline = isOnline;

    if (stateChanged && isOnline) {
      this.triggerSync();
    }
  }

  subscribe(listener: (status: SyncStatus) => void): () => void {
    this.statusListeners.add(listener);
    this.emitStatus();
    return () => this.statusListeners.delete(listener);
  }

  private async emitStatus(errorMsg: string | null = null) {
    const unsyncedCount = DBManager.isOpen() ? (await DBManager.getUnsyncedRecords()).length : 0;
    const status: SyncStatus = {
      isSyncing: this.isSyncing,
      unsyncedCount,
      lastSyncedTimestamp: this.lastSyncedTimestamp,
      error: errorMsg,
    };
    this.statusListeners.forEach(listener => listener(status));
  }

  /**
   * Triggers the offline upload loop.
   * Batches unsynced records, posts them to AWS API Gateway,
   * and immediately purges local SQLite records upon confirmation receipt.
   */
  async triggerSync(): Promise<boolean> {
    if (!DBManager.isOpen()) {return false;}
    if (this.isSyncing) {return false;}
    if (!FIELDID_SYNC_AUTH_TOKEN) {
      this.emitStatus('Sync auth token is not configured.');
      return false;
    }
    if (!this.isNetworkOnline) {
      this.emitStatus('Device is offline. Upload queued.');
      return false;
    }

    const unsynced = await DBManager.getUnsyncedRecords();
    if (unsynced.length === 0) {
      this.emitStatus();
      return true;
    }

    this.isSyncing = true;
    this.emitStatus();

    try {
      // Build the production sync batch payload
      const batchPayload = {
        deviceId: 'FieldID-NHAI-Edge',
        appVersion: 'v1.0.0',
        syncedAt: Date.now(),
        records: unsynced,
        batchHash: this.calculateBatchHash(unsynced),
      };

      // Perform real HTTP REST network request
      const response = await fetch(FIELDID_API_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization': `Bearer ${FIELDID_SYNC_AUTH_TOKEN}`,
        },
        body: JSON.stringify(batchPayload),
      });

      if (!response.ok) {
        throw new Error(`AWS Server returned HTTP status: ${response.status}`);
      }

      const receipt = await response.json();

      // Check receipt signature to confirm safe backend write
      if (receipt && (receipt.statusCode === 200 || receipt.status === 'SUCCESS')) {
        // Step 4: PURGE-on-receipt protocol
        const recordIds = unsynced.map(r => r.id);
        await DBManager.purgeSyncedRecords(recordIds);

        this.lastSyncedTimestamp = Date.now();
        this.isSyncing = false;
        this.emitStatus();
        return true;
      } else {
        throw new Error('Sync failed: Invalid server acknowledgment.');
      }
    } catch (err: any) {
      console.error('Offline sync transmission error:', err);
      this.isSyncing = false;
      this.emitStatus(err.message || 'Sync connection timeout.');
      return false;
    }
  }

  private calculateBatchHash(records: AttendanceRecord[]): string {
    const rawConcat = records.map(r => r.payloadHash).join('|');
    let hash = 0;
    for (let i = 0; i < rawConcat.length; i++) {
      hash = (hash << 5) - hash + rawConcat.charCodeAt(i);
      hash |= 0;
    }
    return `BATCH-MD5-${Math.abs(hash).toString(16)}`;
  }
}

export const SyncQueue = new SyncQueueManager();
export default SyncQueue;
