// Mirror of server-side triggers / defaults, so offline rows look complete.

export function newUuid(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  // RFC4122 v4 fallback
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/** Server stores codigo_acceso as upper(substring(uuid,1,9)) by default. */
export function genCodigoAcceso(): string {
  return newUuid().replace(/-/g, "").slice(0, 9).toUpperCase();
}

/** Server trigger gen_codigo_anonimo prefixes with CFA- + 5 chars. */
export function genCodigoAnonimo(): string {
  return `CFA-${newUuid().replace(/-/g, "").slice(0, 5).toUpperCase()}`;
}

export function calcImc(peso: number | null | undefined, talla: number | null | undefined): number | null {
  if (!peso || !talla || talla <= 0) return null;
  return Number((peso / (talla * talla)).toFixed(2));
}

export function calcBiacromial15(biacromial: number | null | undefined): number | null {
  if (biacromial == null) return null;
  return Number((biacromial * 1.5).toFixed(1));
}

export function calcIndiceElastico(sj: number | null | undefined, cmj: number | null | undefined): number | null {
  if (sj == null || cmj == null || sj <= 0) return null;
  return Number((((cmj - sj) / sj) * 100).toFixed(2));
}

/** Kline equation — same as the server trg_calc_rockport_vo2 */
export function calcRockportVo2(args: {
  peso_kg: number | null | undefined;
  sexo: "M" | "F" | null | undefined;
  edad: number | null | undefined;
  rockport_min: number | null | undefined;
  rockport_seg?: number | null | undefined;
  rockport_fc: number | null | undefined;
}): number | null {
  const { peso_kg, sexo, edad, rockport_min, rockport_seg, rockport_fc } = args;
  if (peso_kg == null || edad == null || rockport_min == null || rockport_fc == null) return null;
  const tiempoMin = rockport_min + (rockport_seg ?? 0) / 60.0;
  const pesoLb = peso_kg * 2.20462;
  const v =
    132.853 -
    0.0769 * pesoLb -
    0.3877 * edad +
    6.315 * (sexo === "M" ? 1 : 0) -
    3.2649 * tiempoMin -
    0.1565 * rockport_fc;
  return Number(v.toFixed(2));
}
