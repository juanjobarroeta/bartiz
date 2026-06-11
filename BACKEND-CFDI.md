# Backend spec — CFDIs in bartiz (construcción module)

Hand-off for the **contabilidad-os / construcción** backend. CFDIs are already
downloaded automatically (cronjob). This exposes them to bartiz and adds the
operational matching ("conciliación") that links each CFDI to the purchase /
expense / estimación it belongs to.

The bartiz frontend (`/facturas`) already consumes the contract below; it
renders documented sample data until these endpoints exist.

## Concept

A CFDI is a fiscal document owned by the accounting core. bartiz does **not**
duplicate it — it references it by id and stores only the **operational link**
(which requisición / gasto / estimación / bank movement it belongs to). The
match **suggestions are computed in the backend** (reuses the same ±amount /
±date logic already used for bank-transaction matching, plus emisor-RFC →
supplier).

## 1. List — `GET /api/construccion/cfdis`

Query: `companyId`, `tipo` (`RECIBIDA|EMITIDA`), optional `match`
(`SIN_VINCULAR|SUGERIDA|VINCULADA|PAGADA|IGNORADA`), `q`, pagination.

Each item:

```jsonc
{
  "id": "cfdi_…",
  "uuid": "A1B2…-UUID",
  "serie": "A", "folio": "1234",
  "tipo": "RECIBIDA",              // RECIBIDA = we are receptor; EMITIDA = we are emisor
  "tipoComprobante": "I",         // I Ingreso · E Egreso · P Pago · N Nómina · T Traslado
  "emisorRfc": "RYS010101AB1", "emisorNombre": "Cementos RYSCO",
  "receptorRfc": "DIN1604261F8", "receptorNombre": "DECOLSA INGENIERIA",
  "fecha": "2026-06-03T12:00:00Z",
  "subtotal": 86200, "iva": 13792, "total": 100000, "moneda": "MXN",
  "estadoSat": "VIGENTE",         // VIGENTE | CANCELADO

  "matchEstado": "SUGERIDA",      // SIN_VINCULAR | SUGERIDA | VINCULADA | PAGADA | IGNORADA
  "supplierId": "sup_…",          // resolved by emisor RFC (recibidas) — null if unknown
  "supplier": { "razonSocial": "Cementos RYSCO" },

  // backend-computed best candidate (the smart match):
  "suggestion": {
    "tipo": "SOLICITUD",          // SOLICITUD | GASTO | ESTIMACION | BANK_TX
    "targetId": "sol_…",
    "label": "REQ-0288 · Platino 2br",
    "monto": 100000, "fecha": "2026-06-01",
    "score": 0.94                 // 0..1 confidence
  },

  // confirmed link (once matchEstado = VINCULADA/PAGADA):
  "link": { "tipo": "SOLICITUD", "targetId": "sol_…", "label": "REQ-0288 · Platino 2br" }
}
```

Suggestion heuristics (received CFDIs):
- **supplier** by emisor RFC (exact) → high signal.
- **requisición / OC** (`SolicitudCompra`, estado APROBADA/PAGADA) by supplier + `total` within ±tolerance + fecha within a window. Same matcher as bank-tx `bt-candidates`.
- **gasto** by supplier + importe + fecha.
- **bank tx / complemento de pago** for the payment leg.
Issued CFDIs (emitidas, tipo I) → match to **estimaciones** by proyecto + importe.

## 2. Confirm a link — `POST /api/construccion/cfdis/:id/vincular`

Body `{ "tipo": "SOLICITUD", "targetId": "sol_…" }` → sets `matchEstado:
VINCULADA`, persists the link, and propagates cost: the CFDI total flows to
the linked target's project/concept (via its `presupuestoPartidaId`) so
Gastado / budget consumption reflect real invoices. Returns the updated CFDI.

## 3. Manual candidates — `GET /api/construccion/cfdis/:id/candidatos`

Returns a ranked list (same shape as `suggestion`) for the manual picker when
the top suggestion is wrong.

## 4. Ignore — `POST /api/construccion/cfdis/:id/ignorar`

For non-operational CFDIs (e.g. handled elsewhere) → `matchEstado: IGNORADA`,
keeps the "por vincular" queue clean. Mirrors the bank-tx "ignored" treatment.

## 5. Counts for notifications

Either on the list response or `GET /api/construccion/cfdis/resumen?companyId`:
`{ porVincular, sugeridas, vinculadas, vencidasSinPago }`. bartiz folds these
into the **Pendientes** inbox (dashboard + mobile tab): new invoice from a
known supplier, high-confidence auto-matches to confirm, SAT-cancelled-after-
link alerts, aging unmatched CFDIs.

## What this unlocks

- **Cost attribution** — invoice totals reach the project/concept.
- **Fiscal-grade Cuentas por pagar** — a received CFDI with no payment
  complement *is* an open payable, with a real SAT date (replaces the
  OC-derived estimate in `/cuentas-por-pagar`).
- **Three-way match** — OC ↔ CFDI ↔ pago; flags CFDI-without-OC (maverick
  spend), OC-without-CFDI (missing invoice), CFDI-without-payment (unpaid).
