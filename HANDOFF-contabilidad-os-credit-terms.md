# Hand-off — implement supplier credit terms on contabilidad-os

**For:** the **contabilidad-os / construcción** backend (separate repo from the
bartiz frontend).
**Why:** saving a proveedor's credit terms in bartiz fails with **"Load
failed"**. The endpoint the UI calls doesn't exist on the backend yet. The
frontend was shipped against the spec in `BACKEND-SUPPLIER-TERMS.md`; this
document is the focused, copy-paste-ready version to make the save work.

---

## 1. Symptom & root cause

- In bartiz: **Proveedores → (un proveedor) → Condiciones de crédito → Guardar**
  shows an `Aviso: Load failed` dialog.
- "Load failed" (Safari) / "Failed to fetch" (Chrome) is a **network-level
  `fetch()` rejection**, *not* an HTTP error. A 404 would surface differently
  (the bartiz client renders `… → 404 (ruta no encontrada o no desplegada aún)`).
- A `PUT` with `Content-Type: application/json` + `Authorization` triggers a
  **CORS preflight `OPTIONS`**. When the route isn't registered, the preflight
  gets a 404 **without CORS headers**, so the browser blocks the request and
  `fetch()` rejects → "Load failed".

**Conclusion:** the route `PUT /api/construccion/suppliers/:id/terms` is not
implemented (and/or not covered by CORS). Implement it and ensure CORS/OPTIONS
applies to it.

## 2. Exact request the frontend sends

```
PUT {API_URL}/api/construccion/suppliers/:id/terms
Authorization: Bearer <jwt>
Content-Type: application/json
Accept: application/json

{ "tieneCredito": true, "diasCredito": 30, "limiteCredito": 100000 }
```

- `:id` is the construcción `Supplier.id`.
- When the toggle is off, the client sends `{ "tieneCredito": false,
  "diasCredito": 0, "limiteCredito": null }`.
- `limiteCredito` may be `null` (optional ceiling, MXN).

Expected: **2xx with the saved terms** (any JSON body is fine; the UI reloads
the supplier afterward). On non-2xx the UI shows the server's `error` field if
present.

## 3. What the frontend reads back

After saving, bartiz refetches the supplier and reads **`supplier.terms`**:

```jsonc
// GET /api/construccion/suppliers/:id  (and each row of the list)
{
  "id": "…", "razonSocial": "…", "rfc": "…",
  "terms": { "tieneCredito": true, "diasCredito": 30, "limiteCredito": 100000 }
}
```

So `terms` must be **included on both** `GET /suppliers` (list — drives the
credit chip) and `GET /suppliers/:id` (detail). A flattened
`diasCredito`/`tieneCredito` on the supplier also works as a fallback, but the
nested `terms` object is preferred.

## 4. Schema (Prisma)

Keep credit terms **off the fiscal-core `Supplier` model** — they're
construcción-owned operational data — in their own table, same database.

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

model Supplier {
  // …existing fiscal fields…
  terms SupplierTerms?   // relation only — no fiscal columns added
}
```

```
npx prisma migrate dev --name supplier_terms
```

## 5. Handler

```ts
// PUT /api/construccion/suppliers/:id/terms
router.put('/suppliers/:id/terms', requireAuth, async (req, res) => {
  const { id } = req.params
  const companyId = req.companyId // however the app scopes the active company

  // Ensure the supplier belongs to the caller's company (404/403 otherwise).
  const supplier = await prisma.supplier.findFirst({ where: { id, companyId } })
  if (!supplier) return res.status(404).json({ error: 'Proveedor no encontrado' })

  const { tieneCredito, diasCredito, limiteCredito } = req.body
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
})
```

And add `include: { terms: true }` to the existing supplier list + detail
queries.

## 6. CORS / preflight (don't skip — this is why it shows "Load failed")

- Make sure the CORS middleware is applied **before** routing and covers
  `OPTIONS` for this path, with `Authorization` + `Content-Type` allowed and
  `PUT` in the allowed methods. If CORS is mounted globally (`app.use(cors(...))`
  before routers) this is automatic; if it's per-router, ensure this router is
  covered.
- Verify the **error** responses (404/422) also carry CORS headers, so the
  client can read them instead of failing at the network layer.

## 7. Verification

```bash
# preflight must return 2xx WITH Access-Control-Allow-* headers
curl -i -X OPTIONS "$API/api/construccion/suppliers/$SUP/terms" \
  -H "Origin: https://bartiz.vercel.app" \
  -H "Access-Control-Request-Method: PUT" \
  -H "Access-Control-Request-Headers: authorization,content-type"

# the write
curl -i -X PUT "$API/api/construccion/suppliers/$SUP/terms" \
  -H "Authorization: Bearer $JWT" -H "Content-Type: application/json" \
  -d '{"tieneCredito":true,"diasCredito":30,"limiteCredito":100000}'

# read-back includes terms
curl -s "$API/api/construccion/suppliers/$SUP" -H "Authorization: Bearer $JWT" | jq .terms
```

**Acceptance:** in bartiz, saving Condiciones de crédito no longer errors, the
credit chip shows "Crédito · N días" / "Contado", and the value survives a
reload.

## 8. Follow-up (not required for this fix)

Once terms persist, the cuentas-por-pagar / cashflow screen can derive a due
date per open payable:

```
vencimiento = (fechaRecepción ?? fechaOC) + supplier.terms.diasCredito días
            (contado ⇒ vence de inmediato)
```

See `BACKEND-SUPPLIER-TERMS.md` §3 for the recommended
`GET /api/construccion/cuentas-por-pagar` shape.
