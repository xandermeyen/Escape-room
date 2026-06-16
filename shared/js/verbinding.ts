/**
 * verbinding.ts — zichtbare afhandeling van mislukte Firebase-schrijfacties.
 *
 * authReady resolveert altijd zodat de UI laadt (zie auth.ts), maar de
 * database-rules eisen `auth != null` voor writes. Als anonieme login dan toch
 * faalde, wordt elke schrijfactie geweigerd. Vroeger zag de speler daar niets
 * van. Nu tonen we een vaste balk en sturen we de fout naar Sentry.
 */
import * as Sentry from '@sentry/browser';

let bannerGetoond = false;

/** Toont eenmalig een vaste balk bovenaan de pagina. Idempotent. */
export function toonVerbindingsfout(): void {
  if (bannerGetoond) return;
  bannerGetoond = true;
  if (typeof document === 'undefined' || !document.body) return;

  const balk = document.createElement('div');
  balk.id = 'verbinding-fout';
  balk.setAttribute('role', 'alert');
  balk.textContent = 'Verbinding mislukt. Herlaad de pagina om verder te spelen.';
  balk.style.cssText = [
    'position:fixed', 'top:0', 'left:0', 'right:0', 'z-index:9999',
    'background:#b3261e', 'color:#fff', 'padding:12px 16px',
    'font-family:system-ui,-apple-system,sans-serif', 'font-size:15px',
    'text-align:center', 'box-shadow:0 2px 8px rgba(0,0,0,.3)',
  ].join(';');
  document.body.appendChild(balk);
}

/** Meldt een schrijffout: log + Sentry + zichtbare balk. */
export function meldSchrijffout(context: string, err: unknown): void {
  console.error(`Schrijfactie mislukt (${context}):`, err);
  Sentry.captureException(err, { tags: { context } });
  toonVerbindingsfout();
}

/**
 * schrijf: wrap een Firebase-schrijfactie. Bij afwijzing wordt de fout
 * zichtbaar gemaakt en naar Sentry gestuurd, daarna opnieuw gegooid zodat
 * aanroepers met eigen afhandeling die nog kunnen oppikken.
 */
export async function schrijf<T>(context: string, taak: Promise<T>): Promise<T> {
  try {
    return await taak;
  } catch (err) {
    meldSchrijffout(context, err);
    throw err;
  }
}
