/**
 * FileUpload — minimal drop-zone / picker that reads a file to base64
 * so it can be embedded in the POST body. Good for WhatsApp photos +
 * PDFs up to ~3 MB. Larger files get rejected with a clear message.
 *
 * Props:
 *   value   { data, mime, name } or null
 *   onChange(value)
 *   label?       — button text, defaults to "Subir comprobante"
 *   accept?      — MIME filter, defaults to images + PDF
 *
 * Shows a preview for images, a generic "📄 name.pdf" chip for PDFs.
 * Single file (overwrite on re-upload). Remove clears to null.
 */

import { useRef, useState } from 'react'

const MAX_BYTES = 3 * 1024 * 1024

export default function FileUpload({
  value,
  onChange,
  label = '📎 Adjuntar comprobante',
  accept = 'image/*,application/pdf',
}) {
  const inputRef = useRef(null)
  const [error, setError] = useState(null)

  const handleFile = (file) => {
    setError(null)
    if (!file) return
    if (file.size > MAX_BYTES) {
      setError(`Archivo muy grande (${Math.round(file.size / 1024)} KB). Máx 3 MB.`)
      return
    }
    const reader = new FileReader()
    reader.onload = () => {
      const r = reader.result
      // r is a data URL: "data:MIME;base64,XXXX". We keep just the base64 part.
      const commaIdx = typeof r === 'string' ? r.indexOf(',') : -1
      if (commaIdx < 0) {
        setError('No se pudo leer el archivo.')
        return
      }
      const data = r.slice(commaIdx + 1)
      onChange?.({ data, mime: file.type, name: file.name })
    }
    reader.onerror = () => setError('Error al leer el archivo.')
    reader.readAsDataURL(file)
  }

  const clear = () => { onChange?.(null); setError(null) }

  if (value?.data) {
    const isImage = value.mime?.startsWith('image/')
    const src = isImage ? `data:${value.mime};base64,${value.data}` : null
    return (
      <div className="file-upload has-file">
        {isImage ? (
          <img src={src} alt={value.name ?? 'comprobante'} className="file-thumb" />
        ) : (
          <div className="file-chip">📄 {value.name ?? 'archivo'}</div>
        )}
        <div className="file-meta">
          <span className="small muted">{value.name ?? '—'}</span>
          <button type="button" className="link small danger" onClick={clear}>
            quitar
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="file-upload empty">
      <button
        type="button"
        className="file-btn"
        onClick={() => inputRef.current?.click()}
      >
        {label}
      </button>
      <input
        type="file"
        ref={inputRef}
        accept={accept}
        style={{ display: 'none' }}
        onChange={(e) => handleFile(e.target.files?.[0])}
      />
      {error && <div className="file-error small">{error}</div>}
      <div className="small muted">Imagen o PDF, máx 3 MB.</div>
    </div>
  )
}
