/**
 * Money + number formatting helpers for the DECOLSA design system.
 * Ported from the design handoff (`components.jsx`) into a real module.
 */

export function fmt(n) {
  return Math.round(Number(n) || 0).toLocaleString('en-US')
}

export function money(n) {
  return '$' + fmt(n)
}

export function compactMoney(n) {
  const v = Number(n) || 0
  if (Math.abs(v) >= 1e6) return '$' + (v / 1e6).toFixed(2) + 'M'
  if (Math.abs(v) >= 1e3) return '$' + (v / 1e3).toFixed(1) + 'K'
  return '$' + fmt(v)
}

/**
 * Renders a money value with the cents in smaller, muted type
 * (`$38,758` + `.95`). Returns a React fragment.
 */
export function MoneyParts({ value }) {
  const v = Number(value) || 0
  const whole = Math.floor(v)
  const cents = Math.round((v - whole) * 100)
  return (
    <>
      {'$' + fmt(whole)}
      {cents > 0 && <span className="cents">.{String(cents).padStart(2, '0')}</span>}
    </>
  )
}
