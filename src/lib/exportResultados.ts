import * as XLSX from "xlsx";
import { supabase } from "@/integrations/supabase/client";
import { calcularEdad, PRUEBAS_EUROFIT, PRUEBAS_CFS, valorParaBaremo } from "@/lib/pruebas";

/**
 * Exporta a Excel los resultados completos de un grupo:
 *  - Hoja Alumnos: datos básicos + antropometría
 *  - Hoja Eurofit: valores brutos + nota por prueba + nota media
 *  - Hoja CFS: valores brutos + nota por prueba + nota media
 *  - Hoja Resumen: nota global Eurofit, CFS y media por alumno
 */
export async function exportarResultadosGrupo(grupoId: string, grupoLabel: string) {
  // 1. Alumnos del grupo + pruebas
  const { data: alumnos } = await supabase
    .from("alumnos")
    .select("*")
    .eq("grupo_id", grupoId)
    .order("id_aula");

  if (!alumnos || alumnos.length === 0) {
    throw new Error("Este grupo no tiene alumnos.");
  }

  const ids = alumnos.map((a) => a.id);
  const [{ data: euros }, { data: cfses }] = await Promise.all([
    supabase.from("pruebas_eurofit").select("*").in("alumno_id", ids),
    supabase.from("pruebas_cfs").select("*").in("alumno_id", ids),
  ]);

  const eurosByAlumno = new Map<string, any>();
  (euros ?? []).forEach((e) => eurosByAlumno.set(e.alumno_id, e));
  const cfsByAlumno = new Map<string, any>();
  (cfses ?? []).forEach((c) => cfsByAlumno.set(c.alumno_id, c));

  // 2. Calcular notas (RPC calcular_nota)
  async function notaDe(bateria: "eurofit" | "cfs", prueba: string, sexo: any, edad: number, valor: number | null) {
    if (valor == null) return null;
    const { data } = await supabase.rpc("calcular_nota", {
      _bateria: bateria, _prueba: prueba, _sexo: sexo, _edad: edad, _valor: valor,
    });
    return data as number | null;
  }

  const wb = XLSX.utils.book_new();

  // Hoja Alumnos
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
  const wsAl = XLSX.utils.json_to_sheet(alumnosRows);
  XLSX.utils.book_append_sheet(wb, wsAl, "Alumnos");

  // Hoja Eurofit
  const eurofitRows: any[] = [];
  for (const a of alumnos) {
    const e = eurosByAlumno.get(a.id) ?? {};
    const edad = calcularEdad(a.fecha_nacimiento);
    const row: any = {
      id_aula: a.id_aula,
      nombre: a.nombre,
      apellidos: a.apellidos,
      fecha: e.fecha ?? null,
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
  const wsEu = XLSX.utils.json_to_sheet(eurofitRows);
  XLSX.utils.book_append_sheet(wb, wsEu, "Eurofit");

  // Hoja CFS
  const cfsRows: any[] = [];
  for (const a of alumnos) {
    const c = cfsByAlumno.get(a.id) ?? {};
    const edad = calcularEdad(a.fecha_nacimiento);
    const row: any = {
      id_aula: a.id_aula,
      nombre: a.nombre,
      apellidos: a.apellidos,
      fecha: c.fecha ?? null,
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
  const wsCfs = XLSX.utils.json_to_sheet(cfsRows);
  XLSX.utils.book_append_sheet(wb, wsCfs, "CFS");

  // Hoja Resumen
  const resumen = alumnos.map((a) => {
    const eRow = eurofitRows.find((r) => r.id_aula === a.id_aula);
    const cRow = cfsRows.find((r) => r.id_aula === a.id_aula);
    const ne = eRow?.nota_media_eurofit ?? null;
    const nc = cRow?.nota_media_cfs ?? null;
    const global = ne != null && nc != null ? Number(((ne + nc) / 2).toFixed(2)) : (ne ?? nc ?? null);
    return {
      id_aula: a.id_aula,
      nombre: a.nombre,
      apellidos: a.apellidos,
      sexo: a.sexo,
      edad: calcularEdad(a.fecha_nacimiento),
      nota_eurofit: ne,
      nota_cfs: nc,
      nota_global: global,
    };
  });
  const wsRes = XLSX.utils.json_to_sheet(resumen);
  XLSX.utils.book_append_sheet(wb, wsRes, "Resumen");

  const filename = `resultados_${grupoLabel.replace(/[^a-z0-9]+/gi, "_")}_${new Date().toISOString().slice(0, 10)}.xlsx`;
  XLSX.writeFile(wb, filename);
}
