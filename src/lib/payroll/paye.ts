// PAYE (Pay As You Earn) — Uganda's progressive monthly income tax for
// resident individuals.
//
// ⚠️ VERIFY BEFORE RELYING ON THIS FOR REAL PAYROLL. These are the
// commonly-published monthly bands, but tax law changes over time and this
// has not been checked against a current Uganda Revenue Authority (URA)
// publication. Confirm current thresholds/rates with Finance/URA — this
// exists as a correct *mechanism* with easily-editable numbers, not a
// guarantee that the numbers below are still accurate.
//
// Bands are marginal: income within each band is taxed only at that
// band's rate, not the whole income at the top band's rate that applies.
const PAYE_BANDS: { upTo: number; rate: number }[] = [
  { upTo: 235_000, rate: 0 },
  { upTo: 335_000, rate: 0.1 },
  { upTo: 410_000, rate: 0.2 },
  { upTo: Infinity, rate: 0.3 },
];

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

// `chargeableIncome` should already have pre-tax deductions (e.g. the
// employee's NSSF contribution) subtracted out — see calculate.ts.
export function calculatePaye(chargeableIncome: number): number {
  let tax = 0;
  let lowerBound = 0;
  for (const band of PAYE_BANDS) {
    if (chargeableIncome <= lowerBound) break;
    const taxableInBand = Math.min(chargeableIncome, band.upTo) - lowerBound;
    tax += taxableInBand * band.rate;
    lowerBound = band.upTo;
  }
  return round2(tax);
}
