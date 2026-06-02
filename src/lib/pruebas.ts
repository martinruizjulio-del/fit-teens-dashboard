// Definición unificada de las 12 pruebas (6 Eurofit + 6 CFS, contando SJ/CMJ y Lanz Der/Izq como pares).
// La columna BD es la real de pruebas_eurofit / pruebas_cfs.

export type Bateria = "eurofit" | "cfs";

export interface PruebaDef {
  bateria: Bateria;
  prueba: string;          // clave de baremo (singular: 'lanz_med' para CFS, 'cmj' separado de 'sj')
  campo: string;           // columna numérica en la tabla (ej. 'wells_cm')
  omniCampo: string;       // columna de percepción (ej. 'omni_wells')
  unidad: string;          // 'cm', 's', 'm', 'reps', 'min:s', '°'
  step?: number;
  decimales?: number;
  composite?: "rockport"; // pruebas con varios subcampos
  subcampos?: { campo: string; label: string; step?: number; max?: number }[];
}

export const PRUEBAS_EUROFIT: PruebaDef[] = [
  { bateria: "eurofit", prueba: "wells",          campo: "wells_cm",          omniCampo: "omni_wells",        unidad: "cm",    step: 0.5, decimales: 1 },
  { bateria: "eurofit", prueba: "salto_vertical", campo: "salto_vertical_cm", omniCampo: "omni_salto",        unidad: "cm",    step: 0.5, decimales: 1 },
  { bateria: "eurofit", prueba: "abdominales_60", campo: "abdominales_60",    omniCampo: "omni_abdominales",  unidad: "reps",  step: 1,   decimales: 0 },
  { bateria: "eurofit", prueba: "lanz_hombros",   campo: "lanz_hombros_m",    omniCampo: "omni_lanz",         unidad: "m",     step: 0.05, decimales: 2 },
  { bateria: "eurofit", prueba: "sprint_50",      campo: "sprint_50_seg",     omniCampo: "omni_sprint",       unidad: "s",     step: 0.01, decimales: 2 },
  { bateria: "eurofit", prueba: "cooper",         campo: "cooper_m",          omniCampo: "omni_cooper",       unidad: "m",     step: 10,   decimales: 0 },
];

export const PRUEBAS_CFS: PruebaDef[] = [
  { bateria: "cfs", prueba: "thomas",           campo: "thomas",                omniCampo: "omni_thomas",   unidad: "°",  step: 1, decimales: 0 },
  { bateria: "cfs", prueba: "biering_sorensen", campo: "biering_sorensen_seg",  omniCampo: "omni_biering",  unidad: "s",  step: 1, decimales: 1 },
  { bateria: "cfs", prueba: "sj",               campo: "sj_cm",                 omniCampo: "omni_saltos",   unidad: "cm", step: 0.5, decimales: 1 },
  { bateria: "cfs", prueba: "cmj",              campo: "cmj_cm",                omniCampo: "omni_saltos",   unidad: "cm", step: 0.5, decimales: 1 },
  { bateria: "cfs", prueba: "lanz_med_der",     campo: "lanz_med_der_m",        omniCampo: "omni_lanz",     unidad: "m",  step: 0.05, decimales: 2 },
  { bateria: "cfs", prueba: "lanz_med_izq",     campo: "lanz_med_izq_m",        omniCampo: "omni_lanz",     unidad: "m",  step: 0.05, decimales: 2 },
  { bateria: "cfs", prueba: "sprint_30",        campo: "sprint_30_seg",         omniCampo: "omni_sprint",   unidad: "s",  step: 0.01, decimales: 2 },
  {
    bateria: "cfs", prueba: "rockport", campo: "rockport_min", omniCampo: "omni_rockport", unidad: "min:s",
    composite: "rockport",
    subcampos: [
      { campo: "rockport_min", label: "Minutos", step: 1, max: 30 },
      { campo: "rockport_seg", label: "Segundos", step: 1, max: 59 },
      { campo: "rockport_fc",  label: "FC final (lpm)", step: 1, max: 250 },
    ],
  },
];

export function calcularEdad(fechaNacimiento: string): number {
  const fn = new Date(fechaNacimiento);
  const hoy = new Date();
  let edad = hoy.getFullYear() - fn.getFullYear();
  const m = hoy.getMonth() - fn.getMonth();
  if (m < 0 || (m === 0 && hoy.getDate() < fn.getDate())) edad--;
  return edad;
}

// Para Rockport el "valor" para baremos es el VO2 estimado (calculado por trigger en BD)
export function valorParaBaremo(prueba: PruebaDef, registro: any): number | null {
  if (prueba.composite === "rockport") {
    const vo2 = registro.rockport_vo2;
    return vo2 == null ? null : Number(vo2);
  }
  const v = registro[prueba.campo];
  return v == null ? null : Number(v);
}

export function formateaValor(prueba: PruebaDef, registro: any): string {
  if (prueba.composite === "rockport") {
    if (registro.rockport_min == null) return "—";
    return `${registro.rockport_min}:${String(registro.rockport_seg ?? 0).padStart(2, "0")}` +
      (registro.rockport_fc ? ` (FC ${registro.rockport_fc})` : "");
  }
  const v = registro[prueba.campo];
  if (v == null) return "—";
  return `${Number(v).toFixed(prueba.decimales ?? 1)} ${prueba.unidad}`;
}

export const NOMBRE_PRUEBA: Record<string, string> = {
  wells: "Wells (sit-and-reach)",
  salto_vertical: "Salto vertical",
  abdominales_60: "Abdominales 60 s",
  lanz_hombros: "Lanz. balón sobre hombros",
  sprint_50: "Sprint 50 m",
  cooper: "Cooper (12 min)",
  thomas: "Thomas modificado",
  biering_sorensen: "Biering-Sörensen",
  sj: "Squat Jump",
  cmj: "Counter Movement Jump",
  lanz_med_der: "Lanz. medicinal (derecha)",
  lanz_med_izq: "Lanz. medicinal (izquierda)",
  sprint_30: "Sprint 30 m",
  rockport: "Rockport (1 milla)",
};
