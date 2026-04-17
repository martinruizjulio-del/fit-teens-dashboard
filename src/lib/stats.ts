export function media(arr: number[]): number {
  if (!arr.length) return 0;
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

export function desvTipica(arr: number[]): number {
  if (arr.length < 2) return 0;
  const m = media(arr);
  const v = arr.reduce((acc, x) => acc + (x - m) ** 2, 0) / (arr.length - 1);
  return Math.sqrt(v);
}

export function fmt(n: number, dec = 2): string {
  if (Number.isNaN(n) || !Number.isFinite(n)) return "—";
  return n.toFixed(dec);
}

export function mediaDT(arr: number[], dec = 2): string {
  const valid = arr.filter((x) => x != null && !Number.isNaN(x));
  if (!valid.length) return "—";
  return `${fmt(media(valid), dec)} ± ${fmt(desvTipica(valid), dec)}`;
}
