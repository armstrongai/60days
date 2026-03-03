/// <reference lib="webworker" />

import { clientsClaim } from 'workbox-core'
import { precacheAndRoute } from 'workbox-precaching'

declare let self: ServiceWorkerGlobalScope

clientsClaim()

// self.__WB_MANIFEST is replaced at build time
precacheAndRoute(self.__WB_MANIFEST || [])

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim())
})

