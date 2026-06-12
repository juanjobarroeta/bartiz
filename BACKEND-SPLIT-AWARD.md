# Backend spec — per-concept award (adjudicación por concepto)

Hand-off for the **contabilidad-os / construcción** backend (a different repo
from this frontend). The bartiz Requisición detail screen now lets the buyer
**award each concept (partida) to a different supplier** within one
requisición — concept A to vendor X, concept B to vendor Y — instead of
choosing a single winning quote for the whole requisición.

The UI already reads and writes against the contract below and degrades
gracefully: if the endpoint isn't live yet, the per-concept selection is kept
**in local state only** and the buyer sees a "guardado localmente (pendiente
del backend)" note. Wiring the endpoint makes it persistent and lets it drive
purchase-order generation.

## Design principle

A requisición's award is no longer a single `supplierId` on the solicitud. It
is a **map of `solicitudPartidaId → cotizacionId`** (which supplier's quote
wins that line). The existing whole-requisición `seleccionar` endpoint stays as
the simple "todo a un proveedor" shortcut; a split award is the general case
and, when concepts span multiple suppliers, should fan out into **one purchase
order per supplier**.

## 1. Schema

Store the winning quote per requisición line. Add to the existing
`SolicitudPartida` (requisición line) model:

```prisma
model SolicitudCompraPartida {
  // …existing fields (descripcion, unidad, cantidad, precioUnitario, …)…

  // Per-concept award: which cotización (vendor quote) won this line.
  cotizacionGanadoraId String?
  cotizacionGanadora   Cotizacion? @relation("PartidaAdjudicada", fields: [cotizacionGanadoraId], references: [id], onDelete: SetNull)
}
```

No new table required — the award lives on the line it adjudicates. The list
read (`GET /solicitudes-compra/:id`) should include `cotizacionGanadoraId` on
each partida so the UI can seed its selection (it already reads this field).

## 2. Endpoint — replace the full award map

`PUT /api/construccion/solicitudes-compra/:id/adjudicaciones`

The UI sends the **complete** desired map on every change (idempotent replace —
simplest to reason about; an omitted partida means "not awarded").

Request body:

```json
{
  "adjudicaciones": {
    "<solicitudPartidaId>": "<cotizacionId>",
    "<solicitudPartidaId>": "<cotizacionId>"
  }
}
```

Behaviour:

- For each `partidaId → cotizacionId`, set `cotizacionGanadoraId`. Validate
  that the partida belongs to this solicitud **and** that the cotización both
  belongs to this solicitud and actually quoted that partida (has a matching
  `CotizacionPartida` with that `solicitudPartidaId`). Reject otherwise (422).
- Any partida of the solicitud **not** present in the map is cleared
  (`cotizacionGanadoraId = null`).
- Optionally copy the winning quote's `precioUnitario` onto the requisición
  line so totals/cost-attribution read straight off the partida.
- Return the updated solicitud in the same shape as
  `GET /solicitudes-compra/:id`.

Response: `200` with the refreshed solicitud.

## 3. Totals & "ganador"

With split awards the requisición total is the **sum of each line's awarded
quote** (`Σ cotizacionGanadora.precioUnitario × cantidad`). The single
`solicitud.supplier` (whole winner) only makes sense when every awarded line
points at the same cotización; otherwise leave it null and treat the award as
multi-supplier.

The frontend already computes the per-supplier breakdown and grand total for
display; the backend should compute the authoritative `total` on write.

## 4. What this unlocks (downstream)

- **Multi-supplier purchase orders** — converting an adjudicada requisición
  generates one OC per distinct `cotizacionGanadora.supplierId`, each carrying
  only the lines awarded to it.
- **Cost attribution per concept** — each requisición line now carries the real
  awarded price and supplier, feeding presupuesto-vs-real by concept.
- **Cleaner three-way match** — OC ↔ CFDI ↔ pago lines up per supplier even
  when a single material request was split across vendors.

## 5. Back-compat

- The existing `POST /solicitudes-compra/:id/cotizaciones/:cotId/seleccionar`
  (whole-requisición winner) stays. Implement it as the special case where the
  award map is "every quoted line → this cotización".
- Until this endpoint ships, the UI keeps the selection locally and shows the
  pending-backend note — no errors, screen stays usable.
