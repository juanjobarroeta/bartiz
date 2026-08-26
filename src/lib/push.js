/**
 * Web Push del lado cliente: registrar el service worker, pedir permiso,
 * suscribirse con la llave VAPID del backend y avisarle a contabilidad-os
 * (POST /api/construccion/push) para que guarde la suscripción.
 *
 * Estados que maneja la UI (usePushEstado):
 *   'unsupported' — el navegador no tiene Push API (o iOS sin instalar la
 *                   app en pantalla de inicio: Safari sólo da push a PWAs).
 *   'denied'      — el usuario bloqueó las notificaciones; sólo se revierte
 *                   desde la configuración del navegador.
 *   'on' / 'off'  — suscrito o no.
 */

import { apiFetch } from '../config/api'

export function pushSoportado() {
  return (
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  )
}

// La llave VAPID viaja base64url; PushManager espera Uint8Array.
function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(base64)
  const out = new Uint8Array(raw.length)
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i)
  return out
}

async function registration() {
  return navigator.serviceWorker.register('/sw.js')
}

/** Estado actual sin pedir permisos ni tocar la red. */
export async function estadoPush() {
  if (!pushSoportado()) return 'unsupported'
  if (Notification.permission === 'denied') return 'denied'
  try {
    const reg = await registration()
    const sub = await reg.pushManager.getSubscription()
    return sub ? 'on' : 'off'
  } catch {
    return 'unsupported'
  }
}

/**
 * Activa las notificaciones: permiso → suscripción → guardar en el backend.
 * Devuelve el estado resultante ('on' | 'denied' | 'unsupported').
 * Lanza Error con mensaje legible si el backend no tiene VAPID configurado.
 */
export async function activarPush(companyId) {
  if (!pushSoportado()) return 'unsupported'

  const { configured, publicKey } = await apiFetch('/api/construccion/push')
  if (!configured || !publicKey) {
    throw new Error('El servidor no tiene notificaciones configuradas todavía.')
  }

  const permiso = await Notification.requestPermission()
  if (permiso !== 'granted') return permiso === 'denied' ? 'denied' : 'off'

  const reg = await registration()
  const sub =
    (await reg.pushManager.getSubscription()) ||
    (await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey),
    }))

  const json = sub.toJSON()
  await apiFetch('/api/construccion/push', {
    method: 'POST',
    body: { companyId, endpoint: json.endpoint, keys: json.keys },
  })
  return 'on'
}

/** Desactiva: borra la suscripción local y la del backend. */
export async function desactivarPush() {
  if (!pushSoportado()) return 'unsupported'
  const reg = await registration()
  const sub = await reg.pushManager.getSubscription()
  if (sub) {
    const endpoint = sub.endpoint
    await sub.unsubscribe().catch(() => {})
    await apiFetch(`/api/construccion/push?endpoint=${encodeURIComponent(endpoint)}`, {
      method: 'DELETE',
    }).catch(() => {}) // si el backend no lo borra, el push muere igual en 404/410
  }
  return 'off'
}
