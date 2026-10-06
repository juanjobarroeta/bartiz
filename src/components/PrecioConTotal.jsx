import { useState } from 'react'
import './PrecioConTotal.css'

/**
 * Precio de un concepto en una cotización, capturable de dos formas:
 *   • P.U. sin IVA — lo que se guarda (canónico), o
 *   • Total con IVA — lo que trae el ticket / la nota (gasolina, ferretería).
 * Escribir cualquiera llena el otro: P.U. = total ÷ (1 + tasa de la línea)
 * ÷ cantidad. Sin cantidad no hay total que repartir y esa casilla se apaga.
 */
const r4 = (n) => Math.round(n * 10000) / 10000

export default function PrecioConTotal({ pu, cantidad, tasa, onPu, concepto = '' }) {
  // Mientras se escribe el total se respeta el texto tal cual; al salir de la
  // casilla vuelve a mostrarse el total calculado desde el P.U.
  const [totalTxt, setTotalTxt] = useState(null)
  const cant = Number(cantidad) || 0
  const t = Number(tasa) || 0
  const puNum = parseFloat(pu) || 0
  const totalCalc = puNum > 0 && cant > 0 ? (puNum * cant * (1 + t)).toFixed(2) : ''

  const onTotal = (v) => {
    setTotalTxt(v)
    const tot = parseFloat(v)
    if (v === '') onPu('')
    else if (tot > 0 && cant > 0) onPu(String(r4(tot / (1 + t) / cant)))
  }

  return (
    <div className="pct">
      <input
        type="number"
        step="0.01"
        inputMode="decimal"
        value={pu ?? ''}
        onChange={(e) => { setTotalTxt(null); onPu(e.target.value) }}
        placeholder="P.U. sin IVA"
        aria-label={`Precio unitario sin IVA de ${concepto}`}
      />
      <input
        type="number"
        step="0.01"
        inputMode="decimal"
        className="pct-total"
        value={totalTxt ?? totalCalc}
        onChange={(e) => onTotal(e.target.value)}
        onBlur={() => setTotalTxt(null)}
        disabled={cant <= 0}
        placeholder={cant > 0 ? 'o total c/IVA' : 'pon cantidad'}
        title="Total del ticket o nota con IVA incluido: calcula el precio unitario"
        aria-label={`Total con IVA de ${concepto}`}
      />
    </div>
  )
}
