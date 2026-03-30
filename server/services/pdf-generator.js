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
    
    // Move down first, then draw line to ensure proper spacing
    doc.moveDown(0.3)
    const lineY = doc.y
    doc.moveTo(col1, lineY).lineTo(560, lineY).stroke()
    doc.moveDown(0.5)
    
    // Items
    let totalFase = 0
    fase.items.forEach((item, itemIndex) => {
      const cantidad = parseFloat(item.cantidadPresupuestada) || 0
      const precio = parseFloat(item.precioUnitarioEstimado) || 0
      const subtotal = cantidad * precio
      totalFase += subtotal
      
      // Check if we need a new page (leave room for item + phase total)
      if (doc.y > 680) {
        doc.addPage()
        doc.fontSize(10).font('Helvetica-Bold').fillColor('#2563EB')
        doc.text(`${fase.nombre} (continuación)`, 50, 50)
        doc.fillColor('#000000')
        doc.moveDown(1)
      }
      
      const itemY = doc.y
      
      // Format numbers without excessive decimals
      const cantidadStr = cantidad % 1 === 0 ? cantidad.toString() : cantidad.toFixed(2)
      const precioStr = precio.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
      const subtotalStr = subtotal.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
      
      doc.fontSize(8).font('Helvetica')
      
      // Calculate height of wrapped text with full description
      const itemText = `${itemIndex + 1}. ${item.articuloNombre}`
      const itemHeight = doc.heightOfString(itemText, { width: 220 })
      
      // Save current Y position
      const startY = doc.y
      
      // Write item name with wrapping (this will advance doc.y)
      doc.text(itemText, col1, startY, { width: 220 })
      
      // Write other columns at the ORIGINAL Y position
      doc.text(cantidadStr, col2, startY, { width: 60, align: 'right' })
      doc.text(item.unidad || 'pza', col3, startY, { width: 40, align: 'left' })
      doc.text(`$${precioStr}`, col4, startY, { width: 70, align: 'right' })
      doc.text(`$${subtotalStr}`, col5, startY, { width: 80, align: 'right' })
      
      // Set Y position to after the wrapped text with padding
      doc.y = startY + itemHeight + 10
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
  
  // IVA and Grand Total with Tax
  doc.moveDown(1)
  const subtotalBeforeIVA = totalGeneral
  const iva = totalGeneral * 0.16
  const totalConIVA = totalGeneral + iva
  
  const ivaY = doc.y
  doc.fontSize(12).font('Helvetica')
  doc.text('Subtotal:', 380, ivaY)
  doc.text(`$${subtotalBeforeIVA.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 450, ivaY, { width: 110, align: 'right' })
  
  doc.text('IVA (16%):', 380, ivaY + 20)
  doc.text(`$${iva.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 450, ivaY + 20, { width: 110, align: 'right' })
  
  doc.fontSize(14).font('Helvetica-Bold')
  doc.text('TOTAL CON IVA:', 320, ivaY + 45)
  doc.fontSize(16)
  doc.text(`$${totalConIVA.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 450, ivaY + 45, { width: 110, align: 'right' })
  
  // Footer
  doc.moveDown(3)
  doc.fontSize(8).font('Helvetica').fillColor('#666666')
  doc.text('Esta cotización tiene una validez de 30 días a partir de la fecha de emisión.', { align: 'center' })
  doc.text('Los precios están sujetos a cambios sin previo aviso.', { align: 'center' })
  doc.moveDown(0.5)
  doc.text('Para cualquier aclaración, favor de contactarnos.', { align: 'center' })
  
  doc.end()
  
  return doc
}
