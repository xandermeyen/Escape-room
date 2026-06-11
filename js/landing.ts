import '../src/base.ts';
import '../shared/js/sentry.ts';

/* ── 1. SCROLL-ANIMATIES ── */

const animeerElementen = document.querySelectorAll<HTMLElement>(
  '.experience-kaart, .experience-kaart-locked, .archief-kaart, .stap-nummer, .dossier-blok'
);

animeerElementen.forEach(el => el.classList.add('fade-in-element'));

// IntersectionObserver: zodra een element zichtbaar wordt, animeer het
const observer = new IntersectionObserver(
  (entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('zichtbaar');
        observer.unobserve(entry.target); // stop na eerste keer
      }
    });
  },
  { threshold: 0.15 } // element moet 15% zichtbaar zijn om te triggeren
);

animeerElementen.forEach(el => observer.observe(el));


/* ── 2. ACTIEVE NAV-LINK OP SCROLL ── */

const secties   = document.querySelectorAll<HTMLElement>('section[id]');
const navLinks  = document.querySelectorAll<HTMLAnchorElement>('.navbar-nav .nav-link');

const navObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        // Verwijder 'actief' van alle links
        navLinks.forEach(link => link.classList.remove('nav-link-actief'));

        // Voeg 'actief' toe aan de link die past bij de zichtbare sectie
        const actieveLink = document.querySelector<HTMLAnchorElement>(
          `.navbar-nav .nav-link[href="#${entry.target.id}"]`
        );
        if (actieveLink) actieveLink.classList.add('nav-link-actief');
      }
    });
  },
  {
    rootMargin: '-40% 0px -55% 0px' // sectie moet ±in het midden van het scherm zijn
  }
);

secties.forEach(sectie => navObserver.observe(sectie));


/* ── 3. FORMSPREE AJAX FORMULIER ── */

// Datum minimum = vandaag
const datumInput = document.getElementById('datum') as HTMLInputElement | null;
if (datumInput) {
  datumInput.min = new Date().toISOString().split('T')[0]!;
}

const form = document.getElementById('reserveerForm') as HTMLFormElement | null;

if (form) {
  form.addEventListener('submit', async (e: SubmitEvent) => {
    e.preventDefault(); // stop de normale submit/redirect

    const knop = form.querySelector<HTMLButtonElement>('button[type="submit"]')!;
    const origineelLabel = knop.innerHTML;

    // Laadstatus tonen
    knop.disabled = true;
    knop.innerHTML = '<i class="bi bi-hourglass-split me-2"></i>Bezig met verzenden…';

    try {
      const response = await fetch(form.action, {
        method: 'POST',
        body: new FormData(form),
        headers: { 'Accept': 'application/json' }
      });

      if (response.ok) {
        // Succes: vervang het formulier door een bevestigingsbericht
        form.innerHTML = `
          <div class="formulier-bevestiging text-center py-4">
            <i class="bi bi-check-circle fs-1 mb-3 d-block" style="color: var(--kleur-accent);"></i>
            <h5 class="mb-2" style="font-family: var(--font-archief); letter-spacing: 0.06em;">
              Reservering ontvangen
            </h5>
            <p class="mb-0" style="color: var(--kleur-grijs); font-size: 0.95rem;">
              Je ontvangt binnen 24 uur een bevestigingsmail<br />
              met jullie persoonlijke spellink voor <strong>Kamer 14</strong>.
            </p>
          </div>
        `;
      } else {
        // Fout van Formspree
        throw new Error('Formspree fout');
      }
    } catch {
      // Iets ging mis: toon foutmelding, herstel de knop
      knop.disabled = false;
      knop.innerHTML = origineelLabel;

      // Verwijder eventuele eerdere foutmelding
      const oudeError = form.querySelector('.formulier-fout');
      if (oudeError) oudeError.remove();

      const fout = document.createElement('p');
      fout.className = 'formulier-fout mt-3 mb-0 text-center';
      fout.style.color = '#c0392b';
      fout.style.fontFamily = 'var(--font-archief)';
      fout.innerHTML = '<i class="bi bi-exclamation-triangle me-1"></i>Er ging iets mis. Probeer het opnieuw of stuur een mail.';
      form.appendChild(fout);
    }
  });
}


/* ── 4. EASTER EGG: HET ARCHIEF REAGEERT OP HAAR NAAM ── */

// Hint voor wie de console opent
console.log(
  '%cBUREAU X — INTERN ARCHIEF',
  'font-family: monospace; font-size: 14px; letter-spacing: 2px; color: #c49a2a;',
  '\n\nJe zoekt op plekken waar anderen niet kijken. Goede reflex, speurder.' +
  '\nHet archief reageert op haar naam. Typ die maar eens, gewoon op de pagina.'
);

let toetsBuffer = '';
const GEHEIM = 'lena';

function toonVermistBericht(): void {
  if (document.querySelector('.easter-overlay')) return;

  const overlay = document.createElement('div');
  overlay.className = 'easter-overlay';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-label', 'Verborgen archiefstuk');
  overlay.innerHTML = `
    <div class="easter-kaart">
      <span class="easter-stempel">Vermist</span>
      <p class="easter-label">Archiefstuk B-X/14 &middot; niet voor publicatie</p>
      <h2>Gezocht: Lena Bogaert</h2>
      <p>Laatst gezien op een dinsdagochtend in mei, Geel.</p>
      <p>Bed opgemaakt. Jas weg. Geen briefje.</p>
      <p>Wie iets weet, opent dossier 14. Wie niets weet ook.</p>
      <p class="easter-sluiten">Klik om dit archiefstuk terug te leggen.</p>
    </div>
  `;

  const sluit = () => {
    overlay.remove();
    document.removeEventListener('keydown', opEscape);
  };
  const opEscape = (e: KeyboardEvent) => {
    if (e.key === 'Escape') sluit();
  };

  overlay.addEventListener('click', sluit);
  document.addEventListener('keydown', opEscape);
  document.body.appendChild(overlay);
}

document.addEventListener('keydown', (e: KeyboardEvent) => {
  // Niet triggeren terwijl iemand een formulierveld invult
  const doel = e.target as HTMLElement | null;
  if (doel && (doel.tagName === 'INPUT' || doel.tagName === 'TEXTAREA' || doel.tagName === 'SELECT' || doel.isContentEditable)) return;
  if (e.key.length !== 1) return;

  toetsBuffer = (toetsBuffer + e.key.toLowerCase()).slice(-GEHEIM.length);
  if (toetsBuffer === GEHEIM) {
    toetsBuffer = '';
    toonVermistBericht();
  }
});
