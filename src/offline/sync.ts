// Sync engine: pulls from Supabase and pushes the local queue.
// Conflict policy: last-write-wins by updated_at.

import { supabase } from "@/integrations/supabase/client";
import {
  db,
  SYNCED_TABLES,
  type SyncedTable,
  type SyncQueueItem,
  getMeta,
  setMeta,
} from "./db";

type Listener = (s: SyncStatus) => void;

export interface SyncStatus {
  online: boolean;
  syncing: boolean;
  pending: number;
  lastSyncAt: number | null;
  lastError: string | null;
}

let _status: SyncStatus = {
  online: typeof navigator !== "undefined" ? navigator.onLine : true,
  syncing: false,
  pending: 0,
  lastSyncAt: null,
  lastError: null,
};
const _listeners = new Set<Listener>();

export function getSyncStatus(): SyncStatus {
  return _status;
}

export function subscribeSync(fn: Listener): () => void {
  _listeners.add(fn);
  fn(_status);
  return () => _listeners.delete(fn);
}

function emit() {
  for (const l of _listeners) l(_status);
}

async function refreshPending() {
  _status = { ..._status, pending: await db.sync_queue.count() };
  emit();
}

const META_LAST_PULL = (t: SyncedTable) => `lastPull:${t}`;

/** Pull rows updated since lastPull per table. LWW: only overwrite if remote.updated_at >= local. */
async function pullTable(table: SyncedTable): Promise<number> {
  const since = (await getMeta(META_LAST_PULL(table))) ?? "1970-01-01T00:00:00Z";
  let query = supabase.from(table).select("*").gt("updated_at", since).order("updated_at", { ascending: true }).limit(1000);
  const { data, error } = await query;
  if (error) throw error;
  const rows = (data ?? []) as Array<{ id: string; updated_at?: string | null }>;
  if (rows.length === 0) return 0;

  await db.transaction("rw", db[table], async () => {
    for (const remote of rows) {
      const local = await db[table].get(remote.id);
      if (local?._dirty === 1) {
        // Local change pending push — keep local.
        continue;
      }
      const localUpdated = local?.updated_at ?? null;
      const remoteUpdated = remote.updated_at ?? null;
      if (!local || !localUpdated || (remoteUpdated && remoteUpdated >= localUpdated)) {
        await db[table].put({ ...remote, _dirty: 0 });
      }
    }
  });

  const newest = rows[rows.length - 1].updated_at;
  if (newest) await setMeta(META_LAST_PULL(table), newest);
  return rows.length;
}

/** Cache read-only procedimientos table on first sync. */
async function pullProcedimientosOnce(): Promise<void> {
  const count = await db.procedimientos.count();
  if (count > 0) return;
  const { data } = await supabase.from("procedimientos").select("*");
  if (data && data.length) {
    await db.procedimientos.bulkPut(data as never);
  }
}

async function pushOne(item: SyncQueueItem): Promise<void> {
  const { table, op, rowId, payload, onConflict } = item;
  if (op === "delete") {
    const { error } = await supabase.from(table).delete().eq("id", rowId);
    if (error) throw error;
    return;
  }
  if (op === "upsert" && onConflict) {
    const { error } = await supabase.from(table).upsert(payload as never, { onConflict });
    if (error) throw error;
    return;
  }
  // For insert and update we send an upsert on id so retries are idempotent.
  if (!payload) throw new Error("Empty payload");
  const { error } = await supabase.from(table).upsert(payload as never, { onConflict: "id" });
  if (error) throw error;
}

async function pushQueue(): Promise<void> {
  const items = await db.sync_queue.orderBy("createdAt").toArray();
  for (const item of items) {
    try {
      await pushOne(item);
      // Clear local _dirty marker if the row is still present
      const t = db[item.table];
      const row = await t.get(item.rowId);
      if (row && row._dirty === 1) await t.update(item.rowId, { _dirty: 0 } as never);
      await db.sync_queue.delete(item.id!);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      await db.sync_queue.update(item.id!, {
        attempts: (item.attempts ?? 0) + 1,
        lastError: msg,
      });
      // Stop on first error so order is preserved.
      throw e;
    }
  }
}

let _syncInFlight: Promise<void> | null = null;

export function syncNow(): Promise<void> {
  if (_syncInFlight) return _syncInFlight;
  _syncInFlight = (async () => {
    if (!_status.online) return;
    _status = { ..._status, syncing: true, lastError: null };
    emit();
    try {
      await pushQueue();
      for (const t of SYNCED_TABLES) await pullTable(t);
      await pullProcedimientosOnce();
      _status = { ..._status, lastSyncAt: Date.now() };
    } catch (e) {
      _status = { ..._status, lastError: e instanceof Error ? e.message : String(e) };
    } finally {
      _status = { ..._status, syncing: false };
      await refreshPending();
    }
  })().finally(() => {
    _syncInFlight = null;
  });
  return _syncInFlight;
}

let _autoSyncTimer: ReturnType<typeof setInterval> | null = null;
let _started = false;

/** Call once after sign-in. */
export function startSync(): void {
  if (_started) return;
  _started = true;

  const setOnline = (online: boolean) => {
    _status = { ..._status, online };
    emit();
    if (online) void syncNow();
  };

  window.addEventListener("online", () => setOnline(true));
  window.addEventListener("offline", () => setOnline(false));

  // First sync + 30s polling while the tab is open
  void syncNow();
  _autoSyncTimer = setInterval(() => {
    if (_status.online && !_status.syncing) void syncNow();
  }, 30_000);

  void refreshPending();
}

export async function stopAndReset(): Promise<void> {
  _started = false;
  if (_autoSyncTimer) clearInterval(_autoSyncTimer);
  _autoSyncTimer = null;
  const { clearAllLocalData } = await import("./db");
  await clearAllLocalData();
  _status = { ..._status, syncing: false, pending: 0, lastSyncAt: null, lastError: null };
  emit();
}

/** Called by repo after every local mutation so the indicator updates immediately. */
export async function notifyLocalMutation(): Promise<void> {
  await refreshPending();
  if (_status.online && !_status.syncing) void syncNow();
}
