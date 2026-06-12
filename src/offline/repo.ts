// Offline-first repository. All reads come from IndexedDB.
// All writes update IndexedDB immediately and queue a push to Supabase.

import { db, type SyncedTable, type SyncOp } from "./db";
import { newUuid, genCodigoAcceso, genCodigoAnonimo, calcImc, calcBiacromial15, calcIndiceElastico, calcRockportVo2 } from "./codes";
import { notifyLocalMutation } from "./sync";

function nowIso(): string {
  return new Date().toISOString();
}

async function enqueue(item: {
  table: SyncedTable;
  op: SyncOp;
  rowId: string;
  payload: Record<string, unknown> | null;
  onConflict?: string;
}) {
  await db.sync_queue.add({
    ...item,
    createdAt: Date.now(),
    attempts: 0,
  });
  void notifyLocalMutation();
}

// ---------- Centros ----------

export interface CentroInput {
  nombre: string;
  direccion?: string | null;
  codigo_postal?: string | null;
  ciudad?: string | null;
  provincia: string;
  email?: string | null;
  telefono?: string | null;
  anonimo?: boolean;
  mostrar_publico?: boolean;
  created_by: string;
}

export async function createCentro(input: CentroInput): Promise<string> {
  const id = newUuid();
  const ts = nowIso();
  const row = {
    id,
    ...input,
    anonimo: input.anonimo ?? false,
    mostrar_publico: input.mostrar_publico ?? true,
    codigo_anonimo: input.anonimo ? genCodigoAnonimo() : null,
    created_at: ts,
    updated_at: ts,
    _dirty: 1 as const,
  };
  await db.centros.put(row);
  await enqueue({ table: "centros", op: "insert", rowId: id, payload: stripLocal(row) });
  return id;
}

// ---------- Grupos ----------

export interface GrupoInput {
  centro_id: string;
  curso: string;
  letra: string;
  anio_escolar: string;
  profesor_id: string;
}

export async function createGrupo(input: GrupoInput): Promise<string> {
  const id = newUuid();
  const ts = nowIso();
  const row = { id, ...input, created_at: ts, updated_at: ts, _dirty: 1 as const };
  await db.grupos.put(row);
  await enqueue({ table: "grupos", op: "insert", rowId: id, payload: stripLocal(row) });
  return id;
}

export async function updateGrupoBateria(grupoId: string, bateria: unknown): Promise<void> {
  const ts = nowIso();
  await db.grupos.update(grupoId, { bateria_personalizada: bateria, updated_at: ts, _dirty: 1 } as never);
  const row = await db.grupos.get(grupoId);
  if (!row) return;
  await enqueue({ table: "grupos", op: "update", rowId: grupoId, payload: stripLocal(row) });
}

// ---------- Alumnos ----------

export interface AlumnoInput {
  grupo_id: string;
  id_aula: number;
  nombre: string;
  apellidos: string;
  sexo: "M" | "F";
  fecha_nacimiento: string;
  peso_kg?: number | null;
  talla_m?: number | null;
  envergadura_cm?: number | null;
  biacromial_cm?: number | null;
  longitud_pierna_cm?: number | null;
  extraescolar?: boolean;
  horas_extraescolar?: number | null;
}

function withDerivedAlumno<T extends Partial<AlumnoInput>>(input: T) {
  const imc = calcImc(input.peso_kg ?? null, input.talla_m ?? null);
  const biacromial_15_cm = calcBiacromial15(input.biacromial_cm ?? null);
  return { ...input, ...(imc != null ? { imc } : {}), ...(biacromial_15_cm != null ? { biacromial_15_cm } : {}) };
}

export async function createAlumno(input: AlumnoInput): Promise<string> {
  const id = newUuid();
  const ts = nowIso();
  const row = {
    id,
    ...withDerivedAlumno(input),
    codigo_acceso: genCodigoAcceso(),
    created_at: ts,
    updated_at: ts,
    _dirty: 1 as const,
  };
  await db.alumnos.put(row as never);
  await enqueue({ table: "alumnos", op: "insert", rowId: id, payload: stripLocal(row) });
  return id;
}

export async function updateAlumno(id: string, patch: Partial<AlumnoInput>): Promise<void> {
  const ts = nowIso();
  const existing = await db.alumnos.get(id);
  if (!existing) return;
  const merged = withDerivedAlumno({ ...(existing as never), ...patch });
  const updated = { ...merged, id, updated_at: ts, _dirty: 1 as const };
  await db.alumnos.put(updated as never);
  await enqueue({ table: "alumnos", op: "update", rowId: id, payload: stripLocal(updated) });
}

export async function deleteAlumno(id: string): Promise<void> {
  await db.alumnos.delete(id);
  // Also remove their cached pruebas locally
  const e = await db.pruebas_eurofit.where("alumno_id").equals(id).primaryKeys();
  const c = await db.pruebas_cfs.where("alumno_id").equals(id).primaryKeys();
  await db.pruebas_eurofit.bulkDelete(e);
  await db.pruebas_cfs.bulkDelete(c);
  await enqueue({ table: "alumnos", op: "delete", rowId: id, payload: null });
}

// ---------- Evaluaciones ----------

export async function createEvaluacion(input: { grupo_id: string; nombre: string; fecha: string; anio_escolar: string }): Promise<string> {
  const id = newUuid();
  const ts = nowIso();
  const row = { id, ...input, created_at: ts, updated_at: ts, _dirty: 1 as const };
  await db.evaluaciones.put(row);
  await enqueue({ table: "evaluaciones", op: "insert", rowId: id, payload: stripLocal(row) });
  return id;
}

// ---------- Pruebas (Eurofit / CFS) ----------

export type PruebaTabla = "pruebas_eurofit" | "pruebas_cfs";

export async function savePrueba(tabla: PruebaTabla, payload: Record<string, unknown>): Promise<void> {
  const alumnoId = payload.alumno_id as string;
  const evaluacionId = payload.evaluacion_id as string;
  if (!alumnoId || !evaluacionId) throw new Error("alumno_id y evaluacion_id requeridos");

  // Look up existing local row by (alumno, evaluacion)
  const table = tabla === "pruebas_eurofit" ? db.pruebas_eurofit : db.pruebas_cfs;
  const existing = await table.where("[alumno_id+evaluacion_id]").equals([alumnoId, evaluacionId]).first();

  const id = existing?.id ?? newUuid();
  const ts = nowIso();

  // Derived fields for pruebas_cfs
  let derived: Record<string, unknown> = {};
  if (tabla === "pruebas_cfs") {
    const sj = (payload.sj_cm as number | null | undefined) ?? (existing as never)?.["sj_cm"];
    const cmj = (payload.cmj_cm as number | null | undefined) ?? (existing as never)?.["cmj_cm"];
    derived.indice_elastico = calcIndiceElastico(sj as number | null, cmj as number | null);

    const alumno = await db.alumnos.get(alumnoId);
    if (alumno) {
      const edad = ageYears((alumno as never)?.["fecha_nacimiento"]);
      derived.rockport_vo2 = calcRockportVo2({
        peso_kg: (alumno as never)?.["peso_kg"] ?? null,
        sexo: (alumno as never)?.["sexo"] ?? null,
        edad,
        rockport_min: (payload.rockport_min as number | null | undefined) ?? null,
        rockport_seg: (payload.rockport_seg as number | null | undefined) ?? null,
        rockport_fc: (payload.rockport_fc as number | null | undefined) ?? null,
      });
    }
  }

  const merged: Record<string, unknown> = {
    ...(existing ?? {}),
    ...payload,
    ...derived,
    id,
    alumno_id: alumnoId,
    evaluacion_id: evaluacionId,
    updated_at: ts,
    created_at: existing?.created_at ?? ts,
    _dirty: 1,
  };
  // strip control fields the server doesn't accept
  delete (merged as Record<string, unknown>)._dirty;
  const stored = { ...merged, _dirty: 1 as const };
  await table.put(stored as never);

  // Push using upsert on (alumno_id, evaluacion_id) so two devices can't create duplicates
  await enqueue({
    table: tabla,
    op: "upsert",
    rowId: id,
    payload: stripLocal(stored),
    onConflict: "alumno_id,evaluacion_id",
  });
}

// ---------- Helpers ----------

function ageYears(birthIso: string | null | undefined): number | null {
  if (!birthIso) return null;
  const b = new Date(birthIso);
  if (Number.isNaN(b.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - b.getFullYear();
  const m = now.getMonth() - b.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < b.getDate())) age--;
  return age;
}

function stripLocal<T extends Record<string, unknown>>(row: T): Record<string, unknown> {
  const copy: Record<string, unknown> = { ...row };
  delete copy._dirty;
  return copy;
}
