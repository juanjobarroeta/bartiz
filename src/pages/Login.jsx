import { useState } from 'react'
import { useNavigate, Navigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import './Login.css'

export default function Login() {
  const { login, isAuthenticated } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  if (isAuthenticated) {
    return <Navigate to="/" replace />
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      const data = await login({ email: email.trim(), password })
      const hasConstruccion = data.companies.some((c) =>
        c.modulos?.includes('CONSTRUCCION')
      )
      if (!hasConstruccion) {
        setError(
          'Inicio de sesión correcto, pero ninguna de tus empresas tiene el módulo CONSTRUCCIÓN habilitado. Contacta soporte para activarlo.'
        )
        return
      }
      navigate('/', { replace: true })
    } catch (err) {
      setError(err.message || 'No se pudo iniciar sesión')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="login-wrapper">
      <form className="login-card" onSubmit={handleSubmit}>
        <h1>construcción.admin</h1>
        <p className="login-sub">Inicia sesión con tu cuenta de contabilidad-os</p>

        <label>
          Correo
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoFocus
            autoComplete="email"
          />
        </label>

        <label>
          Contraseña
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="current-password"
          />
        </label>

        {error && <div className="login-error">{error}</div>}

        <button type="submit" disabled={submitting}>
          {submitting ? 'Iniciando…' : 'Iniciar sesión'}
        </button>

        <p className="login-hint">
          Usamos la misma cuenta que tu plataforma contable. Si aún no tienes
          una, créala en contabilidad-os primero.
        </p>
      </form>
    </div>
  )
}
