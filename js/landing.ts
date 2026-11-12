/**
 * landing.ts: gedeelde stukjes voor de drie landingspagina's (home, Kamer 14,
 * D.U.A.): navigatiebalk, gsm-menu, scroll-reveal, FAQ en het
 * boekingsformulier. Stond vroeger drie keer als los <script> in de HTML.
 */
import { experienceUitPad, meetEvent } from '../shared/js/meet.ts';

/** Navigatiebalk krijgt een achtergrond zodra je scrollt. */
export function koppelNavbar(): void {
  const navbar = document.getElementById('navbar');
  if (!navbar) return;
  const update = () => navbar.classList.toggle('scrolled', window.scrollY > 50);
  window.addEventListener('scroll', update, { passive: true });
  update();
}

/** Hamburgermenu op gsm; sluit weer na een klik op een link. */
export function koppelGsmMenu(): void {
  const knop = document.getElementById('navToggle');
  const links = document.getElementById('navLinks');
  if (!knop || !links) return;
  const zet = (open: boolean) => {
    links.classList.toggle('open', open);
    knop.classList.toggle('open', open);
    knop.setAttribute('aria-expanded', String(open));
  };
  knop.addEventListener('click', () => zet(!links.classList.contains('open')));
  links.querySelectorAll('a').forEach(a => a.addEventListener('click', () => zet(false)));
}

export interface RevealOpties {
  /** Hoeveel van een element zichtbaar moet zijn (0 tot 1). */
  drempel?: number;
  /** Rasters waarvan de kinderen na elkaar verschijnen (vertraging per kaart). */
  getrapt?: string;
}

/** Elementen met .reveal krijgen .visible zodra ze in beeld komen. */
export function koppelReveal({ drempel = 0.12, getrapt }: RevealOpties = {}): void {
  if (getrapt) {
    document.querySelectorAll(getrapt).forEach(raster => {
      raster.querySelectorAll<HTMLElement>('.reveal').forEach((el, i) => {
        el.style.transitionDelay = `${i * 90}ms`;
      });
    });
  }
  const elementen = document.querySelectorAll('.reveal');
  if (!('IntersectionObserver' in window)) {
    elementen.forEach(el => el.classList.add('visible'));
    return;
  }
  const io = new IntersectionObserver(
    entries => {
      entries.forEach(e => {
        if (e.isIntersecting) {
          e.target.classList.add('visible');
          io.unobserve(e.target);
        }
      });
    },
    { threshold: drempel },
  );
  elementen.forEach(el => io.observe(el));
}

/** FAQ: één vraag tegelijk open. */
export function koppelFaq(): void {
  document.querySelectorAll<HTMLElement>('.faq-q').forEach(knop => {
    knop.addEventListener('click', () => {
      const item = knop.parentElement;
      if (!item) return;
      const wasOpen = item.classList.contains('open');
      document.querySelectorAll('.faq-item').forEach(i => i.classList.remove('open'));
      if (!wasOpen) item.classList.add('open');
    });
  });
}

/** Vandaag als yyyy-mm-dd, voor het min-attribuut van een datumveld. */
export function vandaagIso(nu = new Date()): string {
  return nu.toISOString().split('T')[0] ?? '';
}

export const BOEK_FOUT_TEKST =
  'Versturen lukte niet. Probeer het opnieuw of mail naar info@bureau-x.be.';

/** Antwoord van de Make-webhook na een geslaagde boeking. */
export interface BoekAntwoord {
  sessieCode: string;
  link: string;
}

/** Alleen een antwoord met een geldige code en een link naar onze eigen site telt als gelukt. */
export function leesBoekAntwoord(data: unknown): BoekAntwoord {
  const d = data as Partial<BoekAntwoord> | null;
  if (
    typeof d?.sessieCode !== 'string' ||
    !/^[A-Z0-9-]{3,20}$/.test(d.sessieCode) ||
    typeof d.link !== 'string' ||
    !d.link.startsWith('https://bureau-x.be/experiences/')
  ) {
    throw new Error('Onverwacht antwoord van de boekingsdienst');
  }
  return { sessieCode: d.sessieCode, link: d.link };
}

/** yyyy-mm-dd als leesbare datum ("vrijdag 20 november"), of leeg. */
export function datumAlsTekst(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) return '';
  const datum = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return datum.toLocaleDateString('nl-BE', { weekday: 'long', day: 'numeric', month: 'long' });
}

/** Vult het bevestigingsblok met de code, de link en een kopieerknop. */
function toonBevestiging(ok: HTMLElement, antwoord: BoekAntwoord): void {
  const code = ok.querySelector<HTMLElement>('[data-boek="code"]');
  if (code) code.textContent = antwoord.sessieCode;
  const link = ok.querySelector<HTMLAnchorElement>('[data-boek="link"]');
  if (link) link.href = antwoord.link;
  const kopieer = ok.querySelector<HTMLButtonElement>('[data-boek="kopieer"]');
  kopieer?.addEventListener('click', () => {
    void navigator.clipboard
      ?.writeText(antwoord.link)
      .then(() => {
        kopieer.textContent = 'Gekopieerd';
      })
      .catch(() => {
        kopieer.textContent = antwoord.link;
      });
  });
  ok.style.display = 'block';
}

/**
 * Boekingsformulier: stuurt de gegevens naar de Make-webhook (form.action).
 * Make maakt de sessie aan, antwoordt meteen met de code en de link, en mailt
 * daarna alle spelers. De pagina toont de link dus direct. Lukt het niet, dan
 * blijft het formulier staan en verschijnt #boek-fout, zodat niemand denkt dat
 * de boeking binnen is. Zie docs/make-scenario.md.
 *
 * Bewust een "simple request" (form-urlencoded, geen eigen headers): zo is er
 * geen CORS-preflight nodig richting Make.
 */
export function koppelBoekformulier(fetcher: typeof fetch = (...a) => fetch(...a)): void {
  const form = document.getElementById('boekForm') as HTMLFormElement | null;
  if (!form) return;
  const datum = form.querySelector<HTMLInputElement>('input[name="datum"]');
  if (datum) datum.min = vandaagIso();

  const ok = document.getElementById('boek-ok');
  const fout = document.getElementById('boek-fout');
  const knop = form.querySelector<HTMLButtonElement>('button[type="submit"]');
  const knopTekst = knop?.textContent ?? 'Start de sessie';

  form.addEventListener('submit', async e => {
    e.preventDefault();
    if (fout) fout.hidden = true;
    if (knop) {
      knop.disabled = true;
      knop.textContent = 'Bezig…';
    }
    try {
      const velden = new URLSearchParams();
      new FormData(form).forEach((waarde, naam) => {
        if (typeof waarde === 'string') velden.append(naam, waarde.trim());
      });
      velden.set('datumTekst', datumAlsTekst(velden.get('datum') ?? ''));

      const res = await fetcher(form.action, { method: 'POST', body: velden });
      if (!res.ok) throw new Error(`Boekingsdienst antwoordde ${res.status}`);
      const antwoord = leesBoekAntwoord(await res.json());

      form.style.display = 'none';
      if (ok) toonBevestiging(ok, antwoord);
      meetEvent('reservation_submit', { experience: experienceUitPad() });
    } catch (err) {
      console.error('Boeking versturen mislukt:', err);
      if (knop) {
        knop.disabled = false;
        knop.textContent = knopTekst;
      }
      if (fout) {
        fout.textContent = BOEK_FOUT_TEKST;
        fout.hidden = false;
      }
    }
  });
}

/** Alles samen, voor een gewone landingspagina. */
export function initLanding(reveal: RevealOpties = {}): void {
  koppelNavbar();
  koppelGsmMenu();
  koppelReveal(reveal);
  koppelFaq();
  koppelBoekformulier();
}
