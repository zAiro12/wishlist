/* eslint-env serviceworker */

self.addEventListener('push', event => {
  if (!event.data) return
  
  let data = {}
  try {
    data = event.data.json()
  } catch {
    data = { title: 'Wishlist', body: event.data.text() }
  }

  event.waitUntil(
    self.registration.showNotification(data.title ?? 'Wishlist', {
      body: data.body ?? '',
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-192.png',
      data: data,
    })
  )
})

self.addEventListener('notificationclick', event => {
  event.notification.close()
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clientList => {
      if (clientList.length > 0) return clientList[0].focus()
      return clients.openWindow('/')
    })
  )
})