import './OfferTerms.css'

/**
 * Condiciones de una oferta de proveedor: forma de pago y días de entrega.
 * Los precios se capturan siempre SIN IVA; el IVA lo pone la tasa de cada
 * línea (16 %, 0 % o exento), así hay un solo selector de IVA. Reemplaza los checkboxes sueltos —
 * "Contado" marcado significaba crédito y la etiqueta quedaba debajo de la
 * casilla, pegada al checkbox de IVA — por controles segmentados donde cada
 * opción dice lo que es.
 *
 * Todo es controlado: `onChange(patch)` recibe sólo las llaves que cambian
 * (`credito`, `diasCredito`, `diasEntrega`).
 */
export default function OfferTerms({ credito, diasCredito, diasEntrega, onChange, compact = false }) {
  return (
    <div className={'oterms' + (compact ? ' compact' : '')}>
      <div className="oterm">
        <span className="oterm-l">Pago</span>
        <Segmented
          value={credito ? 'credito' : 'contado'}
          options={[['contado', 'Contado'], ['credito', 'Crédito']]}
          onChange={(v) => onChange({ credito: v === 'credito' })}
          title="Precargado de las condiciones del proveedor; ajustable"
        />
        {credito && (
          <span className="oterm-num" title="Días de crédito: define el vencimiento en cuentas por pagar">
            <input
              type="number"
              min="0"
              max="365"
              step="1"
              inputMode="numeric"
              value={diasCredito ?? ''}
              onChange={(e) => onChange({ diasCredito: e.target.value })}
              placeholder="30"
              aria-label="Días de crédito"
            />
            días
          </span>
        )}
      </div>

      <div className="oterm">
        <span className="oterm-l">Entrega</span>
        <span className="oterm-num" title="Días de entrega prometidos por este proveedor">
          <input
            type="number"
            min="0"
            step="1"
            inputMode="numeric"
            value={diasEntrega ?? ''}
            onChange={(e) => onChange({ diasEntrega: e.target.value })}
            placeholder="—"
            aria-label="Días de entrega"
          />
          días
        </span>
      </div>
    </div>
  )
}

function Segmented({ value, options, onChange, title }) {
  return (
    <span className="seg" role="group" title={title}>
      {options.map(([v, label]) => (
        <button
          key={v}
          type="button"
          className={'seg-btn' + (value === v ? ' on' : '')}
          aria-pressed={value === v}
          onClick={() => onChange(v)}
        >
          {label}
        </button>
      ))}
    </span>
  )
}

/**
 * Desglose de una oferta línea por línea con la tasa de cada línea
 * (16 %, 0 % o exento): `lineas` = [{ importe, tasa }] con el importe sin IVA.
 */
export function desglose(lineas) {
  let sub = 0
  let iva = 0
  for (const { importe, tasa } of lineas) {
    const t = Number(tasa) || 0
    sub += importe
    iva += importe * t
  }
  return { sub, iva }
}

/** Subtotal, IVA y total para que no haya duda de qué número se compara. */
export function OfferTotals({ lineas }) {
  const { sub, iva } = desglose(lineas)
  const fmt = (n) => n.toLocaleString('es-MX', { style: 'currency', currency: 'MXN', minimumFractionDigits: 2 })
  return (
    <div className="otot">
      <span>Subtotal</span><b>{fmt(sub)}</b>
      <span>IVA</span><b>{fmt(iva)}</b>
      <span>Total</span><b className="otot-t">{fmt(sub + iva)}</b>
    </div>
  )
}
