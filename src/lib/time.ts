export function toMillis(v: any): number {
  return v && typeof v.toMillis === "function" ? v.toMillis() : 0;
}
