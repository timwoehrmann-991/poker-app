import { HandRecord } from '../engine/types';

/**
 * IndexedDB-Persistenz für Hand-Historie — überlebt Reloads und Sessions.
 * Schema-Version im Record, damit spätere Felder migrierbar bleiben.
 */

const DB_NAME = 'poker-simulator';
const DB_VERSION = 1;
const STORE_NAME = 'hands';

/** Version des HandRecord-Schemas (street in actions, heroEquityByStreet) */
export const RECORD_SCHEMA_VERSION = 2;

interface StoredHand {
  id?: number;
  schemaVersion: number;
  savedAt: number;
  record: HandRecord;
}

function openDb(): Promise<IDBDatabase | null> {
  return new Promise(resolve => {
    if (typeof indexedDB === 'undefined') {
      resolve(null);
      return;
    }
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => resolve(null);
  });
}

export async function saveHandRecord(record: HandRecord): Promise<void> {
  const db = await openDb();
  if (!db) return;
  try {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const stored: StoredHand = {
      schemaVersion: RECORD_SCHEMA_VERSION,
      savedAt: Date.now(),
      record,
    };
    tx.objectStore(STORE_NAME).add(stored);
  } catch {
    // Persistenz ist Komfort, kein Muss — Spiel läuft ohne weiter
  } finally {
    db.close();
  }
}

/** Lädt die letzten `limit` Hände (nur aktuelles Schema — alte werden ignoriert) */
export async function loadHandRecords(limit = 500): Promise<HandRecord[]> {
  const db = await openDb();
  if (!db) return [];
  return new Promise(resolve => {
    try {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const req = tx.objectStore(STORE_NAME).getAll();
      req.onsuccess = () => {
        const all = (req.result as StoredHand[])
          .filter(s => s.schemaVersion === RECORD_SCHEMA_VERSION)
          .sort((a, b) => a.savedAt - b.savedAt)
          .slice(-limit)
          .map(s => s.record);
        db.close();
        resolve(all);
      };
      req.onerror = () => { db.close(); resolve([]); };
    } catch {
      db.close();
      resolve([]);
    }
  });
}

export async function clearHandRecords(): Promise<void> {
  const db = await openDb();
  if (!db) return;
  try {
    db.transaction(STORE_NAME, 'readwrite').objectStore(STORE_NAME).clear();
  } finally {
    db.close();
  }
}
