import test from 'node:test'
import assert from 'node:assert/strict'
import { componerPresupuestos } from '../src/lib/componerPresupuestos.js'

function modelo(nombre = 'A.xlsx', cantidad = 1, precio = 10) {
  return {
    nombre, cantidad,
    scan: {
      filename: nombre,
      caratula: { titulo: nombre, subtotal: precio * 2, utilidad: null, total: null },
      formato: 'PRESUPUESTO',
      branches: [{ kind: 'branch', codigo: '16', descripcion: 'Acabados', nivel: 1, importeReportado: precio * 2, rowIndex: 2 }],
      leaves: [{ kind: 'leaf', parentCodigo: '16', conceptoClave: 'C01', descripcion: 'Piso', unidad: 'm²', cantidad: 2, precioUnitario: precio, importe: precio * 2, rowIndex: 3 }],
      insumos: [{ clave: 'M01', descripcion: 'Loseta', unidad: 'pza', tipo: 'MATERIAL', familia: null, cantidad: 4, costoActual: precio / 2, importe: precio * 2 }],
      warnings: ['Revisar redondeo'],
      alreadyHasPresupuesto: false,
      totals: { branchCount: 1, leafCount: 1, maxDepth: 1, sumLeafImporte: precio * 2, sumBranchTopImporte: precio * 2 },
    },
  }
}

test('existing single budget passes through unchanged', () => {
  const a = modelo()
  assert.equal(componerPresupuestos([a]), a.scan)
})

test('3 of A and 2 of B combine direct costs, supplies, chapters and cover totals', () => {
  const a = modelo('A.xlsx', 3)
  const b = modelo('B.xlsx', 2, 20)
  const before = structuredClone([a, b])
  const result = componerPresupuestos([a, b])
  assert.deepEqual(result.totals, { branchCount: 1, leafCount: 2, maxDepth: 1, sumLeafImporte: 140, sumBranchTopImporte: 140 })
  assert.deepEqual(result.leaves.map(l => [l.parentCodigo, l.cantidad, l.precioUnitario, l.importe]), [['16', 6, 10, 60], ['16', 4, 20, 80]])
  assert.equal(result.insumos.length, 1)
  assert.deepEqual([result.insumos[0].cantidad, result.insumos[0].costoActual, result.insumos[0].importe], [20, 7, 140])
  assert.equal(result.caratula.subtotal, 140)
  assert.equal(result.caratula.total, null)
  assert.equal(result.filename, '3 × A.xlsx + 2 × B.xlsx')
  assert.ok(result.warnings.includes('A.xlsx: Revisar redondeo'))
  assert.ok(result.warnings.includes('B.xlsx: Revisar redondeo'))
  assert.deepEqual([a, b], before)
})

test('a conflicting source chapter keeps its own descendants, including across three models', () => {
  const a = modelo()
  const b = modelo('B.xlsx')
  b.scan.branches[0].descripcion = 'Terracería'
  b.scan.branches.push({ ...b.scan.branches[0], codigo: '16.1', nivel: 2, rowIndex: 3 })
  b.scan.leaves[0].parentCodigo = '16.1'
  const result = componerPresupuestos([a, b, { ...b, nombre: 'C.xlsx' }])
  assert.deepEqual(result.branches.map(b => b.codigo), ['16', '31', '31.1'])
  assert.deepEqual(result.leaves.map(l => l.parentCodigo), ['16', '31.1', '31.1'])
  assert.match(result.warnings.join(' '), /B.xlsx.*Terracería.*31/)
})

test('mixed direct work and subchapters are both covered by the estimate template', () => {
  const a = modelo()
  const b = modelo('B.xlsx')
  b.scan.branches.push({ ...b.scan.branches[0], codigo: '16.1', nivel: 2, rowIndex: 3 })
  b.scan.leaves[0].parentCodigo = '16.1'
  const result = componerPresupuestos([a, b])
  assert.equal(result.branches[0].codigo, '16')
  assert.ok(result.leaves.every(l => /^16\.\d+$/.test(l.parentCodigo)))
  assert.notEqual(result.leaves[0].parentCodigo, result.leaves[1].parentCodigo)
  assert.equal(result.totals.sumLeafImporte, 40)
})

test('incompatible units and unusable quantities identify the problem before import', () => {
  const a = modelo()
  const b = modelo('B.xlsx')
  b.scan.insumos[0].unidad = 'm²'
  assert.throws(() => componerPresupuestos([a, b]), /B.xlsx.*M01.*unidades/)
  for (const cantidad of [0, -1, 0.5, NaN, Infinity, 2 ** 54]) {
    assert.throws(() => componerPresupuestos([{ ...a, cantidad }]), /entera positiva/)
  }
})

test('combined format keeps concept-level billing when a model needs it', () => {
  const a = modelo()
  const b = modelo('B.xlsx')
  b.scan.formato = 'LISTA_CONCEPTOS'
  assert.equal(componerPresupuestos([a, b]).formato, 'LISTA_CONCEPTOS')
})

test('Matrices letter chapters are included in the numeric estimate bootstrap', () => {
  const a = modelo('Matrices.xlsx', 2)
  a.scan.formato = 'MATRICES'
  a.scan.branches[0].codigo = 'A'
  a.scan.leaves[0].parentCodigo = 'A'
  const result = componerPresupuestos([a])
  assert.equal(result.branches[0].codigo, '31')
  assert.equal(result.leaves[0].parentCodigo, '31')
})
