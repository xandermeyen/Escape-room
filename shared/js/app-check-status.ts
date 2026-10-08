/**
 * app-check-status.ts: staat Firebase App Check (reCAPTCHA Enterprise) aan in
 * deze build? Dat hangt af van VITE_RECAPTCHA_SITE_KEY (GitHub-secret).
 *
 * Google vraagt een zichtbare reCAPTCHA-melding zodra de badge verborgen is.
 * Staat App Check uit, dan mag die melding er juist niet staan: de site zou
 * dan iets beweren dat niet klopt (ook in het privacybeleid).
 *
 * Elementen met de klasse `recaptcha-melding` staan standaard verborgen
 * (`hidden` in de HTML) en worden enkel getoond als App Check actief is.
 * Dit bestand importeert bewust geen Firebase, zodat ook privacy.html het
 * kan gebruiken zonder de hele SDK te laden.
 */
export const APP_CHECK_SLEUTEL: string | undefined =
  (import.meta.env.VITE_RECAPTCHA_SITE_KEY as string | undefined) || undefined;

export const APP_CHECK_ACTIEF = Boolean(APP_CHECK_SLEUTEL);

/** Toont of verbergt alle reCAPTCHA-meldingen op de pagina. */
export function toonRecaptchaMeldingen(
  actief = APP_CHECK_ACTIEF,
  root: ParentNode = document,
): void {
  root.querySelectorAll<HTMLElement>('.recaptcha-melding').forEach(el => {
    el.hidden = !actief;
  });
}
