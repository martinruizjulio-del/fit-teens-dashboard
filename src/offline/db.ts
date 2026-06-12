// Local offline-first database (IndexedDB via Dexie).
// Mirrors the Supabase tables we want available offline + a sync queue.

import Dexie, { type Table } from "dexie";

export type SyncOp = "insert" | "update" | "upsert" | "delete";

export interface SyncQueueItem {
  id?: number;
  table: SyncedTable;
  op: SyncOp;
  rowId: string;
  payload: Record<string, unknown> | null;
  onConflict?: string;
  createdAt: number;
  attempts: number;
  lastError?: string;
}

export interface SyncMeta {
  key: string;
  value: string;
}

/** Base interface for any cached row */
interface BaseRow {
  id: string;
  updated_at?: string | null;
  created_at?: string | null;
  /** Local marker: row created or modified locally and not yet pushed */
  _dirty?: 0 | 1;
}

export type CentroRow = BaseRow & Record<string, unknown>;
export type GrupoRow = BaseRow & Record<string, unknown>;
export type AlumnoRow = BaseRow & { grupo_id?: string } & Record<string, unknown>;
export type EvaluacionRow = BaseRow & { grupo_id?: string } & Record<string, unknown>;
export type PruebaRow = BaseRow & {
  alumno_id?: string;
  evaluacion_id?: string;
} & Record<string, unknown>;
export type ProcedimientoRow = BaseRow & { bateria: string; prueba: string } & Record<string, unknown>;

export type SyncedTable =
  | "centros"
  | "grupos"
  | "alumnos"
  | "evaluaciones"
  | "pruebas_eurofit"
  | "pruebas_cfs";

export const SYNCED_TABLES: SyncedTable[] = [
  "centros",
  "grupos",
  "alumnos",
  "evaluaciones",
  "pruebas_eurofit",
  "pruebas_cfs",
];

class OfflineDB extends Dexie {
  centros!: Table<CentroRow, string>;
  grupos!: Table<GrupoRow, string>;
  alumnos!: Table<AlumnoRow, string>;
  evaluaciones!: Table<EvaluacionRow, string>;
  pruebas_eurofit!: Table<PruebaRow, string>;
  pruebas_cfs!: Table<PruebaRow, string>;
  procedimientos!: Table<ProcedimientoRow, string>;
  sync_queue!: Table<SyncQueueItem, number>;
  sync_meta!: Table<SyncMeta, string>;

  constructor() {
    super("cfs-offline-v1");
    this.version(1).stores({
      centros: "id, created_by, updated_at, _dirty",
      grupos: "id, centro_id, profesor_id, updated_at, _dirty",
      alumnos: "id, grupo_id, codigo_acceso, updated_at, _dirty",
      evaluaciones: "id, grupo_id, updated_at, _dirty",
      pruebas_eurofit: "id, alumno_id, evaluacion_id, [alumno_id+evaluacion_id], updated_at, _dirty",
      pruebas_cfs: "id, alumno_id, evaluacion_id, [alumno_id+evaluacion_id], updated_at, _dirty",
      procedimientos: "id, bateria, prueba",
      sync_queue: "++id, table, createdAt",
      sync_meta: "key",
    });
  }
}

export const db = new OfflineDB();

export async function getMeta(key: string): Promise<string | null> {
  const r = await db.sync_meta.get(key);
  return r?.value ?? null;
}

export async function setMeta(key: string, value: string): Promise<void> {
  await db.sync_meta.put({ key, value });
}

export async function clearAllLocalData(): Promise<void> {
  await Promise.all([
    db.centros.clear(),
    db.grupos.clear(),
    db.alumnos.clear(),
    db.evaluaciones.clear(),
    db.pruebas_eurofit.clear(),
    db.pruebas_cfs.clear(),
    db.procedimientos.clear(),
    db.sync_queue.clear(),
    db.sync_meta.clear(),
  ]);
}
