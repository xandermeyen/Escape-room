import * as Sentry from '@sentry/browser';

const dsn = import.meta.env.VITE_SENTRY_DSN as string | undefined;

/**
 * Initialiseert Sentry error monitoring.
 *
 * Activeert alleen in een productie-build mét VITE_SENTRY_DSN. De dev-server
 * rapporteert nooit — ook niet als er een DSN in een lokale .env staat —
 * zodat lokale tests geen ruis in Sentry veroorzaken.
 *
 * DSN instellen:
 *   - Productie: voeg VITE_SENTRY_DSN toe als GitHub Secret
 *   - Lokaal testen: `pnpm build && pnpm preview` met een DSN in .env
 */
if (dsn && import.meta.env.PROD) {
  Sentry.init({
    dsn,
    environment: import.meta.env.MODE,   // 'production' of 'development'
    tracesSampleRate: 0,                  // geen performance monitoring
    replaysSessionSampleRate: 0,          // geen session replay
    ignoreErrors: [
      // Bekende Firebase Auth-eigenaardigheid op Safari/iOS: de interne
      // IndexedDB-polling voor multi-tab auth-sync loopt soms nog net op
      // het moment dat de tab sluit/navigeert, waardoor Safari de
      // IndexedDB-connectie al dicht heeft. Komt niet uit onze code en
      // breekt niets voor de speler — puur ruis in Sentry.
      /Failed to execute 'transaction' on 'IDBDatabase'/,
    ],
  });
}
