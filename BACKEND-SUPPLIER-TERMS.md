# Backend spec — supplier credit terms (construcción module)

Hand-off for the **contabilidad-os / construcción** backend (a different repo
from this frontend). The bartiz UI already reads and writes supplier credit
terms against the contract below; it just needs the API side to exist. Until
then the credit chip degrades to "—".

## Design principle

Credit terms are **construcción-owned operational data**, deliberately kept
**off the fiscal-core `Supplier` model** (which stays RFC / régimen / CLABE —
what accounting needs). They live in a vertical-owned table in the **same
database**, joined to the core supplier by id. This keeps the engine clean
while staying a one-line join for cuentas-por-pagar / cashflow later.

## 1. Schema — new table (Prisma)

```prisma
model SupplierTerms {
  id            String   @id @default(cuid())
  supplierId    String   @unique
  supplier      Supplier @relation(fields: [supplierId], references: [id], onDelete: Cascade)

  tieneCredito  Boolean  @default(false)
  diasCredito   Int      @default(0)        // 0 = contado
  limiteCredito Decimal? @db.Decimal(14, 2) // optional credit ceiling (MXN)

  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  @@map("construccion_supplier_terms")
}
```

Add the back-relation on the core supplier (relation only — no fiscal columns):

```prisma
model Supplier {
  // …existing fiscal fields…
  terms SupplierTerms?
}
```

Then `prisma migrate dev --name supplier_terms`.

## 2. Endpoints

### `PUT /api/construccion/suppliers/:id/terms`
Upsert the terms for a supplier (scoped to the active company).

Request body:
```json
{ "tieneCredito": true, "diasCredito": 30, "limiteCredito": 250000 }
```
- Normalize: if `tieneCredito` is false → force `diasCredito: 0`, `limiteCredito: null`.
- Upsert on `supplierId`. Return the saved terms object.

```ts
// pseudocode
const { tieneCredito, diasCredito, limiteCredito } = req.body
await assertSupplierInCompany(id, companyId)
const data = {
  tieneCredito: !!tieneCredito,
  diasCredito: tieneCredito ? Math.max(0, Number(diasCredito) || 0) : 0,
  limiteCredito: tieneCredito && limiteCredito != null ? Number(limiteCredito) : null,
}
const terms = await prisma.supplierTerms.upsert({
  where: { supplierId: id },
  create: { supplierId: id, ...data },
  update: data,
})
res.json(terms)
```

### Include `terms` on existing reads
The UI reads `supplier.terms`. Include the relation on:
- `GET /api/construccion/suppliers` (list — needed for the credit chip)
- `GET /api/construccion/suppliers/:id` (detail)

```ts
prisma.supplier.findMany({ where: { companyId }, include: { terms: true, _count: {…} } })
```

The frontend also accepts flattened `diasCredito`/`tieneCredito` on the
supplier as a fallback, so embedding under `terms` is preferred but either
works.

## 3. Next: payment-due → cashflow (follow-up, not required yet)

Once terms persist, the cuentas-por-pagar / cashflow screen derives a due
date per payable:

```
vencimiento = (fechaRecepción ?? fechaOC) + supplier.terms.diasCredito días
            (contado ⇒ due immediately)
```

Recommended API for that screen:
`GET /api/construccion/cuentas-por-pagar?companyId=…` returning, per open
payable (selected requisición / OC not yet PAGADA): supplier, monto,
`formaPago`, `diasCredito`, computed `vencimiento`, and `estado`. The screen
then buckets by week (vencido / 0-7 / 8-15 / 16-30 / 30+) and compares the
total against the bank balance we already expose.
