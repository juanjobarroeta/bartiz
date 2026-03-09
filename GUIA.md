# Guía de Uso - Sistema Administrativo Constructora

## 📖 Índice

1. [Primeros Pasos](#primeros-pasos)
2. [Navegación](#navegación)
3. [Módulos del Sistema](#módulos-del-sistema)
4. [Flujos de Trabajo](#flujos-de-trabajo)
5. [Preguntas Frecuentes](#preguntas-frecuentes)

## 🚀 Primeros Pasos

### Instalación Inicial

1. **Abrir la carpeta del proyecto en tu editor de código**
   - Si usas VS Code, Cursor u otro: `File > Open Folder > construccion-admin`

2. **Abrir terminal en la carpeta del proyecto**
   - En VS Code/Cursor: `Terminal > New Terminal`
   - En Mac: Navegar a la carpeta y usar Terminal
   - En Windows: Click derecho > "Abrir en Terminal"

3. **Instalar dependencias**
   ```bash
   npm install
   ```
   Este comando descargará todas las librerías necesarias (puede tomar 1-2 minutos).

4. **Iniciar la aplicación**
   ```bash
   npm run dev
   ```
   
5. **Abrir en el navegador**
   - Automáticamente se abrirá en `http://localhost:3000`
   - Si no abre, copia y pega esa URL en tu navegador

### Primera Vez que Inicias

Al iniciar verás:
- **Dashboard**: Resumen general con estadísticas
- **Sidebar izquierdo**: Menú de navegación
- **Datos de ejemplo**: El sistema viene precargado con información de muestra

## 🧭 Navegación

### Menú Principal (Sidebar)

El sistema tiene 6 secciones principales:

1. **Dashboard** 📊 - Vista general
2. **Proyectos** 🏗️ - Gestión de proyectos de construcción
3. **Clientes** 👥 - Administración de clientes
4. **Empleados** 👷 - Gestión de personal
5. **Presupuestos** 💰 - Control financiero
6. **Inventario** 🔧 - Materiales y equipos

### Indicadores Visuales

- **Enlace activo**: Fondo beige, borde negro izquierdo
- **Hover**: Fondo gris claro
- **Botón primario**: Fondo negro, texto blanco
- **Botón secundario**: Fondo blanco, borde negro

## 📋 Módulos del Sistema

### 1. Dashboard

**Propósito**: Vista rápida del estado general de la empresa

**Elementos**:
- **4 Tarjetas estadísticas**:
  - Proyectos Activos
  - Clientes Activos
  - Total de Empleados
  - Presupuesto Total (con fondo beige - destacado)
  
- **Proyectos Recientes**:
  - Lista de últimos proyectos
  - Barras de progreso visual
  - Estado de cada proyecto

**Cuándo usarlo**: 
- Al iniciar sesión para ver estado general
- Para reportes rápidos a gerencia
- Para identificar proyectos que requieren atención

---

### 2. Proyectos

**Propósito**: Gestionar todos los proyectos de construcción

#### Ver Proyectos
- Tabla con todos los proyectos
- Información visible:
  - Nombre del proyecto
  - Cliente asignado
  - Ubicación
  - Presupuesto
  - Fecha de inicio
  - Estado (con badge de color)

#### Crear Nuevo Proyecto

1. Click en **"+ Nuevo Proyecto"**
2. Llenar formulario:
   - **Nombre**: ej. "Edificio Residencial Norte"
   - **Cliente**: ej. "Constructora ABC"
   - **Ubicación**: ej. "Monterrey, NL"
   - **Presupuesto**: ej. 2500000 (sin comas)
   - **Fecha de Inicio**: Selector de fecha
   - **Estado**: Dropdown con opciones
     - Planeación (badge gris)
     - En Progreso (badge beige)
     - Pausado (badge blanco con borde)
     - Completado (badge negro)
3. Click en **"Crear Proyecto"**

#### Estados de Proyecto

- **Planeación**: Proyecto en fase de diseño/permisos
- **En Progreso**: Construcción activa
- **Pausado**: Temporalmente detenido
- **Completado**: Obra terminada

---

### 3. Clientes

**Propósito**: Administrar base de datos de clientes

#### Ver Clientes
- Tabla con información completa:
  - Nombre del contacto
  - Empresa
  - Email
  - Teléfono (formato monospace)
  - Dirección completa

#### Registrar Nuevo Cliente

1. Click en **"+ Nuevo Cliente"**
2. Completar información:
   - **Nombre Completo**: Persona de contacto
   - **Empresa**: Razón social
   - **Email**: Correo electrónico
   - **Teléfono**: Formato: 555-0123
   - **Dirección**: Dirección física completa
3. Click en **"Registrar Cliente"**

**Tip**: Mantén emails actualizados para comunicaciones automáticas futuras.

---

### 4. Empleados

**Propósito**: Gestión de recursos humanos y personal

#### Ver Empleados
- Tabla con datos del personal:
  - Nombre completo
  - Puesto
  - Especialidad (en itálicas)
  - Teléfono
  - Salario mensual
  - Fecha de contratación

#### Registrar Nuevo Empleado

1. Click en **"+ Nuevo Empleado"**
2. Ingresar datos:
   - **Nombre Completo**: ej. "Juan Pérez García"
   - **Puesto**: ej. "Ingeniero Civil"
   - **Especialidad**: ej. "Estructuras"
   - **Teléfono**: ej. "555-1234"
   - **Salario Mensual**: ej. 35000 (sin comas)
   - **Fecha de Contratación**: Selector de fecha
3. Click en **"Registrar Empleado"**

**Categorías comunes de puestos**:
- Ingeniero Civil
- Arquitecto
- Maestro de Obra
- Electricista
- Plomero
- Supervisor
- Capataz
- Albañil

---

### 5. Presupuestos

**Propósito**: Control financiero y seguimiento de gastos

#### Vista General
- **3 Tarjetas de resumen**:
  - Total Presupuestado: Suma de todos los presupuestos
  - Total Gastado: Suma de gastos realizados
  - Disponible: Diferencia (con fondo beige destacado)

#### Tabla de Presupuestos
Muestra por proyecto:
- Nombre del proyecto
- Categoría (Construcción/Remodelación)
- Presupuesto total asignado
- Monto gastado a la fecha
- Disponible restante
- Barra de progreso de gasto (% usado)

**Indicadores importantes**:
- **Barra negra**: Gasto normal
- **Barra negra (>90%)**: Alerta de sobregasto cercano
- **Número negativo en disponible**: Sobregasto (texto en negrita)

**Uso recomendado**:
- Revisar semanalmente
- Identificar proyectos cerca del límite
- Planear ajustes presupuestales

---

### 6. Inventario

**Propósito**: Control de materiales, equipos y herramientas

#### Estadísticas Rápidas
4 tarjetas mostrando:
- Total de items
- Cantidad de materiales
- Cantidad de equipos
- Valor total del inventario (destacado en beige)

#### Ver Inventario
Tabla completa con:
- Nombre del item
- Categoría (badge de color):
  - Material (gris)
  - Equipo (beige)
  - Herramienta (blanco con borde)
- Cantidad y unidad
- Precio unitario
- Valor total calculado
- Ubicación física

#### Agregar Item al Inventario

1. Click en **"+ Nuevo Item"**
2. Completar formulario:
   - **Nombre**: ej. "Cemento Portland"
   - **Categoría**: Seleccionar tipo
   - **Cantidad**: ej. 100
   - **Unidad**: ej. "Bultos", "m³", "Piezas"
   - **Precio Unitario**: ej. 185
   - **Ubicación**: ej. "Bodega A"
3. Click en **"Agregar al Inventario"**

**Categorías**:
- **Material**: Consumibles (cemento, arena, block)
- **Equipo**: Maquinaria (excavadoras, mezcladoras)
- **Herramienta**: Herramientas (taladros, niveles)

**Unidades comunes**:
- Bultos (cemento)
- m³ (arena, grava)
- Piezas (varilla, block)
- Litros (pintura)
- Unidades (equipos)

---

## 🔄 Flujos de Trabajo

### Flujo: Nuevo Proyecto Completo

1. **Clientes** → Registrar cliente nuevo (si no existe)
2. **Proyectos** → Crear proyecto con ese cliente
3. **Presupuestos** → Automáticamente se refleja el presupuesto
4. **Empleados** → Asignar personal al proyecto
5. **Inventario** → Preparar materiales necesarios
6. **Dashboard** → Monitorear progreso general

### Flujo: Control Semanal

1. **Dashboard** → Revisar estado general
2. **Proyectos** → Actualizar estados y progresos
3. **Presupuestos** → Verificar gastos vs presupuesto
4. **Inventario** → Revisar niveles de stock
5. **Empleados** → Verificar asignaciones

### Flujo: Fin de Mes

1. **Presupuestos** → Revisar todos los gastos
2. **Empleados** → Verificar nómina
3. **Inventario** → Valorización total
4. **Dashboard** → Generar reporte ejecutivo

---

## ❓ Preguntas Frecuentes

### ¿Cómo cierro la aplicación?

En la terminal donde está corriendo:
- Presiona `Ctrl + C`
- Confirma con `y` o `s`

### ¿Cómo vuelvo a abrir la aplicación?

1. Abrir terminal en la carpeta del proyecto
2. Ejecutar `npm run dev`
3. Abrir `http://localhost:3000`

### ¿Los datos se guardan?

Actualmente **NO**. Los datos son simulados en memoria. Al cerrar la aplicación, los cambios se pierden. Para guardar datos permanentemente, se necesita implementar una base de datos.

### ¿Puedo usar esto en producción?

No directamente. Esta versión es un prototipo. Para producción necesitas:
- Base de datos (PostgreSQL/MongoDB)
- Autenticación de usuarios
- Hosting (servidor web)
- Backup de datos
- Seguridad adicional

### ¿Funciona sin internet?

Sí, una vez instalado. Solo necesitas internet para:
- Instalación inicial (`npm install`)
- Descargar actualizaciones

### ¿Puedo cambiar los colores?

Sí, editando el archivo `src/styles/global.css`:
```css
:root {
  --color-black: #000000;    /* Cambiar aquí */
  --color-white: #FFFFFF;    /* Cambiar aquí */
  --color-gray: #C6C6C6;     /* Cambiar aquí */
  --color-beige: #DFD8CB;    /* Cambiar aquí */
}
```

### ¿Puedo agregar más campos a los formularios?

Sí, pero requiere editar el código:
1. Abrir el archivo de la página (ej. `src/pages/Proyectos.jsx`)
2. Agregar campo al estado
3. Agregar input al formulario
4. Actualizar la tabla para mostrarlo

### ¿Funciona en móvil/tablet?

Sí, el diseño es **responsive**:
- Desktop: Sidebar fijo a la izquierda
- Tablet/Móvil: Menú horizontal arriba

### ¿Puedo exportar a Excel?

No actualmente. Se puede agregar esta funcionalidad instalando librerías como `xlsx` o `react-csv`.

### Error: "Port 3000 already in use"

Significa que ya hay algo corriendo en ese puerto:
1. Cerrar otras aplicaciones en puerto 3000
2. O modificar el puerto en `vite.config.js`

### Error: "npm command not found"

Necesitas instalar Node.js:
1. Ir a https://nodejs.org
2. Descargar versión LTS
3. Instalar
4. Reiniciar terminal

---

## 🎓 Tips y Mejores Prácticas

### Nomenclatura de Proyectos
- Usar nombres descriptivos
- Incluir ubicación si es relevante
- Ej: "Edificio Residencial Centro CDMX"

### Organización de Inventario
- Usar ubicaciones específicas (Bodega A, B, Patio)
- Mantener unidades consistentes
- Actualizar después de cada uso importante

### Control de Presupuestos
- Revisar semanalmente
- Documentar gastos inmediatamente
- Mantener margen de 10-15% para imprevistos

### Gestión de Empleados
- Actualizar especialidades claramente
- Mantener teléfonos actualizados
- Registrar fechas de contratación correctamente

---

## 📞 Soporte Técnico

Si encuentras problemas:

1. **Revisar errores en consola del navegador**:
   - F12 → Pestaña "Console"
   
2. **Revisar errores en terminal**:
   - Donde está corriendo `npm run dev`

3. **Reiniciar la aplicación**:
   - Ctrl+C en terminal
   - `npm run dev` de nuevo

4. **Borrar y reinstalar**:
   ```bash
   rm -rf node_modules
   npm install
   npm run dev
   ```

---

## 🔮 Roadmap Futuro

Características planeadas:
- Login y múltiples usuarios
- Base de datos real
- Exportación a PDF/Excel
- Gráficas de progreso
- Calendario de proyectos
- Fotos de obra
- Firma digital de documentos
- App móvil nativa

---

**Última actualización**: Noviembre 2025  
**Versión**: 1.0.0

