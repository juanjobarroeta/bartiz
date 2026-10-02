import './OfferTerms.css'

/**
 * Condiciones de una oferta de proveedor: forma de pago, base de precios
 * (sin / con IVA) y días de entrega. Reemplaza los checkboxes sueltos —
 * "Contado" marcado significaba crédito y la etiqueta quedaba debajo de la
 * casilla, pegada al checkbox de IVA — por controles segmentados donde cada
 * opción dice lo que es.
 *
 * Todo es controlado: `onChange(patch)` recibe sólo las llaves que cambian
 * (`credito`, `diasCredito`, `conIva`, `diasEntrega`).
 */
export default function OfferTerms({ credito, diasCredito, conIva, diasEntrega, onChange, compact = false }) {
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
        <span className="oterm-l">Precios</span>
        <Segmented
          value={conIva ? 'con' : 'sin'}
          options={[['sin', 'Sin IVA'], ['con', 'Con IVA']]}
          onChange={(v) => onChange({ conIva: v === 'con' })}
          title="Cómo vienen los precios en la cotización del proveedor. Se guardan sin IVA para comparar parejo."
        />
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

/** Precio capturado → precio sin IVA (canónico en backend). */
export const IVA = 0.16
export const sinIva = (precio, conIva) => (conIva ? precio / (1 + IVA) : precio)

/**
 * Desglose del total de una oferta según cómo se capturaron los precios:
 * siempre muestra subtotal, IVA y total para que no haya duda de qué número
 * se está comparando.
 */
export function OfferTotals({ total, conIva }) {
  const sub = conIva ? total / (1 + IVA) : total
  const iva = sub * IVA
  const fmt = (n) => n.toLocaleString('es-MX', { style: 'currency', currency: 'MXN', minimumFractionDigits: 2 })
  return (
    <div className="otot">
      <span>Subtotal</span><b>{fmt(sub)}</b>
      <span>IVA 16%</span><b>{fmt(iva)}</b>
      <span>Total</span><b className="otot-t">{fmt(sub + iva)}</b>
    </div>
  )
}
