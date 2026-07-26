import { normalizeAttemptEvent, unionAttemptEvents, type AttemptEvent } from "@notesense/shared";

const DATABASE_NAME = "notesense-evidence";
const DATABASE_VERSION = 1;
const EVENTS_STORE = "attemptEvents";

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (!globalThis.indexedDB) {
      reject(new Error("IndexedDB is unavailable"));
      return;
    }
    const request = globalThis.indexedDB.open(DATABASE_NAME, DATABASE_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(EVENTS_STORE)) db.createObjectStore(EVENTS_STORE, { keyPath: "eventId" });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("Could not open evidence storage"));
  });
}

async function withStore<T>(mode: IDBTransactionMode, action: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await openDatabase();
  try {
    return await new Promise<T>((resolve, reject) => {
      const transaction = db.transaction(EVENTS_STORE, mode);
      const request = action(transaction.objectStore(EVENTS_STORE));
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error ?? new Error("Evidence storage request failed"));
      transaction.onerror = () => reject(transaction.error ?? new Error("Evidence storage transaction failed"));
    });
  } finally {
    db.close();
  }
}

/** Append-only, idempotent persistence for immutable attempt evidence. */
export async function appendAttemptEvent(rawEvent: AttemptEvent): Promise<boolean> {
  const event = normalizeAttemptEvent(rawEvent);
  if (!event) return false;
  try {
    const existing = await withStore("readonly", (store) => store.get(event.eventId));
    if (existing) return true;
    await withStore("readwrite", (store) => store.add(event));
    return true;
  } catch {
    // A full/private/corrupt browser store must never break a learning attempt.
    return false;
  }
}

export async function loadAttemptEvents(): Promise<AttemptEvent[]> {
  try {
    const values = await withStore("readonly", (store) => store.getAll());
    const valid = (values as unknown[])
      .map(normalizeAttemptEvent)
      .filter((event): event is AttemptEvent => event !== null);
    return unionAttemptEvents(valid);
  } catch {
    return [];
  }
}

export async function replaceAttemptEvents(events: readonly AttemptEvent[]): Promise<boolean> {
  const normalized = unionAttemptEvents(
    events.map(normalizeAttemptEvent).filter((event): event is AttemptEvent => event !== null),
  );
  try {
    const db = await openDatabase();
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction(EVENTS_STORE, "readwrite");
      const store = transaction.objectStore(EVENTS_STORE);
      store.clear();
      normalized.forEach((event) => store.put(event));
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
    db.close();
    return true;
  } catch {
    return false;
  }
}
