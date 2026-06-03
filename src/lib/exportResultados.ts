import * as XLSX from "xlsx";
import { supabase } from "@/integrations/supabase/client";
import { calcularEdad, PRUEBAS_EUROFIT, PRUEBAS_CFS, valorParaBaremo } from "@/lib/pruebas";

/**
 * Exporta a Excel los resultados de un grupo. Cada alumno tiene una fila
 * por evaluación realizada (Eurofit y CFS están desglosadas por evaluación).
 */
export async function exportarResultadosGrupo(grupoId: string, grupoLabel: string) {
  const [{ data: alumnos }, { data: evaluaciones }] = await Promise.all([
    supabase.from("alumnos").select("*").eq("grupo_id", grupoId).order("id_aula"),
    supabase.from("evaluaciones").select("*").eq("grupo_id", grupoId).order("fecha"),
  ]);

  if (!alumnos || alumnos.length === 0) throw new Error("Este grupo no tiene alumnos.");

  const evals = (evaluaciones ?? []) as Array<{ id: string; nombre: string; fecha: string }>;
  const evalById = new Map(evals.map((e) => [e.id, e]));
  const ids = alumnos.map((a) => a.id);

  const [{ data: euros }, { data: cfses }] = await Promise.all([
    supabase.from("pruebas_eurofit").select("*").in("alumno_id", ids),
    supabase.from("pruebas_cfs").select("*").in("alumno_id", ids),
  ]);

  // Indexar por (alumno_id, evaluacion_id)
  const key = (a: string, e: string) => `${a}::${e}`;
  const eurosIdx = new Map<string, any>();
  (euros ?? []).forEach((e) => eurosIdx.set(key(e.alumno_id, e.evaluacion_id), e));
  const cfsIdx = new Map<string, any>();
  (cfses ?? []).forEach((c) => cfsIdx.set(key(c.alumno_id, c.evaluacion_id), c));

  async function notaDe(bateria: "eurofit" | "cfs", prueba: string, sexo: any, edad: number, valor: number | null) {
    if (valor == null) return null;
    const { data } = await supabase.rpc("calcular_nota", {
      _bateria: bateria, _prueba: prueba, _sexo: sexo, _edad: edad, _valor: valor,
    });
    return data as number | null;
  }

  const wb = XLSX.utils.book_new();

  // Hoja Alumnos (datos estables, no por evaluación)
  const alumnosRows = alumnos.map((a) => ({
    id_aula: a.id_aula,
    nombre: a.nombre,
    apellidos: a.apellidos,
    sexo: a.sexo,
    fecha_nacimiento: a.fecha_nacimiento,
    edad: calcularEdad(a.fecha_nacimiento),
    codigo_acceso: a.codigo_acceso,
    peso_kg: a.peso_kg,
    talla_m: a.talla_m,
    imc: a.imc,
    envergadura_cm: a.envergadura_cm,
    biacromial_cm: a.biacromial_cm,
    longitud_pierna_cm: a.longitud_pierna_cm,
    extraescolar: a.extraescolar ? "sí" : "no",
    horas_extraescolar: a.horas_extraescolar,
  }));
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(alumnosRows), "Alumnos");

  // Hoja Evaluaciones
  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.json_to_sheet(evals.map((e) => ({ evaluacion: e.nombre, fecha: e.fecha }))),
    "Evaluaciones",
  );

  // Hoja Eurofit (una fila por alumno × evaluación con datos)
  const eurofitRows: any[] = [];
  for (const a of alumnos) {
    const edad = calcularEdad(a.fecha_nacimiento);
    for (const ev of evals) {
      const e = eurosIdx.get(key(a.id, ev.id));
      if (!e) continue;
      const row: any = {
        id_aula: a.id_aula,
        nombre: a.nombre,
        apellidos: a.apellidos,
        evaluacion: ev.nombre,
        fecha_evaluacion: ev.fecha,
        fecha_prueba: e.fecha ?? null,
      };
      const notas: number[] = [];
      for (const p of PRUEBAS_EUROFIT) {
        const valor = valorParaBaremo(p, e);
        const nota = await notaDe("eurofit", p.prueba, a.sexo, edad, valor);
        row[p.campo ?? p.prueba] = valor;
        row[`nota_${p.prueba}`] = nota;
        if (nota != null) notas.push(nota);
        row[p.omniCampo] = e[p.omniCampo] ?? null;
      }
      row["nota_media_eurofit"] = notas.length ? Number((notas.reduce((s, n) => s + n, 0) / notas.length).toFixed(2)) : null;
      eurofitRows.push(row);
    }
  }
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(eurofitRows), "Eurofit");

  // Hoja CFS
  const cfsRows: any[] = [];
  for (const a of alumnos) {
    const edad = calcularEdad(a.fecha_nacimiento);
    for (const ev of evals) {
      const c = cfsIdx.get(key(a.id, ev.id));
      if (!c) continue;
      const row: any = {
        id_aula: a.id_aula,
        nombre: a.nombre,
        apellidos: a.apellidos,
        evaluacion: ev.nombre,
        fecha_evaluacion: ev.fecha,
        fecha_prueba: c.fecha ?? null,
      };
      const notas: number[] = [];
      for (const p of PRUEBAS_CFS) {
        const valor = valorParaBaremo(p, c);
        const nota = await notaDe("cfs", p.prueba, a.sexo, edad, valor);
        row[p.campo ?? p.prueba] = valor;
        row[`nota_${p.prueba}`] = nota;
        if (nota != null) notas.push(nota);
        row[p.omniCampo] = c[p.omniCampo] ?? null;
      }
      row["indice_elastico"] = c.indice_elastico ?? null;
      row["rockport_vo2"] = c.rockport_vo2 ?? null;
      row["nota_media_cfs"] = notas.length ? Number((notas.reduce((s, n) => s + n, 0) / notas.length).toFixed(2)) : null;
      cfsRows.push(row);
    }
  }
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(cfsRows), "CFS");

  // Hoja Resumen: nota media por alumno × evaluación
  const resumen: any[] = [];
  for (const a of alumnos) {
    for (const ev of evals) {
      const eRow = eurofitRows.find((r) => r.id_aula === a.id_aula && r.evaluacion === ev.nombre);
      const cRow = cfsRows.find((r) => r.id_aula === a.id_aula && r.evaluacion === ev.nombre);
      if (!eRow && !cRow) continue;
      const ne = eRow?.nota_media_eurofit ?? null;
      const nc = cRow?.nota_media_cfs ?? null;
      const global = ne != null && nc != null ? Number(((ne + nc) / 2).toFixed(2)) : (ne ?? nc ?? null);
      resumen.push({
        id_aula: a.id_aula,
        nombre: a.nombre,
        apellidos: a.apellidos,
        sexo: a.sexo,
        edad: calcularEdad(a.fecha_nacimiento),
        evaluacion: ev.nombre,
        fecha_evaluacion: ev.fecha,
        nota_eurofit: ne,
        nota_cfs: nc,
        nota_global: global,
      });
    }
  }
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(resumen), "Resumen");

  const filename = `resultados_${grupoLabel.replace(/[^a-z0-9]+/gi, "_")}_${new Date().toISOString().slice(0, 10)}.xlsx`;
  XLSX.writeFile(wb, filename);
}
