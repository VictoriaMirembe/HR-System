// Money display across the app used raw toFixed(2) (e.g. "1500000.00"),
// which is hard to scan for shilling amounts that don't use cents in
// practice. This renders whole-number amounts with thousands separators
// instead (e.g. "1,500,000"). Accepts Prisma's Decimal type (salary,
// payroll fields) via its toString(), not just plain number/string.
export function formatMoney(value: number | string | { toString(): string }): string {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(
    Number(value.toString())
  );
}
