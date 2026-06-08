import * as Sentry from '@sentry/browser';

const dsn = import.meta.env.VITE_SENTRY_DSN as string | undefined;

/**
 * Initialiseert Sentry error monitoring.
 *
 * Activeert alleen als VITE_SENTRY_DSN aanwezig is —
 * dus in development (geen DSN) doet dit niets.
 *
 * DSN instellen:
 *   - Productie: voeg VITE_SENTRY_DSN toe als GitHub Secret
 *   - Lokaal testen: voeg toe aan .env (nooit .env.development)
 */
if (dsn) {
  Sentry.init({
    dsn,
    environment: import.meta.env.MODE,   // 'production' of 'development'
    tracesSampleRate: 0,                  // geen performance monitoring
    replaysSessionSampleRate: 0,          // geen session replay
  });
}
