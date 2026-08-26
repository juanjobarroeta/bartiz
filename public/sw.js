/**
 * Service worker de bartiz — SOLO Web Push. No intercepta fetch ni cachea:
 * la app sigue siendo 100% online; esto existe para que el navegador pueda
 * mostrar notificaciones aun con la pestaña cerrada.
 *
 * El payload lo manda contabilidad-os (src/lib/construccion/push.ts):
 *   { title, body, url?, tag? }
 */

self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()))

self.addEventListener('push', (event) => {
  let data = {}
  try {
    data = event.data ? event.data.json() : {}
  } catch {
    data = { title: 'Bartiz', body: event.data?.text() || '' }
  }
  const title = data.title || 'Bartiz'
  event.waitUntil(
    self.registration.showNotification(title, {
      body: data.body || '',
      tag: data.tag || undefined, // mismo tag = reemplaza, no apila
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-192.png',
      data: { url: data.url || '/' },
    })
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = event.notification.data?.url || '/'
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((wins) => {
      // Si ya hay una pestaña de bartiz, navegarla y enfocarla; si no, abrir.
      for (const w of wins) {
        if ('focus' in w) {
          w.navigate(url)
          return w.focus()
        }
      }
      return self.clients.openWindow(url)
    })
  )
})
