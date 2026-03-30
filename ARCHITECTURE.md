# System Architecture - Construccion Admin

## Overview

This system separates **internal cost tracking** from **customer pricing**, following industry best practices for construction management.

## Core Modules

### 1. PRESUPUESTO (Budget) - Internal Cost Tracking
**Purpose:** Track what things COST you internally

**Database:** `presupuestos_proyecto` + `items_presupuesto`

**Fields Per Item:**
- `articulo_nombre` - Item description
- `cantidad_presupuestada` - Quantity needed
- `costo_unitario` - **Unit cost (what you pay suppliers/workers)**
- `cantidad_solicitada` - Quantity ordered
- `cantidad_recibida` - Quantity received
- `monto_pagado` - Amount paid

**Use Cases:**
- ✅ Generate purchase orders (at cost prices)
- ✅ Track project expenses
- ✅ Compare estimated vs actual costs
- ✅ Cost control and variance analysis

**One budget per project** - Single source of truth for costs

---

### 2. COTIZACION (Quote) - Customer Pricing
**Purpose:** Price proposals for customers with flexible margins

**Database:** `cotizaciones` + `items_cotizacion`

**Fields Per Quote:**
- `nombre_cotizacion` - Quote name/version
- `cliente_nombre` - Customer name
- `tipo_cliente` - Customer type (gobierno/privado)
- `margen_global` - Default markup % for this quote
- `incluir_iva` - Include 16% tax
- `validez_dias` - Quote validity period

**Fields Per Item:**
- `costo_unitario` - Copied from budget
- `precio_venta_unitario` - **Selling price (what you charge customer)**
- `margen_item` - Profit per unit ($)
- `margen_porcentaje` - Profit margin (%)
- `subtotal_costo` - Total cost
- `subtotal_venta` - Total revenue

**Use Cases:**
- ✅ Generate customer quotes with variable margins
- ✅ Quote same project differently to different customers
- ✅ Adjust pricing based on competition
- ✅ Track which quotes were accepted
- ✅ Calculate profitability per customer

**Multiple quotes per budget** - Flexibility in pricing strategy

---

## Workflow Examples

### Private Client Workflow (Cost-Plus)
```
1. Create Budget
   └─ Enter material costs, labor costs, equipment

2. Generate Quote
   └─ Apply 20-30% markup
   └─ Generate PDF for customer

3. If Accepted → Create Purchase Orders
   └─ Use budget costs for procurement
```

### Government Project Workflow (Fixed-Price)
```
1. Receive Fixed Price Contract
   └─ Government gives you $500,000 budget

2. Create Internal Budget
   └─ Plan how to deliver project
   └─ Material: $250k, Labor: $180k, Equip: $40k = $470k

3. Generate Quote for Records
   └─ Shows government price ($500k)
   └─ Margin = $30k (6% profit)

4. Execute with Budget
   └─ Use $470k cost budget for procurement
   └─ Try to reduce costs to increase profit
```

---

## Key Benefits

### Flexibility
- Quote same project at different margins
- Adjust for customer type and market conditions
- Maintain one accurate cost baseline

### Profitability
- See real-time margins per quote
- Compare quotes across customers
- Track which pricing strategies work

### Cost Control
- Budget tracks actual costs
- Purchase orders use budget costs
- Variance analysis: Budget vs Actual

### Professional
- Follows industry standards (Procore, BuilderTREND, CoConstruct)
- Scalable for growth
- Audit-friendly

---

## API Endpoints

### Budgets (Costs)
- `GET /api/presupuestos-proyecto` - List budgets
- `POST /api/presupuestos-proyecto` - Create budget
- `PUT /api/presupuestos-proyecto/:id` - Update budget
- `POST /api/presupuestos-proyecto/:id/fase/:faseId/item` - Add item (cost)

### Quotes (Customer Pricing)
- `GET /api/cotizaciones?proyectoId=X` - List quotes for project
- `POST /api/cotizaciones/desde-presupuesto` - Create quote from budget
- `GET /api/cotizaciones/:id/pdf` - Download quote PDF
- `PUT /api/cotizaciones/:id` - Update quote
- `DELETE /api/cotizaciones/:id` - Delete quote

---

## Database Schema

### Budget (Costs)
```sql
presupuestos_proyecto (one per project)
└─ fases (phases: Limpieza, Demoliciones, etc.)
   └─ items_presupuesto (items with COSTS)
      ├─ costo_unitario (what we pay)
      └─ cantidad_presupuestada
```

### Quotes (Customer Pricing)
```sql
cotizaciones (many per project)
└─ items_cotizacion
   ├─ costo_unitario (copied from budget)
   ├─ precio_venta_unitario (what we charge)
   ├─ margen_item (calculated profit)
   └─ margen_porcentaje (calculated %)
```

---

## Next Steps to Complete

1. **Create Cotizaciones UI Page**
   - List quotes per project
   - Create quote button with margin selector
   - View/edit quote items and margins

2. **Update PDF Generator**
   - Use quote data (not budget) for customer PDFs
   - Show selling prices
   - Include IVA calculation

3. **Purchase Order System**
   - Generate from budget costs
   - Send to suppliers
   - Track status

4. **Cost Variance Tracking**
   - Compare budget vs actual
   - Alert on overruns
   - Profitability reports

---

**Version:** 1.0  
**Last Updated:** March 30, 2026
