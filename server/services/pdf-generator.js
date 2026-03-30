import PDFDocument from 'pdfkit'

export const generateBudgetQuotePDF = (presupuesto, proyecto, stream) => {
  const doc = new PDFDocument({ 
    size: 'LETTER',
    margins: { top: 50, bottom: 50, left: 50, right: 50 }
  })
  
  doc.pipe(stream)
  
  // Header
  doc.fontSize(20).font('Helvetica-Bold').text('COTIZACIÓN', { align: 'center' })
  doc.moveDown(0.5)
  doc.fontSize(10).font('Helvetica').text(`Presupuesto de Proyecto`, { align: 'center' })
  doc.moveDown(1.5)
  
  // Project Information
  doc.fontSize(14).font('Helvetica-Bold').text('Información del Proyecto')
  doc.moveDown(0.5)
  
  const infoY = doc.y
  doc.fontSize(10).font('Helvetica')
  doc.text(`Proyecto:`, 50, infoY)
  doc.text(`Cliente:`, 50, infoY + 15)
  doc.text(`Ubicación:`, 50, infoY + 30)
  doc.text(`Fecha:`, 50, infoY + 45)
  
  doc.font('Helvetica-Bold')
  doc.text(proyecto.nombre || presupuesto.proyectoNombre, 150, infoY)
  doc.text(proyecto.cliente || 'N/A', 150, infoY + 15)
  doc.text(proyecto.ubicacion || 'N/A', 150, infoY + 30)
  doc.text(new Date().toLocaleDateString('es-MX', { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  }), 150, infoY + 45)
  
  doc.moveDown(4)
  
  // Budget Details
  doc.fontSize(14).font('Helvetica-Bold').text('Desglose de Presupuesto')
  doc.moveDown(1)
  
  let totalGeneral = 0
  
  // Iterate through phases
  presupuesto.fases?.forEach((fase, faseIndex) => {
    if (!fase.items || fase.items.length === 0) return
    
    // Phase header
    doc.fontSize(12).font('Helvetica-Bold')
      .fillColor('#2563EB')
      .text(`${faseIndex + 1}. ${fase.nombre}`, { continued: false })
    doc.fillColor('#000000')
    doc.moveDown(0.5)
    
    // Table headers
    const tableTop = doc.y
    const col1 = 50  // Item
    const col2 = 280 // Quantity
    const col3 = 350 // Unit
    const col4 = 400 // Unit Price
    const col5 = 480 // Subtotal
    
    doc.fontSize(9).font('Helvetica-Bold')
    doc.text('CONCEPTO', col1, tableTop)
    doc.text('CANT.', col2, tableTop)
    doc.text('UNIDAD', col3, tableTop)
    doc.text('P. UNIT.', col4, tableTop)
    doc.text('SUBTOTAL', col5, tableTop)
    
    doc.moveTo(col1, doc.y + 5).lineTo(560, doc.y + 5).stroke()
    doc.moveDown(0.3)
    
    // Items
    let totalFase = 0
    fase.items.forEach((item, itemIndex) => {
      const cantidad = parseFloat(item.cantidadPresupuestada) || 0
      const precio = parseFloat(item.precioUnitarioEstimado) || 0
      const subtotal = cantidad * precio
      totalFase += subtotal
      
      const itemY = doc.y
      
      // Format numbers without excessive decimals
      const cantidadStr = cantidad % 1 === 0 ? cantidad.toString() : cantidad.toFixed(2)
      const precioStr = precio.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
      const subtotalStr = subtotal.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
      
      doc.fontSize(9).font('Helvetica')
      doc.text(`${itemIndex + 1}. ${item.articuloNombre}`, col1, itemY, { 
        width: 220,
        lineBreak: false,
        continued: false
      })
      doc.text(cantidadStr, col2, itemY, { width: 60, align: 'right' })
      doc.text(item.unidad || 'pza', col3, itemY, { width: 40 })
      doc.text(`$${precioStr}`, col4, itemY, { width: 70, align: 'right' })
      doc.text(`$${subtotalStr}`, col5, itemY, { width: 80, align: 'right' })
      
      doc.moveDown(0.8)
    })
    
    // Phase subtotal
    const totalFaseStr = totalFase.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    doc.fontSize(10).font('Helvetica-Bold')
    doc.text(`Subtotal ${fase.nombre}:`, col4, doc.y, { continued: false })
    doc.text(`$${totalFaseStr}`, col5, doc.y, { width: 80, align: 'right' })
    doc.moveDown(1.5)
    
    totalGeneral += totalFase
  })
  
  // Grand Total
  doc.moveDown(1)
  doc.moveTo(50, doc.y).lineTo(560, doc.y).stroke()
  doc.moveDown(0.5)
  
  const totalGeneralStr = totalGeneral.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  const totalY = doc.y
  
  doc.fontSize(14).font('Helvetica-Bold')
  doc.text('TOTAL GENERAL:', 320, totalY, { continued: false })
  doc.fontSize(16)
  doc.text(`$${totalGeneralStr}`, 450, totalY, { width: 110, align: 'right' })
  
  // Footer
  doc.moveDown(3)
  doc.fontSize(8).font('Helvetica').fillColor('#666666')
  doc.text('Esta cotización tiene una validez de 30 días a partir de la fecha de emisión.', { align: 'center' })
  doc.text('Los precios están sujetos a cambios sin previo aviso.', { align: 'center' })
  doc.moveDown(0.5)
  doc.text('Para cualquier aclaración, favor de contactarnos.', { align: 'center' })
  
  // Page numbers
  const pages = doc.bufferedPageRange()
  for (let i = 0; i < pages.count; i++) {
    doc.switchToPage(i)
    doc.fontSize(8).font('Helvetica').fillColor('#999999')
    doc.text(
      `Página ${i + 1} de ${pages.count}`,
      50,
      doc.page.height - 50,
      { align: 'center' }
    )
  }
  
  doc.end()
  
  return doc
}
