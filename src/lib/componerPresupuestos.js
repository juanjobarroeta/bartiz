// The import API stores one tree per project and one explosion row per supply.
// Keep source concept rows separate: the same code can have different unit prices.
const texto = (value) => value.trim().replace(/\s+/g, ' ').toLocaleLowerCase('es-MX')
const porConcepto = (formato) => ['LISTA_CONCEPTOS', 'ACTIVIDADES_PDF'].includes(formato)

function sumaCaratulas(modelos, campo) {
  if (modelos.some(({ scan }) => scan.caratula[campo] == null)) return null
  return modelos.reduce((sum, { scan, cantidad }) => sum + scan.caratula[campo] * cantidad, 0)
}

// Codes 1–30 select Decolsa's default housing curves. Allocate new top-level
// codes outside that range and reserve source suffixes before allocating any.
function crearArbol(modelos, warnings) {
  const branches = new Map()
  const leaves = []
  const conceptos = new Map()
  const codigosReservados = new Set(modelos.flatMap(({ scan }) =>
    scan.branches.map(b => b.codigo.split('.').at(-1))))
  const alternativas = new Map()
  let offset = 0
  let siguiente = 31
  function nuevoCodigo(prefijo) {
    while (codigosReservados.has(String(siguiente))) siguiente++
    return prefijo + siguiente++
  }

  for (const { scan, nombre, cantidad } of modelos) {
    const locales = new Map()
    let ultimaFila = 0
    for (const b of [...scan.branches].sort((a, b) => a.nivel - b.nivel || a.rowIndex - b.rowIndex)) {
      if (locales.has(b.codigo)) {
        throw new Error(`${nombre} tiene dos capítulos con el código ${b.codigo}. Asigna una clave distinta a cada capítulo.`)
      }
      const segmentos = b.nivel === 1 ? [b.codigo] : b.codigo.split('.')
      const ultimo = segmentos.pop()
      const padre = segmentos.join('.')
      if (padre && !locales.has(padre)) {
        throw new Error(`${nombre}: falta el capítulo ${padre}, padre de ${b.codigo}.`)
      }

      const prefijo = padre ? locales.get(padre) + '.' : ''
      let codigo = prefijo + ultimo
      const previo = branches.get(codigo)
      // Matrices exports can label chapters with letters. The estimate
      // bootstrap needs numeric root codes to include them in the template.
      const requiereNumero = !padre && !/^\d+$/.test(codigo)
      if (requiereNumero || (previo && texto(previo.descripcion) !== texto(b.descripcion))) {
        const key = JSON.stringify([codigo, texto(b.descripcion)])
        codigo = alternativas.get(key)
        if (!codigo) {
          codigo = nuevoCodigo(prefijo)
          alternativas.set(key, codigo)
        }
        warnings.add(`${nombre}: el capítulo ${b.codigo} «${b.descripcion}» se conserva por separado con código ${codigo}.`)
      }
      locales.set(b.codigo, codigo)
      const existente = branches.get(codigo)
      if (existente) existente.importeReportado += b.importeReportado * cantidad
      else branches.set(codigo, { ...b, codigo, importeReportado: b.importeReportado * cantidad, rowIndex: offset + b.rowIndex })
      ultimaFila = Math.max(ultimaFila, b.rowIndex)
    }

    for (const l of scan.leaves) {
      const parentCodigo = locales.get(l.parentCodigo)
      if (!parentCodigo) throw new Error(`${nombre}: falta el capítulo del concepto ${l.conceptoClave}.`)
      const previo = conceptos.get(l.conceptoClave)
      if (previo) verificarCatalogo('concepto', l.conceptoClave, previo, l, nombre, warnings)
      else conceptos.set(l.conceptoClave, l)
      leaves.push({ ...l, parentCodigo, cantidad: l.cantidad * cantidad, importe: l.importe * cantidad, rowIndex: offset + l.rowIndex })
      ultimaFila = Math.max(ultimaFila, l.rowIndex)
    }
    offset += ultimaFila + 1
  }
  // For chapters 16+, estimates use the direct child chapters when present.
  // A second workbook can introduce subchapters into a chapter which formerly
  // had concepts directly under it. Keep those direct concepts billable too.
  if (!modelos.some(m => porConcepto(m.scan.formato))) {
    const abiertos = new Set([...branches.values()]
      .filter(b => b.nivel === 2 && Number(b.codigo.split('.')[0]) >= 16)
      .map(b => b.codigo.split('.')[0]))
    const conceptosDirectos = new Map()
    for (const l of leaves) {
      if (!abiertos.has(l.parentCodigo)) continue
      let grupo = conceptosDirectos.get(l.parentCodigo)
      if (!grupo) {
        grupo = {
          kind: 'branch',
          codigo: nuevoCodigo(l.parentCodigo + '.'),
          nivel: 2,
          descripcion: branches.get(l.parentCodigo).descripcion + ' · conceptos directos',
          importeReportado: 0,
          rowIndex: l.rowIndex,
        }
        conceptosDirectos.set(l.parentCodigo, grupo)
        branches.set(grupo.codigo, grupo)
      }
      l.parentCodigo = grupo.codigo
      grupo.importeReportado += l.importe
    }
  }
  return { branches: [...branches.values()], leaves }
}

function verificarCatalogo(tipo, clave, previo, actual, nombre, warnings) {
  if (texto(previo.unidad) !== texto(actual.unidad) || previo.tipo !== actual.tipo) {
    throw new Error(`${nombre}: la clave de ${tipo} ${clave} tiene unidades o tipos distintos entre los presupuestos. Corrige la unidad o asigna claves distintas.`)
  }
  if (texto(previo.descripcion) !== texto(actual.descripcion)) {
    warnings.add(`${nombre}: la clave de ${tipo} ${clave} también aparece como «${actual.descripcion}». Se usará la descripción de catálogo o «${previo.descripcion}».`)
  }
}

function combinarInsumos(modelos, warnings) {
  const porClave = new Map()
  for (const { scan, nombre, cantidad } of modelos) {
    for (const ins of scan.insumos) {
      const unidades = ins.cantidad * cantidad
      const importe = ins.importe * cantidad
      const previo = porClave.get(ins.clave)
      if (!previo) {
        porClave.set(ins.clave, { ...ins, cantidad: unidades, importe })
        continue
      }
      verificarCatalogo('insumo', ins.clave, previo, ins, nombre, warnings)
      if (previo.costoActual !== ins.costoActual) {
        const totalUnidades = previo.cantidad + unidades
        if (totalUnidades === 0 && (unidades !== 0 || previo.cantidad !== 0)) {
          throw new Error(`${nombre}: las cantidades del insumo ${ins.clave} se cancelan con precios distintos. Revisa las claves y cantidades.`)
        }
        if (totalUnidades !== 0) {
          previo.costoActual = (previo.costoActual * previo.cantidad + ins.costoActual * unidades) / totalUnidades
        }
        warnings.add(`Insumo ${ins.clave}: se combinaron costos unitarios distintos con un promedio ponderado por cantidad.`)
      }
      previo.cantidad += unidades
      previo.importe += importe
    }
  }
  return [...porClave.values()]
}

export function componerPresupuestos(modelos) {
  if (!modelos.length || modelos.some(m => !Number.isSafeInteger(m.cantidad) || m.cantidad < 1)) {
    throw new Error('Selecciona al menos un presupuesto con una cantidad entera positiva.')
  }
  if (modelos.length === 1 && modelos[0].cantidad === 1) return modelos[0].scan

  const warnings = new Set(modelos.flatMap(({ scan, nombre }) =>
    scan.warnings.map(w => `${nombre}: ${w}`)))
  const { branches, leaves } = crearArbol(modelos, warnings)
  const insumos = combinarInsumos(modelos, warnings)
  const filename = modelos.map(({ nombre, cantidad }) => `${cantidad} × ${nombre}`).join(' + ')
  // Only one estimate template can be bootstrapped. If any input is estimated
  // per concept, keep that granularity so its source concepts remain billable.
  const formato = modelos.find(m => porConcepto(m.scan.formato))?.scan.formato ?? modelos[0].scan.formato
  if (modelos.some(m => porConcepto(m.scan.formato) !== porConcepto(formato))) {
    warnings.add('Se combinaron formatos de estimación distintos. La plantilla del proyecto se generará por concepto.')
  }
  return {
    filename,
    alreadyHasPresupuesto: modelos.some(m => m.scan.alreadyHasPresupuesto),
    formato,
    caratula: {
      titulo: filename,
      subtotal: sumaCaratulas(modelos, 'subtotal'),
      utilidad: sumaCaratulas(modelos, 'utilidad'),
      total: sumaCaratulas(modelos, 'total'),
    },
    branches, leaves, insumos, warnings: [...warnings],
    totals: {
      branchCount: branches.length,
      leafCount: leaves.length,
      maxDepth: branches.reduce((max, b) => Math.max(max, b.nivel), 0),
      sumLeafImporte: leaves.reduce((sum, l) => sum + l.importe, 0),
      sumBranchTopImporte: branches.filter(b => b.nivel === 1).reduce((sum, b) => sum + b.importeReportado, 0),
    },
  }
}
