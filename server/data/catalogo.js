// Catálogo Maestro de Artículos de Construcción
// Estructura estandarizada para evitar duplicados y permitir comparación de precios

export const categorias = [
  { id: 'acero', nombre: 'Acero y Metales', icon: '🔩' },
  { id: 'cemento', nombre: 'Cemento y Mortero', icon: '🧱' },
  { id: 'agregados', nombre: 'Agregados', icon: '�ite' },
  { id: 'concreto', nombre: 'Concreto', icon: '🏗️' },
  { id: 'block', nombre: 'Block y Tabique', icon: '🧱' },
  { id: 'tuberias', nombre: 'Tuberías', icon: '🔧' },
  { id: 'plomeria', nombre: 'Plomería', icon: '🚿' },
  { id: 'electrico', nombre: 'Eléctrico', icon: '⚡' },
  { id: 'madera', nombre: 'Madera y Cimbra', icon: '🪵' },
  { id: 'impermeabilizante', nombre: 'Impermeabilizantes', icon: '💧' },
  { id: 'pintura', nombre: 'Pintura y Acabados', icon: '🎨' },
  { id: 'pisos', nombre: 'Pisos y Azulejos', icon: '🔲' },
  { id: 'herreria', nombre: 'Herrería', icon: '⚙️' },
  { id: 'ferreteria', nombre: 'Ferretería', icon: '🔧' },
  { id: 'herramientas', nombre: 'Herramientas', icon: '🔨' },
  { id: 'maquinaria', nombre: 'Maquinaria y Equipo', icon: '🚜' },
  { id: 'seguridad', nombre: 'Seguridad Industrial', icon: '🦺' },
  { id: 'otros', nombre: 'Otros', icon: '📦' }
]

export const unidades = [
  // Peso
  { id: 'ton', nombre: 'Tonelada', abrev: 'ton' },
  { id: 'kg', nombre: 'Kilogramo', abrev: 'kg' },
  { id: 'g', nombre: 'Gramo', abrev: 'g' },
  { id: 'mg', nombre: 'Miligramo', abrev: 'mg' },
  { id: 'lb', nombre: 'Libra', abrev: 'lb' },
  
  // Volumen - Líquidos
  { id: 'l', nombre: 'Litro', abrev: 'L' },
  { id: 'ml', nombre: 'Mililitro', abrev: 'mL' },
  { id: 'cl', nombre: 'Centilitro', abrev: 'cL' },
  { id: 'gal', nombre: 'Galón', abrev: 'gal' },
  { id: 'cubeta', nombre: 'Cubeta', abrev: 'cub' },
  { id: 'tambo', nombre: 'Tambo', abrev: 'tambo' },
  
  // Longitud
  { id: 'm', nombre: 'Metro lineal', abrev: 'm' },
  { id: 'cm', nombre: 'Centímetro', abrev: 'cm' },
  { id: 'mm', nombre: 'Milímetro', abrev: 'mm' },
  { id: 'km', nombre: 'Kilómetro', abrev: 'km' },
  { id: 'pulg', nombre: 'Pulgada', abrev: 'in' },
  { id: 'pie', nombre: 'Pie', abrev: 'ft' },
  
  // Área
  { id: 'm2', nombre: 'Metro cuadrado', abrev: 'm²' },
  { id: 'cm2', nombre: 'Centímetro cuadrado', abrev: 'cm²' },
  { id: 'ha', nombre: 'Hectárea', abrev: 'ha' },
  
  // Volumen - Sólidos
  { id: 'm3', nombre: 'Metro cúbico', abrev: 'm³' },
  { id: 'cm3', nombre: 'Centímetro cúbico', abrev: 'cm³' },
  
  // Unidades de empaque
  { id: 'pza', nombre: 'Pieza', abrev: 'pza' },
  { id: 'bulto', nombre: 'Bulto', abrev: 'bto' },
  { id: 'saco', nombre: 'Saco', abrev: 'saco' },
  { id: 'rollo', nombre: 'Rollo', abrev: 'rollo' },
  { id: 'caja', nombre: 'Caja', abrev: 'caja' },
  { id: 'paquete', nombre: 'Paquete', abrev: 'paq' },
  { id: 'costal', nombre: 'Costal', abrev: 'costal' },
  { id: 'bote', nombre: 'Bote', abrev: 'bote' },
  
  // Conteo
  { id: 'millar', nombre: 'Millar', abrev: 'mill' },
  { id: 'ciento', nombre: 'Ciento', abrev: 'cto' },
  { id: 'docena', nombre: 'Docena', abrev: 'doz' },
  { id: 'juego', nombre: 'Juego', abrev: 'jgo' },
  { id: 'par', nombre: 'Par', abrev: 'par' },
  { id: 'lote', nombre: 'Lote', abrev: 'lote' },
  
  // Servicios y tiempo
  { id: 'viaje', nombre: 'Viaje', abrev: 'viaje' },
  { id: 'hr', nombre: 'Hora', abrev: 'hr' },
  { id: 'dia', nombre: 'Día', abrev: 'día' },
  { id: 'semana', nombre: 'Semana', abrev: 'sem' },
  { id: 'mes', nombre: 'Mes', abrev: 'mes' },
  { id: 'servicio', nombre: 'Servicio', abrev: 'srv' }
]

// Catálogo pre-poblado con artículos comunes de construcción
export let catalogo = [
  // ===== ACERO Y METALES =====
  { id: 1, codigo: 'VAR-3/8', nombre: 'Varilla Corrugada 3/8" (9.5mm)', categoria: 'acero', unidad: 'ton', aliases: ['varilla 3/8', 'barilla 3/8', 'fierro 3/8', 'var 3/8', 'rebar 3/8'], especificaciones: { diametro: '9.5mm', longitud: '12m' }, activo: true },
  { id: 2, codigo: 'VAR-1/2', nombre: 'Varilla Corrugada 1/2" (12.7mm)', categoria: 'acero', unidad: 'ton', aliases: ['varilla 1/2', 'barilla 1/2', 'fierro 1/2', 'var media'], especificaciones: { diametro: '12.7mm', longitud: '12m' }, activo: true },
  { id: 3, codigo: 'VAR-5/8', nombre: 'Varilla Corrugada 5/8" (15.9mm)', categoria: 'acero', unidad: 'ton', aliases: ['varilla 5/8', 'barilla 5/8', 'fierro 5/8'], especificaciones: { diametro: '15.9mm', longitud: '12m' }, activo: true },
  { id: 4, codigo: 'VAR-3/4', nombre: 'Varilla Corrugada 3/4" (19mm)', categoria: 'acero', unidad: 'ton', aliases: ['varilla 3/4', 'barilla 3/4', 'fierro 3/4'], especificaciones: { diametro: '19mm', longitud: '12m' }, activo: true },
  { id: 5, codigo: 'VAR-1', nombre: 'Varilla Corrugada 1" (25.4mm)', categoria: 'acero', unidad: 'ton', aliases: ['varilla 1', 'barilla 1 pulgada', 'fierro 1'], especificaciones: { diametro: '25.4mm', longitud: '12m' }, activo: true },
  { id: 6, codigo: 'VAR-1/4', nombre: 'Varilla Lisa 1/4" (6.4mm)', categoria: 'acero', unidad: 'kg', aliases: ['varilla lisa', 'alambrón', 'varilla delgada'], especificaciones: { diametro: '6.4mm' }, activo: true },
  { id: 7, codigo: 'ALM-REC', nombre: 'Alambre Recocido Cal. 18', categoria: 'acero', unidad: 'kg', aliases: ['alambre', 'alambre negro', 'alambre amarre', 'alambre para amarrar'], especificaciones: { calibre: '18' }, activo: true },
  { id: 8, codigo: 'ALM-GAL', nombre: 'Alambre Galvanizado Cal. 14', categoria: 'acero', unidad: 'kg', aliases: ['alambre galvanizado', 'alambre cerca'], especificaciones: { calibre: '14' }, activo: true },
  { id: 9, codigo: 'MAL-6x6', nombre: 'Malla Electrosoldada 6x6-10/10', categoria: 'acero', unidad: 'pza', aliases: ['malla 6x6', 'malla electrosoldada', 'electromalla', 'malla de acero'], especificaciones: { dimensiones: '2.5m x 6m' }, activo: true },
  { id: 10, codigo: 'MAL-6x6-8/8', nombre: 'Malla Electrosoldada 6x6-8/8', categoria: 'acero', unidad: 'pza', aliases: ['malla 6x6 gruesa', 'malla 8/8'], especificaciones: { dimensiones: '2.5m x 6m' }, activo: true },
  { id: 11, codigo: 'CAS-MET', nombre: 'Castillo Armado 10x10 4V 3/8"', categoria: 'acero', unidad: 'pza', aliases: ['castillo', 'armex', 'armado castillo'], especificaciones: { dimensiones: '10x10cm', varillas: '4' }, activo: true },
  { id: 12, codigo: 'CAS-15', nombre: 'Castillo Armado 15x15 4V 3/8"', categoria: 'acero', unidad: 'pza', aliases: ['castillo 15', 'armex 15'], especificaciones: { dimensiones: '15x15cm', varillas: '4' }, activo: true },
  { id: 13, codigo: 'EST-1/4', nombre: 'Estribos 1/4" 15x15', categoria: 'acero', unidad: 'pza', aliases: ['estribos', 'grapas', 'anillos'], especificaciones: { diametro: '1/4"' }, activo: true },
  { id: 14, codigo: 'EST-3/8', nombre: 'Estribos 3/8" 20x20', categoria: 'acero', unidad: 'pza', aliases: ['estribos gruesos', 'anillos 3/8'], especificaciones: { diametro: '3/8"' }, activo: true },
  { id: 15, codigo: 'VIG-IPR-4', nombre: 'Viga IPR 4"', categoria: 'acero', unidad: 'm', aliases: ['viga ipr', 'viga i', 'perfil ipr', 'ipr 4'], especificaciones: { peralte: '4"' }, activo: true },
  { id: 16, codigo: 'VIG-IPR-6', nombre: 'Viga IPR 6"', categoria: 'acero', unidad: 'm', aliases: ['viga ipr 6', 'ipr 6 pulgadas'], especificaciones: { peralte: '6"' }, activo: true },
  { id: 17, codigo: 'VIG-IPR-8', nombre: 'Viga IPR 8"', categoria: 'acero', unidad: 'm', aliases: ['viga ipr 8', 'ipr 8 pulgadas'], especificaciones: { peralte: '8"' }, activo: true },
  { id: 18, codigo: 'PTR-2x2', nombre: 'PTR 2x2" Cal. 14', categoria: 'acero', unidad: 'm', aliases: ['ptr', 'tubo cuadrado', 'perfil tubular'], especificaciones: { dimensiones: '2x2"' }, activo: true },
  { id: 19, codigo: 'PTR-3x3', nombre: 'PTR 3x3" Cal. 14', categoria: 'acero', unidad: 'm', aliases: ['ptr 3', 'tubo cuadrado 3'], especificaciones: { dimensiones: '3x3"' }, activo: true },
  { id: 20, codigo: 'PTR-4x4', nombre: 'PTR 4x4" Cal. 11', categoria: 'acero', unidad: 'm', aliases: ['ptr 4', 'tubo cuadrado 4'], especificaciones: { dimensiones: '4x4"' }, activo: true },
  { id: 21, codigo: 'ANG-1x1', nombre: 'Ángulo 1x1" x 1/8"', categoria: 'acero', unidad: 'm', aliases: ['angulo', 'ángulo de fierro', 'ele'], especificaciones: { dimensiones: '1x1"' }, activo: true },
  { id: 22, codigo: 'ANG-2x2', nombre: 'Ángulo 2x2" x 3/16"', categoria: 'acero', unidad: 'm', aliases: ['angulo 2', 'ele 2 pulgadas'], especificaciones: { dimensiones: '2x2"' }, activo: true },
  { id: 23, codigo: 'SOL-PTO', nombre: 'Solera 1" x 1/8"', categoria: 'acero', unidad: 'm', aliases: ['solera', 'plana', 'pletina'], especificaciones: { dimensiones: '1" x 1/8"' }, activo: true },
  { id: 24, codigo: 'LAM-NEG', nombre: 'Lámina Negra Cal. 18', categoria: 'acero', unidad: 'pza', aliases: ['lamina negra', 'placa acero', 'lamina lisa'], especificaciones: { calibre: '18' }, activo: true },
  { id: 25, codigo: 'LAM-GAL', nombre: 'Lámina Galvanizada Cal. 24', categoria: 'acero', unidad: 'pza', aliases: ['lamina galvanizada', 'lamina zinc', 'lamina gris'], especificaciones: { calibre: '24' }, activo: true },
  { id: 26, codigo: 'LAM-ACN', nombre: 'Lámina Acanalada Galv. Cal. 26', categoria: 'acero', unidad: 'pza', aliases: ['lamina acanalada', 'lamina techo', 'lamina canal'], especificaciones: { calibre: '26' }, activo: true },
  { id: 27, codigo: 'MRO-3x3', nombre: 'Monten Rojo 3x1.5" Cal. 14', categoria: 'acero', unidad: 'm', aliases: ['monten', 'monten rojo', 'perfil c'], especificaciones: {}, activo: true },
  { id: 28, codigo: 'MRO-4x2', nombre: 'Monten Rojo 4x2" Cal. 14', categoria: 'acero', unidad: 'm', aliases: ['monten 4', 'monten grande'], especificaciones: {}, activo: true },

  // ===== CEMENTO Y MORTERO =====
  { id: 50, codigo: 'CEM-GRS-50', nombre: 'Cemento Portland Gris 50kg', categoria: 'cemento', unidad: 'bulto', aliases: ['cemento gris', 'cemento portland', 'cemento 50kg', 'bulto cemento', 'saco cemento', 'cemento cruz azul', 'cemento tolteca'], especificaciones: { peso: '50kg', tipo: 'CPC 30R' }, activo: true },
  { id: 51, codigo: 'CEM-BLC-50', nombre: 'Cemento Blanco 50kg', categoria: 'cemento', unidad: 'bulto', aliases: ['cemento blanco', 'blanco 50kg'], especificaciones: { peso: '50kg' }, activo: true },
  { id: 52, codigo: 'CEM-MOR-50', nombre: 'Mortero Cemento-Arena 50kg', categoria: 'cemento', unidad: 'bulto', aliases: ['mortero', 'mortero listo', 'mezcla lista', 'morter mix'], especificaciones: { peso: '50kg' }, activo: true },
  { id: 53, codigo: 'CEM-PEG-20', nombre: 'Pegamento p/Block 20kg', categoria: 'cemento', unidad: 'bulto', aliases: ['pegablock', 'pegazulejo', 'adhesivo block', 'pegamento block'], especificaciones: { peso: '20kg' }, activo: true },
  { id: 54, codigo: 'CAL-HID-25', nombre: 'Cal Hidratada 25kg', categoria: 'cemento', unidad: 'bulto', aliases: ['cal', 'cal hidratada', 'cal apagada', 'cal viva'], especificaciones: { peso: '25kg' }, activo: true },
  { id: 55, codigo: 'YSO-50', nombre: 'Yeso Construcción 40kg', categoria: 'cemento', unidad: 'bulto', aliases: ['yeso', 'yeso pared', 'yeso blanco'], especificaciones: { peso: '40kg' }, activo: true },
  { id: 56, codigo: 'CEM-RAP', nombre: 'Cemento Rápido 10kg', categoria: 'cemento', unidad: 'bulto', aliases: ['cemento rapido', 'cemento instantaneo', 'rapi-set'], especificaciones: { peso: '10kg' }, activo: true },
  { id: 57, codigo: 'GRT-BCO', nombre: 'Grout Blanco 10kg', categoria: 'cemento', unidad: 'bulto', aliases: ['grout', 'lechada', 'junteador', 'boquilla blanca'], especificaciones: { peso: '10kg' }, activo: true },
  { id: 58, codigo: 'GRT-GRS', nombre: 'Grout Gris 10kg', categoria: 'cemento', unidad: 'bulto', aliases: ['grout gris', 'boquilla gris'], especificaciones: { peso: '10kg' }, activo: true },

  // ===== AGREGADOS =====
  { id: 70, codigo: 'ARN-RIO', nombre: 'Arena de Río', categoria: 'agregados', unidad: 'm3', aliases: ['arena', 'arena rio', 'arena fina', 'arena para mezcla', 'arena lavada'], especificaciones: {}, activo: true },
  { id: 71, codigo: 'ARN-TRT', nombre: 'Arena Triturada', categoria: 'agregados', unidad: 'm3', aliases: ['arena triturada', 'arena de banco', 'arena gruesa'], especificaciones: {}, activo: true },
  { id: 72, codigo: 'GRV-3/4', nombre: 'Grava 3/4"', categoria: 'agregados', unidad: 'm3', aliases: ['grava', 'grava 3/4', 'piedra 3/4', 'gravilla', 'grava triturada'], especificaciones: { tamaño: '3/4"' }, activo: true },
  { id: 73, codigo: 'GRV-1/2', nombre: 'Grava 1/2"', categoria: 'agregados', unidad: 'm3', aliases: ['grava 1/2', 'grava media', 'piedra 1/2', 'gravilla fina'], especificaciones: { tamaño: '1/2"' }, activo: true },
  { id: 74, codigo: 'GRV-1', nombre: 'Grava 1"', categoria: 'agregados', unidad: 'm3', aliases: ['grava 1 pulgada', 'piedra 1'], especificaciones: { tamaño: '1"' }, activo: true },
  { id: 75, codigo: 'PDR-BAS', nombre: 'Base Triturada', categoria: 'agregados', unidad: 'm3', aliases: ['base', 'base triturada', 'material base', 'sub-base'], especificaciones: {}, activo: true },
  { id: 76, codigo: 'TPC-COM', nombre: 'Tepetate Compactable', categoria: 'agregados', unidad: 'm3', aliases: ['tepetate', 'material compactable', 'relleno'], especificaciones: {}, activo: true },
  { id: 77, codigo: 'PDR-BLA', nombre: 'Piedra Blanca Decorativa', categoria: 'agregados', unidad: 'm3', aliases: ['piedra blanca', 'grava blanca', 'piedra decorativa', 'marmolina'], especificaciones: {}, activo: true },
  { id: 78, codigo: 'TZT-VOL', nombre: 'Tezontle Volcánico', categoria: 'agregados', unidad: 'm3', aliases: ['tezontle', 'piedra roja', 'volcánica'], especificaciones: {}, activo: true },

  // ===== CONCRETO =====
  { id: 90, codigo: 'CON-150', nombre: 'Concreto Premezclado f\'c=150', categoria: 'concreto', unidad: 'm3', aliases: ['concreto 150', 'premezclado 150', 'revoltura 150'], especificaciones: { resistencia: '150 kg/cm²' }, activo: true },
  { id: 91, codigo: 'CON-200', nombre: 'Concreto Premezclado f\'c=200', categoria: 'concreto', unidad: 'm3', aliases: ['concreto 200', 'premezclado 200', 'revoltura 200'], especificaciones: { resistencia: '200 kg/cm²' }, activo: true },
  { id: 92, codigo: 'CON-250', nombre: 'Concreto Premezclado f\'c=250', categoria: 'concreto', unidad: 'm3', aliases: ['concreto 250', 'premezclado 250', 'revoltura 250'], especificaciones: { resistencia: '250 kg/cm²' }, activo: true },
  { id: 93, codigo: 'CON-300', nombre: 'Concreto Premezclado f\'c=300', categoria: 'concreto', unidad: 'm3', aliases: ['concreto 300', 'premezclado 300'], especificaciones: { resistencia: '300 kg/cm²' }, activo: true },
  { id: 94, codigo: 'CON-BOM', nombre: 'Servicio de Bombeo Concreto', categoria: 'concreto', unidad: 'm3', aliases: ['bombeo', 'bomba concreto', 'servicio bombeo'], especificaciones: {}, activo: true },
  { id: 95, codigo: 'ADT-PLT', nombre: 'Aditivo Plastificante', categoria: 'concreto', unidad: 'l', aliases: ['plastificante', 'aditivo concreto', 'fluidificante'], especificaciones: {}, activo: true },
  { id: 96, codigo: 'ADT-ACL', nombre: 'Aditivo Acelerante', categoria: 'concreto', unidad: 'l', aliases: ['acelerante', 'aditivo rapido'], especificaciones: {}, activo: true },
  { id: 97, codigo: 'FBR-PPL', nombre: 'Fibra de Polipropileno', categoria: 'concreto', unidad: 'kg', aliases: ['fibra', 'fibra polipropileno', 'fibra concreto'], especificaciones: {}, activo: true },

  // ===== BLOCK Y TABIQUE =====
  { id: 110, codigo: 'BLK-15', nombre: 'Block 15x20x40 Hueco', categoria: 'block', unidad: 'pza', aliases: ['block', 'block 15', 'block hueco', 'bloque'], especificaciones: { dimensiones: '15x20x40cm' }, activo: true },
  { id: 111, codigo: 'BLK-12', nombre: 'Block 12x20x40 Hueco', categoria: 'block', unidad: 'pza', aliases: ['block 12', 'block delgado'], especificaciones: { dimensiones: '12x20x40cm' }, activo: true },
  { id: 112, codigo: 'BLK-20', nombre: 'Block 20x20x40 Hueco', categoria: 'block', unidad: 'pza', aliases: ['block 20', 'block grueso'], especificaciones: { dimensiones: '20x20x40cm' }, activo: true },
  { id: 113, codigo: 'BLK-SOL', nombre: 'Block 15x20x40 Sólido', categoria: 'block', unidad: 'pza', aliases: ['block solido', 'block macizo', 'block relleno'], especificaciones: { dimensiones: '15x20x40cm' }, activo: true },
  { id: 114, codigo: 'TAB-ROJ', nombre: 'Tabique Rojo Recocido', categoria: 'block', unidad: 'millar', aliases: ['tabique', 'tabique rojo', 'ladrillo', 'ladrillo rojo', 'tabicon'], especificaciones: { dimensiones: '6x12x24cm' }, activo: true },
  { id: 115, codigo: 'TAB-LIG', nombre: 'Tabique Ligero 12x20x40', categoria: 'block', unidad: 'pza', aliases: ['tabique ligero', 'block ligero', 'siporex'], especificaciones: { dimensiones: '12x20x40cm' }, activo: true },
  { id: 116, codigo: 'TAC-NEG', nombre: 'Tabicón Negro 7x14x28', categoria: 'block', unidad: 'pza', aliases: ['tabicon', 'tabicon negro', 'tabique negro'], especificaciones: { dimensiones: '7x14x28cm' }, activo: true },
  { id: 117, codigo: 'CEL-14', nombre: 'Celosía Calada 14x14x28', categoria: 'block', unidad: 'pza', aliases: ['celosia', 'calado', 'block calado', 'ventila'], especificaciones: {}, activo: true },
  { id: 118, codigo: 'ADQ-10', nombre: 'Adoquín Rojo 10x20x6', categoria: 'block', unidad: 'pza', aliases: ['adoquin', 'adopasto', 'paver'], especificaciones: { dimensiones: '10x20x6cm' }, activo: true },
  { id: 119, codigo: 'FAC-7', nombre: 'Fachaleta 7x24cm', categoria: 'block', unidad: 'pza', aliases: ['fachaleta', 'ladrillo cara', 'ladrillo aparente'], especificaciones: {}, activo: true },

  // ===== TUBERÍAS =====
  { id: 130, codigo: 'PVC-SAN-2', nombre: 'Tubo PVC Sanitario 2"', categoria: 'tuberias', unidad: 'm', aliases: ['tubo pvc 2', 'pvc 2 pulgadas', 'tubo sanitario 2', 'drenaje 2'], especificaciones: { diametro: '2"' }, activo: true },
  { id: 131, codigo: 'PVC-SAN-3', nombre: 'Tubo PVC Sanitario 3"', categoria: 'tuberias', unidad: 'm', aliases: ['tubo pvc 3', 'pvc 3 pulgadas', 'tubo sanitario 3'], especificaciones: { diametro: '3"' }, activo: true },
  { id: 132, codigo: 'PVC-SAN-4', nombre: 'Tubo PVC Sanitario 4"', categoria: 'tuberias', unidad: 'm', aliases: ['tubo pvc 4', 'pvc 4 pulgadas', 'tubo drenaje', 'tubo sanitario 4'], especificaciones: { diametro: '4"' }, activo: true },
  { id: 133, codigo: 'PVC-SAN-6', nombre: 'Tubo PVC Sanitario 6"', categoria: 'tuberias', unidad: 'm', aliases: ['tubo pvc 6', 'pvc 6 pulgadas', 'tubo sanitario 6'], especificaciones: { diametro: '6"' }, activo: true },
  { id: 134, codigo: 'PVC-HID-1/2', nombre: 'Tubo PVC Hidráulico 1/2"', categoria: 'tuberias', unidad: 'm', aliases: ['tubo hidraulico 1/2', 'pvc hidraulico', 'tubo agua 1/2'], especificaciones: { diametro: '1/2"' }, activo: true },
  { id: 135, codigo: 'PVC-HID-3/4', nombre: 'Tubo PVC Hidráulico 3/4"', categoria: 'tuberias', unidad: 'm', aliases: ['tubo hidraulico 3/4', 'tubo agua 3/4'], especificaciones: { diametro: '3/4"' }, activo: true },
  { id: 136, codigo: 'PVC-HID-1', nombre: 'Tubo PVC Hidráulico 1"', categoria: 'tuberias', unidad: 'm', aliases: ['tubo hidraulico 1', 'tubo agua 1'], especificaciones: { diametro: '1"' }, activo: true },
  { id: 137, codigo: 'CPVC-1/2', nombre: 'Tubo CPVC 1/2" Agua Caliente', categoria: 'tuberias', unidad: 'm', aliases: ['cpvc 1/2', 'tubo agua caliente', 'cpvc'], especificaciones: { diametro: '1/2"' }, activo: true },
  { id: 138, codigo: 'CPVC-3/4', nombre: 'Tubo CPVC 3/4" Agua Caliente', categoria: 'tuberias', unidad: 'm', aliases: ['cpvc 3/4', 'agua caliente 3/4'], especificaciones: { diametro: '3/4"' }, activo: true },
  { id: 139, codigo: 'TUB-GAL-1/2', nombre: 'Tubo Galvanizado 1/2"', categoria: 'tuberias', unidad: 'm', aliases: ['galvanizado 1/2', 'tubo fierro 1/2'], especificaciones: { diametro: '1/2"' }, activo: true },
  { id: 140, codigo: 'TUB-GAL-3/4', nombre: 'Tubo Galvanizado 3/4"', categoria: 'tuberias', unidad: 'm', aliases: ['galvanizado 3/4', 'tubo fierro 3/4'], especificaciones: { diametro: '3/4"' }, activo: true },
  { id: 141, codigo: 'TUB-GAL-1', nombre: 'Tubo Galvanizado 1"', categoria: 'tuberias', unidad: 'm', aliases: ['galvanizado 1', 'tubo fierro 1'], especificaciones: { diametro: '1"' }, activo: true },
  { id: 142, codigo: 'TUB-GAL-2', nombre: 'Tubo Galvanizado 2"', categoria: 'tuberias', unidad: 'm', aliases: ['galvanizado 2', 'tubo fierro 2'], especificaciones: { diametro: '2"' }, activo: true },
  { id: 143, codigo: 'TUB-COB-1/2', nombre: 'Tubo Cobre Tipo M 1/2"', categoria: 'tuberias', unidad: 'm', aliases: ['tubo cobre 1/2', 'cobre 1/2', 'cobre tipo m'], especificaciones: { diametro: '1/2"' }, activo: true },
  { id: 144, codigo: 'TUB-COB-3/4', nombre: 'Tubo Cobre Tipo M 3/4"', categoria: 'tuberias', unidad: 'm', aliases: ['tubo cobre 3/4', 'cobre 3/4'], especificaciones: { diametro: '3/4"' }, activo: true },
  { id: 145, codigo: 'MAN-PVC', nombre: 'Manguera Cristal PVC 1/2"', categoria: 'tuberias', unidad: 'm', aliases: ['manguera', 'manguera cristal', 'manguera transparente'], especificaciones: {}, activo: true },
  { id: 146, codigo: 'MAN-JAR', nombre: 'Manguera para Jardín 3/4"', categoria: 'tuberias', unidad: 'm', aliases: ['manguera jardin', 'manguera verde'], especificaciones: {}, activo: true },

  // ===== PLOMERÍA =====
  { id: 160, codigo: 'COD-PVC-2', nombre: 'Codo PVC Sanitario 2" x 90°', categoria: 'plomeria', unidad: 'pza', aliases: ['codo 2', 'codo pvc 2', 'codo sanitario'], especificaciones: {}, activo: true },
  { id: 161, codigo: 'COD-PVC-4', nombre: 'Codo PVC Sanitario 4" x 90°', categoria: 'plomeria', unidad: 'pza', aliases: ['codo 4', 'codo pvc 4', 'codo drenaje'], especificaciones: {}, activo: true },
  { id: 162, codigo: 'TEE-PVC-2', nombre: 'Tee PVC Sanitario 2"', categoria: 'plomeria', unidad: 'pza', aliases: ['tee 2', 'te pvc', 't pvc 2'], especificaciones: {}, activo: true },
  { id: 163, codigo: 'TEE-PVC-4', nombre: 'Tee PVC Sanitario 4"', categoria: 'plomeria', unidad: 'pza', aliases: ['tee 4', 'te pvc 4', 't pvc 4'], especificaciones: {}, activo: true },
  { id: 164, codigo: 'YEE-PVC-4', nombre: 'Yee PVC Sanitario 4x2"', categoria: 'plomeria', unidad: 'pza', aliases: ['yee', 'y pvc', 'ye sanitario'], especificaciones: {}, activo: true },
  { id: 165, codigo: 'SIF-PVC-2', nombre: 'Sifón PVC 2"', categoria: 'plomeria', unidad: 'pza', aliases: ['sifon', 'trampa', 'sifon lavabo'], especificaciones: {}, activo: true },
  { id: 166, codigo: 'RED-PVC', nombre: 'Reducción PVC 4x2"', categoria: 'plomeria', unidad: 'pza', aliases: ['reduccion', 'reductor pvc', 'reduccion sanitaria'], especificaciones: {}, activo: true },
  { id: 167, codigo: 'COP-PVC-2', nombre: 'Cople PVC Sanitario 2"', categoria: 'plomeria', unidad: 'pza', aliases: ['cople', 'copla', 'union pvc'], especificaciones: {}, activo: true },
  { id: 168, codigo: 'WC-ECOL', nombre: 'WC Económico Blanco', categoria: 'plomeria', unidad: 'pza', aliases: ['wc', 'taza baño', 'inodoro', 'sanitario'], especificaciones: {}, activo: true },
  { id: 169, codigo: 'WC-ALRG', nombre: 'WC Alargado Blanco', categoria: 'plomeria', unidad: 'pza', aliases: ['wc alargado', 'taza alargada', 'inodoro alargado'], especificaciones: {}, activo: true },
  { id: 170, codigo: 'LAV-PED', nombre: 'Lavabo de Pedestal Blanco', categoria: 'plomeria', unidad: 'pza', aliases: ['lavabo', 'lavamanos', 'lavabo pedestal'], especificaciones: {}, activo: true },
  { id: 171, codigo: 'LAV-SOB', nombre: 'Lavabo Sobreponer Blanco', categoria: 'plomeria', unidad: 'pza', aliases: ['lavabo sobreponer', 'lavamanos sobre'], especificaciones: {}, activo: true },
  { id: 172, codigo: 'FRG-DOS', nombre: 'Fregadero Doble Tarja Acero', categoria: 'plomeria', unidad: 'pza', aliases: ['fregadero', 'tarja', 'fregadero doble', 'tarja cocina'], especificaciones: {}, activo: true },
  { id: 173, codigo: 'REG-5x5', nombre: 'Registro PVC 5x5"', categoria: 'plomeria', unidad: 'pza', aliases: ['registro', 'caja registro', 'registro pvc'], especificaciones: {}, activo: true },
  { id: 174, codigo: 'LLV-ESF', nombre: 'Llave Esfera 1/2"', categoria: 'plomeria', unidad: 'pza', aliases: ['llave esfera', 'llave bola', 'llave paso'], especificaciones: {}, activo: true },
  { id: 175, codigo: 'LLV-ANG', nombre: 'Llave Angular Cromada', categoria: 'plomeria', unidad: 'pza', aliases: ['llave angular', 'llave escuadra', 'angular cromada'], especificaciones: {}, activo: true },
  { id: 176, codigo: 'MZC-LAV', nombre: 'Mezcladora para Lavabo', categoria: 'plomeria', unidad: 'pza', aliases: ['mezcladora', 'llave lavabo', 'grifo'], especificaciones: {}, activo: true },
  { id: 177, codigo: 'REG-LAT', nombre: 'Regadera Latón Cromada', categoria: 'plomeria', unidad: 'pza', aliases: ['regadera', 'ducha', 'regadera latón'], especificaciones: {}, activo: true },
  { id: 178, codigo: 'TIN-110', nombre: 'Tinaco 1100 Litros', categoria: 'plomeria', unidad: 'pza', aliases: ['tinaco', 'tinaco rotoplas', 'tinaco 1100'], especificaciones: { capacidad: '1100L' }, activo: true },
  { id: 179, codigo: 'TIN-450', nombre: 'Tinaco 450 Litros', categoria: 'plomeria', unidad: 'pza', aliases: ['tinaco 450', 'tinaco chico'], especificaciones: { capacidad: '450L' }, activo: true },
  { id: 180, codigo: 'BOL-WC', nombre: 'Boiler de Paso Gas 6L', categoria: 'plomeria', unidad: 'pza', aliases: ['boiler', 'calentador', 'calentador de paso', 'boiler gas'], especificaciones: { capacidad: '6L' }, activo: true },

  // ===== ELÉCTRICO =====
  { id: 200, codigo: 'CAB-12', nombre: 'Cable THW Cal. 12', categoria: 'electrico', unidad: 'm', aliases: ['cable 12', 'cable thw 12', 'alambre 12', 'cable electrico 12'], especificaciones: { calibre: '12 AWG' }, activo: true },
  { id: 201, codigo: 'CAB-14', nombre: 'Cable THW Cal. 14', categoria: 'electrico', unidad: 'm', aliases: ['cable 14', 'cable thw 14', 'alambre 14'], especificaciones: { calibre: '14 AWG' }, activo: true },
  { id: 202, codigo: 'CAB-10', nombre: 'Cable THW Cal. 10', categoria: 'electrico', unidad: 'm', aliases: ['cable 10', 'cable thw 10', 'alambre 10'], especificaciones: { calibre: '10 AWG' }, activo: true },
  { id: 203, codigo: 'CAB-8', nombre: 'Cable THW Cal. 8', categoria: 'electrico', unidad: 'm', aliases: ['cable 8', 'cable thw 8'], especificaciones: { calibre: '8 AWG' }, activo: true },
  { id: 204, codigo: 'CAB-6', nombre: 'Cable THW Cal. 6', categoria: 'electrico', unidad: 'm', aliases: ['cable 6', 'cable thw 6'], especificaciones: { calibre: '6 AWG' }, activo: true },
  { id: 205, codigo: 'CAB-2/0', nombre: 'Cable THW Cal. 2/0', categoria: 'electrico', unidad: 'm', aliases: ['cable 2/0', 'cable grueso', 'cable acometida'], especificaciones: { calibre: '2/0 AWG' }, activo: true },
  { id: 206, codigo: 'CAB-POT', nombre: 'Cable Pot Duplex Cal. 18', categoria: 'electrico', unidad: 'm', aliases: ['cable pot', 'cable duplex', 'cable paralelo'], especificaciones: { calibre: '18 AWG' }, activo: true },
  { id: 207, codigo: 'TUB-COND-1/2', nombre: 'Tubo Conduit PVC 1/2"', categoria: 'electrico', unidad: 'pza', aliases: ['conduit 1/2', 'tubo electrico', 'tubo conduit'], especificaciones: { diametro: '1/2"' }, activo: true },
  { id: 208, codigo: 'TUB-COND-3/4', nombre: 'Tubo Conduit PVC 3/4"', categoria: 'electrico', unidad: 'pza', aliases: ['conduit 3/4', 'tubo conduit 3/4'], especificaciones: { diametro: '3/4"' }, activo: true },
  { id: 209, codigo: 'TUB-COND-1', nombre: 'Tubo Conduit PVC 1"', categoria: 'electrico', unidad: 'pza', aliases: ['conduit 1', 'tubo conduit 1'], especificaciones: { diametro: '1"' }, activo: true },
  { id: 210, codigo: 'TUB-FLX', nombre: 'Tubo Flexible Liquid Tight 1/2"', categoria: 'electrico', unidad: 'm', aliases: ['tubo flexible', 'liquid tight', 'flex'], especificaciones: {}, activo: true },
  { id: 211, codigo: 'CHK-2P', nombre: 'Chalupa Cuadrada 2x4"', categoria: 'electrico', unidad: 'pza', aliases: ['chalupa', 'caja electrica', 'caja rectangular'], especificaciones: {}, activo: true },
  { id: 212, codigo: 'CHK-8G', nombre: 'Chalupa Octagonal Grande', categoria: 'electrico', unidad: 'pza', aliases: ['chalupa octagonal', 'caja octagonal', 'caja foco'], especificaciones: {}, activo: true },
  { id: 213, codigo: 'CNT-CEN', nombre: 'Centro de Carga 2 Polos', categoria: 'electrico', unidad: 'pza', aliases: ['centro carga', 'tablero', 'interruptor principal'], especificaciones: { polos: '2' }, activo: true },
  { id: 214, codigo: 'CNT-4P', nombre: 'Centro de Carga 4 Polos', categoria: 'electrico', unidad: 'pza', aliases: ['centro carga 4', 'tablero 4'], especificaciones: { polos: '4' }, activo: true },
  { id: 215, codigo: 'INT-TRM-15', nombre: 'Interruptor Termomagnético 15A', categoria: 'electrico', unidad: 'pza', aliases: ['termico 15', 'interruptor 15', 'pastilla 15'], especificaciones: { amperes: '15A' }, activo: true },
  { id: 216, codigo: 'INT-TRM-20', nombre: 'Interruptor Termomagnético 20A', categoria: 'electrico', unidad: 'pza', aliases: ['termico 20', 'interruptor 20', 'pastilla 20'], especificaciones: { amperes: '20A' }, activo: true },
  { id: 217, codigo: 'INT-TRM-30', nombre: 'Interruptor Termomagnético 30A', categoria: 'electrico', unidad: 'pza', aliases: ['termico 30', 'interruptor 30', 'pastilla 30'], especificaciones: { amperes: '30A' }, activo: true },
  { id: 218, codigo: 'APG-SEN', nombre: 'Apagador Sencillo', categoria: 'electrico', unidad: 'pza', aliases: ['apagador', 'switch', 'interruptor luz'], especificaciones: {}, activo: true },
  { id: 219, codigo: 'APG-DOB', nombre: 'Apagador Doble', categoria: 'electrico', unidad: 'pza', aliases: ['apagador doble', 'switch doble'], especificaciones: {}, activo: true },
  { id: 220, codigo: 'APG-TRE', nombre: 'Apagador de 3 Vías', categoria: 'electrico', unidad: 'pza', aliases: ['apagador 3 vias', 'switch escalera', 'de escalera'], especificaciones: {}, activo: true },
  { id: 221, codigo: 'CON-DUP', nombre: 'Contacto Dúplex Polarizado', categoria: 'electrico', unidad: 'pza', aliases: ['contacto', 'enchufe', 'toma corriente', 'receptaculo'], especificaciones: {}, activo: true },
  { id: 222, codigo: 'PLC-APG', nombre: 'Placa para Apagador', categoria: 'electrico', unidad: 'pza', aliases: ['placa', 'tapa apagador', 'placa apagador'], especificaciones: {}, activo: true },
  { id: 223, codigo: 'SOC-POR', nombre: 'Socket de Porcelana', categoria: 'electrico', unidad: 'pza', aliases: ['socket', 'porta foco', 'base foco'], especificaciones: {}, activo: true },
  { id: 224, codigo: 'LAM-LED-18', nombre: 'Lámpara LED Tubo 18W', categoria: 'electrico', unidad: 'pza', aliases: ['lampara led', 'tubo led', 'foco tubo'], especificaciones: { watts: '18W' }, activo: true },
  { id: 225, codigo: 'FOC-LED-9', nombre: 'Foco LED 9W', categoria: 'electrico', unidad: 'pza', aliases: ['foco led', 'bombillo led', 'foco ahorrador'], especificaciones: { watts: '9W' }, activo: true },

  // ===== MADERA Y CIMBRA =====
  { id: 240, codigo: 'TRI-16', nombre: 'Triplay 16mm 4x8\'', categoria: 'madera', unidad: 'pza', aliases: ['triplay', 'triplay 16', 'plywood', 'triplay cimbra'], especificaciones: { espesor: '16mm' }, activo: true },
  { id: 241, codigo: 'TRI-12', nombre: 'Triplay 12mm 4x8\'', categoria: 'madera', unidad: 'pza', aliases: ['triplay 12', 'plywood 12'], especificaciones: { espesor: '12mm' }, activo: true },
  { id: 242, codigo: 'TRI-19', nombre: 'Triplay 19mm 4x8\'', categoria: 'madera', unidad: 'pza', aliases: ['triplay 19', 'plywood 19', 'triplay grueso'], especificaciones: { espesor: '19mm' }, activo: true },
  { id: 243, codigo: 'POL-4x4', nombre: 'Polín 4x4" x 2.5m', categoria: 'madera', unidad: 'pza', aliases: ['polin', 'polin 4x4', 'viga madera'], especificaciones: { dimensiones: '4x4"' }, activo: true },
  { id: 244, codigo: 'POL-2x4', nombre: 'Polín 2x4" x 2.5m', categoria: 'madera', unidad: 'pza', aliases: ['polin 2x4', 'barrote'], especificaciones: { dimensiones: '2x4"' }, activo: true },
  { id: 245, codigo: 'TAB-1x8', nombre: 'Tabla 1x8" x 2.5m', categoria: 'madera', unidad: 'pza', aliases: ['tabla', 'tabla 1x8', 'tabla cimbra', 'duela cimbra'], especificaciones: { dimensiones: '1x8"' }, activo: true },
  { id: 246, codigo: 'TAB-1x10', nombre: 'Tabla 1x10" x 2.5m', categoria: 'madera', unidad: 'pza', aliases: ['tabla 1x10', 'tabla ancha'], especificaciones: { dimensiones: '1x10"' }, activo: true },
  { id: 247, codigo: 'BAR-2x4', nombre: 'Barrote 2x4" x 2.5m', categoria: 'madera', unidad: 'pza', aliases: ['barrote', 'barrote 2x4', 'madera 2x4'], especificaciones: { dimensiones: '2x4"' }, activo: true },
  { id: 248, codigo: 'BAR-2x3', nombre: 'Barrote 2x3" x 2.5m', categoria: 'madera', unidad: 'pza', aliases: ['barrote 2x3', 'madera 2x3'], especificaciones: { dimensiones: '2x3"' }, activo: true },
  { id: 249, codigo: 'DUE-PIN', nombre: 'Duela de Pino 1x4"', categoria: 'madera', unidad: 'm', aliases: ['duela', 'duela pino', 'madera piso'], especificaciones: {}, activo: true },
  { id: 250, codigo: 'TAB-CED', nombre: 'Tabla Cedro 1x8"', categoria: 'madera', unidad: 'pza', aliases: ['tabla cedro', 'cedro', 'madera cedro'], especificaciones: {}, activo: true },
  { id: 251, codigo: 'PNL-YSO', nombre: 'Panel de Yeso 1/2" 4x8\'', categoria: 'madera', unidad: 'pza', aliases: ['panel yeso', 'tablaroca', 'drywall', 'sheetrock'], especificaciones: { espesor: '1/2"' }, activo: true },
  { id: 252, codigo: 'PNL-YSO-RH', nombre: 'Panel de Yeso RH 1/2" 4x8\'', categoria: 'madera', unidad: 'pza', aliases: ['tablaroca rh', 'panel verde', 'drywall humedad'], especificaciones: { espesor: '1/2"', tipo: 'Resistente humedad' }, activo: true },
  { id: 253, codigo: 'CAN-TAB', nombre: 'Canal Tablaroca 3 5/8"', categoria: 'madera', unidad: 'm', aliases: ['canal tablaroca', 'canal metal', 'canal techo'], especificaciones: {}, activo: true },
  { id: 254, codigo: 'POT-TAB', nombre: 'Poste Tablaroca 3 5/8"', categoria: 'madera', unidad: 'm', aliases: ['poste tablaroca', 'montante', 'stud'], especificaciones: {}, activo: true },

  // ===== IMPERMEABILIZANTES =====
  { id: 270, codigo: 'IMP-3A-19', nombre: 'Impermeabilizante 3 Años 19L', categoria: 'impermeabilizante', unidad: 'cubeta', aliases: ['impermeabilizante', 'impermeabilizante 3 años', 'imper 19l'], especificaciones: { garantia: '3 años' }, activo: true },
  { id: 271, codigo: 'IMP-5A-19', nombre: 'Impermeabilizante 5 Años 19L', categoria: 'impermeabilizante', unidad: 'cubeta', aliases: ['impermeabilizante 5 años', 'imper 5 años'], especificaciones: { garantia: '5 años' }, activo: true },
  { id: 272, codigo: 'IMP-10A-19', nombre: 'Impermeabilizante 10 Años 19L', categoria: 'impermeabilizante', unidad: 'cubeta', aliases: ['impermeabilizante 10 años', 'imper 10 años'], especificaciones: { garantia: '10 años' }, activo: true },
  { id: 273, codigo: 'FLT-ASF', nombre: 'Fieltro Asfáltico #15', categoria: 'impermeabilizante', unidad: 'rollo', aliases: ['fieltro', 'fieltro asfaltico', 'papel asfaltico'], especificaciones: {}, activo: true },
  { id: 274, codigo: 'MEM-ASF', nombre: 'Membrana Asfáltica 3mm', categoria: 'impermeabilizante', unidad: 'rollo', aliases: ['membrana', 'membrana asfaltica', 'manto asfaltico'], especificaciones: { espesor: '3mm' }, activo: true },
  { id: 275, codigo: 'PRM-ASF', nombre: 'Primer Asfáltico', categoria: 'impermeabilizante', unidad: 'l', aliases: ['primer', 'primario asfaltico', 'emulsion asfaltica'], especificaciones: {}, activo: true },
  { id: 276, codigo: 'SEL-POL', nombre: 'Sellador de Poliuretano 300ml', categoria: 'impermeabilizante', unidad: 'pza', aliases: ['sellador', 'sellador poliuretano', 'sikaflex'], especificaciones: {}, activo: true },
  { id: 277, codigo: 'SEL-SIL', nombre: 'Sellador de Silicón 280ml', categoria: 'impermeabilizante', unidad: 'pza', aliases: ['silicon', 'sellador silicon', 'silicon transparente'], especificaciones: {}, activo: true },

  // ===== PINTURA Y ACABADOS =====
  { id: 290, codigo: 'PIN-VIN-19', nombre: 'Pintura Vinílica 19L', categoria: 'pintura', unidad: 'cubeta', aliases: ['pintura vinilica', 'cubeta pintura', 'pintura 19 litros', 'vinilica blanca'], especificaciones: { volumen: '19L' }, activo: true },
  { id: 291, codigo: 'PIN-VIN-4', nombre: 'Pintura Vinílica 4L', categoria: 'pintura', unidad: 'pza', aliases: ['pintura 4 litros', 'galon pintura'], especificaciones: { volumen: '4L' }, activo: true },
  { id: 292, codigo: 'PIN-ESM-4', nombre: 'Pintura Esmalte 4L', categoria: 'pintura', unidad: 'pza', aliases: ['esmalte', 'pintura esmalte', 'esmalte 4 litros'], especificaciones: { volumen: '4L' }, activo: true },
  { id: 293, codigo: 'PIN-ESM-1', nombre: 'Pintura Esmalte 1L', categoria: 'pintura', unidad: 'pza', aliases: ['esmalte 1 litro', 'esmalte litro'], especificaciones: { volumen: '1L' }, activo: true },
  { id: 294, codigo: 'PIN-ACR-19', nombre: 'Pintura Acrílica Exterior 19L', categoria: 'pintura', unidad: 'cubeta', aliases: ['pintura acrilica', 'pintura exterior', 'acrilica fachada'], especificaciones: { volumen: '19L' }, activo: true },
  { id: 295, codigo: 'PIN-ANT', nombre: 'Pintura Anticorrosiva 4L', categoria: 'pintura', unidad: 'pza', aliases: ['anticorrosivo', 'primario metal', 'pintura metal'], especificaciones: { volumen: '4L' }, activo: true },
  { id: 296, codigo: 'THN-STD', nombre: 'Thinner Estándar', categoria: 'pintura', unidad: 'l', aliases: ['thinner', 'solvente', 'adelgazador'], especificaciones: {}, activo: true },
  { id: 297, codigo: 'SEL-PAR', nombre: 'Sellador para Paredes 19L', categoria: 'pintura', unidad: 'cubeta', aliases: ['sellador paredes', 'sellador muros', 'fondo paredes'], especificaciones: { volumen: '19L' }, activo: true },
  { id: 298, codigo: 'PAS-MUR', nombre: 'Pasta para Muros 4kg', categoria: 'pintura', unidad: 'pza', aliases: ['pasta', 'pasta muros', 'plastico muros', 'resanador'], especificaciones: { peso: '4kg' }, activo: true },
  { id: 299, codigo: 'TXT-PRY', nombre: 'Textura Proyectable 25kg', categoria: 'pintura', unidad: 'bulto', aliases: ['textura', 'textura proyectada', 'acabado textura'], especificaciones: { peso: '25kg' }, activo: true },
  { id: 300, codigo: 'ROD-9', nombre: 'Rodillo 9" Felpa Media', categoria: 'pintura', unidad: 'pza', aliases: ['rodillo', 'rodillo pintar', 'rodillo 9 pulgadas'], especificaciones: {}, activo: true },
  { id: 301, codigo: 'BRO-4', nombre: 'Brocha 4"', categoria: 'pintura', unidad: 'pza', aliases: ['brocha', 'brocha 4 pulgadas'], especificaciones: {}, activo: true },
  { id: 302, codigo: 'LIJ-120', nombre: 'Lija #120', categoria: 'pintura', unidad: 'pza', aliases: ['lija', 'lija 120', 'papel lija'], especificaciones: { grano: '120' }, activo: true },
  { id: 303, codigo: 'LIJ-220', nombre: 'Lija #220', categoria: 'pintura', unidad: 'pza', aliases: ['lija 220', 'lija fina'], especificaciones: { grano: '220' }, activo: true },

  // ===== PISOS Y AZULEJOS =====
  { id: 320, codigo: 'PSO-CER-40', nombre: 'Piso Cerámico 40x40', categoria: 'pisos', unidad: 'm2', aliases: ['piso ceramico', 'ceramica piso', 'piso 40x40'], especificaciones: { dimensiones: '40x40cm' }, activo: true },
  { id: 321, codigo: 'PSO-CER-60', nombre: 'Piso Cerámico 60x60', categoria: 'pisos', unidad: 'm2', aliases: ['piso 60x60', 'ceramico 60'], especificaciones: { dimensiones: '60x60cm' }, activo: true },
  { id: 322, codigo: 'PSO-POR', nombre: 'Porcelanato 60x60', categoria: 'pisos', unidad: 'm2', aliases: ['porcelanato', 'piso porcelanato', 'porcelanico'], especificaciones: { dimensiones: '60x60cm' }, activo: true },
  { id: 323, codigo: 'AZU-20x30', nombre: 'Azulejo Blanco 20x30', categoria: 'pisos', unidad: 'm2', aliases: ['azulejo', 'azulejo blanco', 'azulejo baño'], especificaciones: { dimensiones: '20x30cm' }, activo: true },
  { id: 324, codigo: 'AZU-20x20', nombre: 'Azulejo Decorado 20x20', categoria: 'pisos', unidad: 'm2', aliases: ['azulejo decorado', 'azulejo cocina'], especificaciones: { dimensiones: '20x20cm' }, activo: true },
  { id: 325, codigo: 'MOS-VID', nombre: 'Mosaico Veneciano', categoria: 'pisos', unidad: 'm2', aliases: ['mosaico', 'veneciano', 'mosaico vidrio'], especificaciones: {}, activo: true },
  { id: 326, codigo: 'ZOC-CER', nombre: 'Zoclo Cerámico 8x40', categoria: 'pisos', unidad: 'm', aliases: ['zoclo', 'zoclo ceramico', 'rodapie'], especificaciones: {}, activo: true },
  { id: 327, codigo: 'PEG-PSO-20', nombre: 'Pegamento para Piso 20kg', categoria: 'pisos', unidad: 'bulto', aliases: ['pegapiso', 'adhesivo piso', 'pegamento azulejo'], especificaciones: { peso: '20kg' }, activo: true },
  { id: 328, codigo: 'BOQ-BCO', nombre: 'Boquilla Blanca 2kg', categoria: 'pisos', unidad: 'pza', aliases: ['boquilla', 'junteador', 'lechada piso'], especificaciones: { peso: '2kg' }, activo: true },
  { id: 329, codigo: 'CRU-PSO', nombre: 'Crucetas para Piso 3mm', categoria: 'pisos', unidad: 'caja', aliases: ['crucetas', 'separadores piso', 'espaciadores'], especificaciones: {}, activo: true },

  // ===== HERRERÍA =====
  { id: 340, codigo: 'PTN-1.2', nombre: 'Portón Corredizo 1.2m Alto', categoria: 'herreria', unidad: 'm2', aliases: ['porton', 'porton corredizo', 'puerta cochera'], especificaciones: {}, activo: true },
  { id: 341, codigo: 'PTA-MET', nombre: 'Puerta Metálica 0.90x2.10', categoria: 'herreria', unidad: 'pza', aliases: ['puerta metalica', 'puerta fierro', 'puerta lamina'], especificaciones: {}, activo: true },
  { id: 342, codigo: 'VNT-COR', nombre: 'Ventana Corrediza Aluminio', categoria: 'herreria', unidad: 'm2', aliases: ['ventana', 'ventana corrediza', 'ventana aluminio'], especificaciones: {}, activo: true },
  { id: 343, codigo: 'PRT-ALU', nombre: 'Protector Aluminio Ventana', categoria: 'herreria', unidad: 'm2', aliases: ['protector', 'reja ventana', 'proteccion ventana'], especificaciones: {}, activo: true },
  { id: 344, codigo: 'BAR-ESC', nombre: 'Barandal Escalera', categoria: 'herreria', unidad: 'm', aliases: ['barandal', 'pasamanos', 'baranda escalera'], especificaciones: {}, activo: true },
  { id: 345, codigo: 'REJ-JAR', nombre: 'Reja Jardín', categoria: 'herreria', unidad: 'm', aliases: ['reja', 'reja jardin', 'cercado'], especificaciones: {}, activo: true },

  // ===== FERRETERÍA =====
  { id: 360, codigo: 'CLV-2.5', nombre: 'Clavo 2.5" (kg)', categoria: 'ferreteria', unidad: 'kg', aliases: ['clavo', 'clavo 2.5', 'clavo 2 1/2'], especificaciones: { longitud: '2.5"' }, activo: true },
  { id: 361, codigo: 'CLV-3', nombre: 'Clavo 3" (kg)', categoria: 'ferreteria', unidad: 'kg', aliases: ['clavo 3', 'clavo 3 pulgadas'], especificaciones: { longitud: '3"' }, activo: true },
  { id: 362, codigo: 'CLV-4', nombre: 'Clavo 4" (kg)', categoria: 'ferreteria', unidad: 'kg', aliases: ['clavo 4', 'clavo largo'], especificaciones: { longitud: '4"' }, activo: true },
  { id: 363, codigo: 'CLV-CON', nombre: 'Clavo Concreto 2" (kg)', categoria: 'ferreteria', unidad: 'kg', aliases: ['clavo concreto', 'clavo negro', 'clavo acero'], especificaciones: {}, activo: true },
  { id: 364, codigo: 'TOR-MAD', nombre: 'Tornillo para Madera 2" (caja)', categoria: 'ferreteria', unidad: 'caja', aliases: ['tornillo madera', 'tornillo pija', 'pija madera'], especificaciones: {}, activo: true },
  { id: 365, codigo: 'TOR-TAB', nombre: 'Tornillo Tablaroca 1 5/8" (caja)', categoria: 'ferreteria', unidad: 'caja', aliases: ['tornillo tablaroca', 'tornillo drywall', 'tornillo panel'], especificaciones: {}, activo: true },
  { id: 366, codigo: 'TOR-ANC', nombre: 'Taquete con Tornillo 1/4"', categoria: 'ferreteria', unidad: 'pza', aliases: ['taquete', 'taquete expansion', 'ancla'], especificaciones: {}, activo: true },
  { id: 367, codigo: 'ANC-EXP', nombre: 'Ancla Expansiva 3/8"', categoria: 'ferreteria', unidad: 'pza', aliases: ['ancla', 'ancla expansion', 'perno expansion'], especificaciones: {}, activo: true },
  { id: 368, codigo: 'BIS-3', nombre: 'Bisagra 3" Par', categoria: 'ferreteria', unidad: 'pza', aliases: ['bisagra', 'bisagra 3', 'bisagra puerta'], especificaciones: {}, activo: true },
  { id: 369, codigo: 'CHP-STD', nombre: 'Chapa Entrada Estándar', categoria: 'ferreteria', unidad: 'pza', aliases: ['chapa', 'cerradura', 'chapa puerta', 'llave puerta'], especificaciones: {}, activo: true },
  { id: 370, codigo: 'CHP-SEG', nombre: 'Chapa de Seguridad', categoria: 'ferreteria', unidad: 'pza', aliases: ['chapa seguridad', 'cerradura seguridad', 'multilock'], especificaciones: {}, activo: true },
  { id: 371, codigo: 'CND-40', nombre: 'Candado 40mm', categoria: 'ferreteria', unidad: 'pza', aliases: ['candado', 'candado 40', 'candado mediano'], especificaciones: {}, activo: true },
  { id: 372, codigo: 'CIN-AIS-19', nombre: 'Cinta de Aislar 19mm', categoria: 'ferreteria', unidad: 'pza', aliases: ['cinta aislar', 'cinta electrica', 'tape'], especificaciones: {}, activo: true },
  { id: 373, codigo: 'CIN-DUC', nombre: 'Cinta Ducto (Duct Tape)', categoria: 'ferreteria', unidad: 'pza', aliases: ['cinta ducto', 'duct tape', 'cinta gris'], especificaciones: {}, activo: true },
  { id: 374, codigo: 'SIL-TUB', nombre: 'Silicón en Tubo 280ml', categoria: 'ferreteria', unidad: 'pza', aliases: ['silicon tubo', 'silicon blanco', 'sellador silicon'], especificaciones: {}, activo: true },
  { id: 375, codigo: 'ADH-5000', nombre: 'Adhesivo 5000 Usos 1L', categoria: 'ferreteria', unidad: 'pza', aliases: ['adhesivo', 'pegamento', 'resistol 5000'], especificaciones: {}, activo: true },

  // ===== HERRAMIENTAS =====
  { id: 390, codigo: 'MRT-UÑA', nombre: 'Martillo de Uña 16oz', categoria: 'herramientas', unidad: 'pza', aliases: ['martillo', 'martillo uña', 'martillo carpintero'], especificaciones: {}, activo: true },
  { id: 391, codigo: 'FLX-5M', nombre: 'Flexómetro 5m', categoria: 'herramientas', unidad: 'pza', aliases: ['flexometro', 'metro', 'cinta medir'], especificaciones: {}, activo: true },
  { id: 392, codigo: 'NVL-24', nombre: 'Nivel de Burbuja 24"', categoria: 'herramientas', unidad: 'pza', aliases: ['nivel', 'nivel burbuja', 'nivel albañil'], especificaciones: {}, activo: true },
  { id: 393, codigo: 'PLM-ALB', nombre: 'Plomada Albañil', categoria: 'herramientas', unidad: 'pza', aliases: ['plomada', 'plomo albañil'], especificaciones: {}, activo: true },
  { id: 394, codigo: 'CUC-ALB', nombre: 'Cuchara de Albañil', categoria: 'herramientas', unidad: 'pza', aliases: ['cuchara', 'cuchara albañil', 'pala albañil'], especificaciones: {}, activo: true },
  { id: 395, codigo: 'LAN-ALB', nombre: 'Llana de Acero', categoria: 'herramientas', unidad: 'pza', aliases: ['llana', 'plana', 'llana albañil'], especificaciones: {}, activo: true },
  { id: 396, codigo: 'ESP-5', nombre: 'Espátula 5"', categoria: 'herramientas', unidad: 'pza', aliases: ['espatula', 'espatula 5'], especificaciones: {}, activo: true },
  { id: 397, codigo: 'PAL-CUA', nombre: 'Pala Cuadrada', categoria: 'herramientas', unidad: 'pza', aliases: ['pala', 'pala cuadrada', 'pala construccion'], especificaciones: {}, activo: true },
  { id: 398, codigo: 'PAL-PIC', nombre: 'Pala Pico', categoria: 'herramientas', unidad: 'pza', aliases: ['pala pico', 'pala punta'], especificaciones: {}, activo: true },
  { id: 399, codigo: 'PIC-5LB', nombre: 'Pico 5 lb', categoria: 'herramientas', unidad: 'pza', aliases: ['pico', 'pico excavacion'], especificaciones: {}, activo: true },
  { id: 400, codigo: 'MRR-8LB', nombre: 'Marro 8 lb', categoria: 'herramientas', unidad: 'pza', aliases: ['marro', 'mazo', 'martillo grande'], especificaciones: {}, activo: true },
  { id: 401, codigo: 'CRT-AZU', nombre: 'Cortador de Azulejo', categoria: 'herramientas', unidad: 'pza', aliases: ['cortador azulejo', 'cortadora ceramica'], especificaciones: {}, activo: true },
  { id: 402, codigo: 'SRR-MAN', nombre: 'Serrucho Mango Madera 22"', categoria: 'herramientas', unidad: 'pza', aliases: ['serrucho', 'sierra manual', 'serrucho madera'], especificaciones: {}, activo: true },
  { id: 403, codigo: 'TAL-ELE', nombre: 'Taladro Eléctrico 1/2"', categoria: 'herramientas', unidad: 'pza', aliases: ['taladro', 'taladro electrico', 'rotomartillo'], especificaciones: {}, activo: true },
  { id: 404, codigo: 'ESM-ANG', nombre: 'Esmeriladora Angular 4.5"', categoria: 'herramientas', unidad: 'pza', aliases: ['esmeriladora', 'pulidora', 'amoladora'], especificaciones: {}, activo: true },
  { id: 405, codigo: 'SRA-CIR', nombre: 'Sierra Circular 7.25"', categoria: 'herramientas', unidad: 'pza', aliases: ['sierra circular', 'sierra electrica'], especificaciones: {}, activo: true },

  // ===== MAQUINARIA Y EQUIPO =====
  { id: 420, codigo: 'RNT-REV', nombre: 'Renta Revolvedora 1 Saco', categoria: 'maquinaria', unidad: 'dia', aliases: ['revolvedora', 'mezcladora', 'trompo'], especificaciones: {}, activo: true },
  { id: 421, codigo: 'RNT-VIB', nombre: 'Renta Vibrador Concreto', categoria: 'maquinaria', unidad: 'dia', aliases: ['vibrador', 'vibrador concreto', 'vibradora'], especificaciones: {}, activo: true },
  { id: 422, codigo: 'RNT-CMP', nombre: 'Renta Compactadora Bailarina', categoria: 'maquinaria', unidad: 'dia', aliases: ['compactadora', 'bailarina', 'apisonador'], especificaciones: {}, activo: true },
  { id: 423, codigo: 'RNT-RDL', nombre: 'Renta Rodillo Compactador', categoria: 'maquinaria', unidad: 'dia', aliases: ['rodillo', 'rodillo compactador'], especificaciones: {}, activo: true },
  { id: 424, codigo: 'RNT-AND', nombre: 'Renta Andamio (sección)', categoria: 'maquinaria', unidad: 'dia', aliases: ['andamio', 'andamio tubular'], especificaciones: {}, activo: true },
  { id: 425, codigo: 'RNT-CRT', nombre: 'Renta Carretilla', categoria: 'maquinaria', unidad: 'dia', aliases: ['carretilla', 'carrucha', 'buggy'], especificaciones: {}, activo: true },
  { id: 426, codigo: 'CRT-80L', nombre: 'Carretilla 80L', categoria: 'maquinaria', unidad: 'pza', aliases: ['carretilla compra', 'carretilla nueva'], especificaciones: { capacidad: '80L' }, activo: true },
  { id: 427, codigo: 'CUB-20L', nombre: 'Cubeta 20L', categoria: 'maquinaria', unidad: 'pza', aliases: ['cubeta', 'balde', 'cubeta albañil'], especificaciones: { capacidad: '20L' }, activo: true },
  { id: 428, codigo: 'TIN-200', nombre: 'Tinaja 200L', categoria: 'maquinaria', unidad: 'pza', aliases: ['tinaja', 'tambo', 'barril'], especificaciones: { capacidad: '200L' }, activo: true },

  // ===== SEGURIDAD INDUSTRIAL =====
  { id: 440, codigo: 'CAS-SEG', nombre: 'Casco de Seguridad', categoria: 'seguridad', unidad: 'pza', aliases: ['casco', 'casco obra', 'casco proteccion'], especificaciones: {}, activo: true },
  { id: 441, codigo: 'CHA-REF', nombre: 'Chaleco Reflejante', categoria: 'seguridad', unidad: 'pza', aliases: ['chaleco', 'chaleco reflejante', 'chaleco seguridad'], especificaciones: {}, activo: true },
  { id: 442, codigo: 'GUA-CAR', nombre: 'Guantes de Carnaza Par', categoria: 'seguridad', unidad: 'pza', aliases: ['guantes', 'guantes carnaza', 'guantes trabajo'], especificaciones: {}, activo: true },
  { id: 443, codigo: 'GUA-LAT', nombre: 'Guantes de Látex (caja)', categoria: 'seguridad', unidad: 'caja', aliases: ['guantes latex', 'guantes desechables'], especificaciones: {}, activo: true },
  { id: 444, codigo: 'GUA-NIT', nombre: 'Guantes de Nitrilo (caja)', categoria: 'seguridad', unidad: 'caja', aliases: ['guantes nitrilo', 'guantes azules'], especificaciones: {}, activo: true },
  { id: 445, codigo: 'BOT-IND', nombre: 'Botas Industriales Casquillo', categoria: 'seguridad', unidad: 'pza', aliases: ['botas', 'botas casquillo', 'botas seguridad', 'botas trabajo'], especificaciones: {}, activo: true },
  { id: 446, codigo: 'LNT-SEG', nombre: 'Lentes de Seguridad', categoria: 'seguridad', unidad: 'pza', aliases: ['lentes', 'lentes seguridad', 'gafas seguridad'], especificaciones: {}, activo: true },
  { id: 447, codigo: 'TAP-AUD', nombre: 'Tapones Auditivos (par)', categoria: 'seguridad', unidad: 'pza', aliases: ['tapones', 'tapones oido', 'proteccion auditiva'], especificaciones: {}, activo: true },
  { id: 448, codigo: 'CUB-POL', nombre: 'Cubrebocas Desechable (caja)', categoria: 'seguridad', unidad: 'caja', aliases: ['cubrebocas', 'mascarilla', 'tapabocas'], especificaciones: {}, activo: true },
  { id: 449, codigo: 'MSC-POL', nombre: 'Mascarilla para Polvo N95', categoria: 'seguridad', unidad: 'pza', aliases: ['mascarilla n95', 'respirador', 'mascarilla polvo'], especificaciones: {}, activo: true },
  { id: 450, codigo: 'ARN-SEG', nombre: 'Arnés de Seguridad', categoria: 'seguridad', unidad: 'pza', aliases: ['arnes', 'arnes seguridad', 'arnes alturas'], especificaciones: {}, activo: true },
  { id: 451, codigo: 'LIN-VID', nombre: 'Línea de Vida 15m', categoria: 'seguridad', unidad: 'pza', aliases: ['linea vida', 'cuerda seguridad'], especificaciones: { longitud: '15m' }, activo: true },
  { id: 452, codigo: 'CNT-SEG', nombre: 'Cinta de Seguridad (rollo)', categoria: 'seguridad', unidad: 'rollo', aliases: ['cinta seguridad', 'cinta peligro', 'cinta amarilla'], especificaciones: {}, activo: true },
  { id: 453, codigo: 'EXT-PQS', nombre: 'Extintor PQS 4.5kg', categoria: 'seguridad', unidad: 'pza', aliases: ['extintor', 'extinguidor', 'extintor polvo'], especificaciones: { capacidad: '4.5kg' }, activo: true },
  { id: 454, codigo: 'BOT-PRM', nombre: 'Botiquín Primeros Auxilios', categoria: 'seguridad', unidad: 'pza', aliases: ['botiquin', 'primeros auxilios', 'kit emergencia'], especificaciones: {}, activo: true }
]

// Contador para nuevos IDs
let nextId = 500

// Funciones de búsqueda
export function buscarEnCatalogo(query, limite = 10) {
  if (!query || query.length < 2) return []
  
  const queryLower = query.toLowerCase().trim()
  const palabras = queryLower.split(/\s+/)
  
  const resultados = catalogo
    .filter(item => item.activo)
    .map(item => {
      let score = 0
      const nombreLower = item.nombre.toLowerCase()
      const codigoLower = item.codigo.toLowerCase()
      
      // Coincidencia exacta en código (máxima prioridad)
      if (codigoLower === queryLower) {
        score = 100
      }
      // Código empieza con query
      else if (codigoLower.startsWith(queryLower)) {
        score = 90
      }
      // Nombre contiene query exacto
      else if (nombreLower.includes(queryLower)) {
        score = 80
      }
      // Buscar en aliases
      else {
        const aliasMatch = item.aliases.some(alias => {
          const aliasLower = alias.toLowerCase()
          if (aliasLower === queryLower) return true
          if (aliasLower.includes(queryLower)) return true
          // Fuzzy: buscar palabras individuales
          return palabras.every(p => aliasLower.includes(p))
        })
        if (aliasMatch) score = 70
      }
      
      // Búsqueda fuzzy por palabras
      if (score === 0) {
        const todasLasPalabras = [nombreLower, ...item.aliases.map(a => a.toLowerCase())].join(' ')
        const coincidencias = palabras.filter(p => todasLasPalabras.includes(p))
        if (coincidencias.length > 0) {
          score = 40 + (coincidencias.length / palabras.length) * 30
        }
      }
      
      // Levenshtein simplificado para typos
      if (score === 0) {
        const similitud = calcularSimilitud(queryLower, nombreLower)
        if (similitud > 0.6) {
          score = similitud * 50
        }
      }
      
      return { ...item, score }
    })
    .filter(item => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limite)
  
  return resultados
}

// Función simple de similitud (Dice coefficient)
function calcularSimilitud(str1, str2) {
  if (str1 === str2) return 1
  if (str1.length < 2 || str2.length < 2) return 0
  
  const bigrams1 = new Set()
  const bigrams2 = new Set()
  
  for (let i = 0; i < str1.length - 1; i++) {
    bigrams1.add(str1.substring(i, i + 2))
  }
  for (let i = 0; i < str2.length - 1; i++) {
    bigrams2.add(str2.substring(i, i + 2))
  }
  
  let intersection = 0
  bigrams1.forEach(bigram => {
    if (bigrams2.has(bigram)) intersection++
  })
  
  return (2 * intersection) / (bigrams1.size + bigrams2.size)
}

// CRUD operations
export function obtenerArticulo(id) {
  return catalogo.find(item => item.id === id)
}

export function crearArticulo(data) {
  const nuevoArticulo = {
    id: nextId++,
    codigo: data.codigo || generarCodigo(data.categoria, data.nombre),
    nombre: data.nombre,
    categoria: data.categoria,
    unidad: data.unidad,
    aliases: data.aliases || [],
    especificaciones: data.especificaciones || {},
    activo: true
  }
  catalogo.push(nuevoArticulo)
  return nuevoArticulo
}

export function actualizarArticulo(id, data) {
  const index = catalogo.findIndex(item => item.id === id)
  if (index === -1) return null
  
  catalogo[index] = { ...catalogo[index], ...data }
  return catalogo[index]
}

export function eliminarArticulo(id) {
  const index = catalogo.findIndex(item => item.id === id)
  if (index === -1) return false
  
  // Soft delete
  catalogo[index].activo = false
  return true
}

// Generar código automático
function generarCodigo(categoria, nombre) {
  const prefijos = {
    acero: 'ACR',
    cemento: 'CEM',
    agregados: 'AGR',
    concreto: 'CON',
    block: 'BLK',
    tuberias: 'TUB',
    plomeria: 'PLO',
    electrico: 'ELE',
    madera: 'MAD',
    impermeabilizante: 'IMP',
    pintura: 'PIN',
    pisos: 'PSO',
    herreria: 'HER',
    ferreteria: 'FER',
    herramientas: 'HRM',
    maquinaria: 'MAQ',
    seguridad: 'SEG',
    otros: 'OTR'
  }
  
  const prefijo = prefijos[categoria] || 'GEN'
  const sufijo = nombre.substring(0, 3).toUpperCase().replace(/\s/g, '')
  const random = Math.floor(Math.random() * 100)
  
  return `${prefijo}-${sufijo}-${random}`
}

export function obtenerPorCategoria(categoriaId) {
  return catalogo.filter(item => item.categoria === categoriaId && item.activo)
}
