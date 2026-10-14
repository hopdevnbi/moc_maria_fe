export function vipLevel(value: unknown): number {
  return typeof value === "number" && Number.isInteger(value) && value >= 1 && value <= 99
    ? value
    : 1;
}
export function vipLabel(level?: number | null): string {
  return `VIP ${vipLevel(level)}`;
}
