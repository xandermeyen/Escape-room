/**
 * hero-deeltjes.ts: zwevende stofdeeltjes achter de hero van de homepage.
 *
 * Gewone Canvas 2D in plaats van three.js (dat was een chunk van ~525 kB voor
 * een decoratief effect). De deeltjes leven in dezelfde 3D-ruimte als vroeger
 * en worden met een eenvoudige perspectiefprojectie getekend (camera op z = 5,
 * beeldhoek 60°), zodat diepte en grootte hetzelfde aanvoelen.
 *
 * Wordt pas geladen na de rest van de pagina (zie landing-home.ts), start niet
 * bij "minder beweging" en pauzeert als de hero niet zichtbaar is of het
 * tabblad verborgen staat.
 */

const AANTAL = 400;
const CAMERA_Z = 5;
const HALVE_FOV_TAN = Math.tan((60 / 2) * (Math.PI / 180));

interface Deeltje {
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  fase: number;
}

/** Twee lagen per deeltje, zoals de twee three.js-materialen vroeger. */
const LAGEN = [
  { kleur: 'rgba(200, 169, 110, 0.35)', grootte: 0.045 }, // goud, groot
  { kleur: 'rgba(232, 220, 200, 0.5)', grootte: 0.018 }, // licht, klein
] as const;

function nieuwDeeltje(): Deeltje {
  return {
    x: (Math.random() - 0.5) * 26,
    y: (Math.random() - 0.5) * 16,
    z: (Math.random() - 0.5) * 10 - 2,
    vx: (Math.random() - 0.5) * 0.0025,
    vy: Math.random() * 0.004 + 0.0008,
    fase: Math.random() * Math.PI * 2,
  };
}

export function startHeroDeeltjes(canvas: HTMLCanvasElement): void {
  if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return; // geen canvas: de hero werkt ook zonder deeltjes

  const deeltjes = Array.from({ length: AANTAL }, nieuwDeeltje);
  let breedte = 0;
  let hoogte = 0;

  const maatZetten = () => {
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    breedte = canvas.clientWidth || window.innerWidth;
    hoogte = canvas.clientHeight || window.innerHeight;
    canvas.width = Math.round(breedte * dpr);
    canvas.height = Math.round(hoogte * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  };
  maatZetten();
  window.addEventListener('resize', maatZetten);

  let t = 0;
  let frame = 0;
  let zichtbaar = true;

  const tik = () => {
    frame = 0;
    t += 0.006;
    ctx.clearRect(0, 0, breedte, hoogte);

    // Pixels per wereldeenheid op afstand 1 van de camera.
    const schaal = hoogte / 2 / HALVE_FOV_TAN;
    // Lichte zwaai, zoals de rotatie rond de y-as vroeger.
    const zwaai = Math.sin(t * 0.04) * 0.015;
    const cos = Math.cos(zwaai);
    const sin = Math.sin(zwaai);

    for (const d of deeltjes) {
      d.x += d.vx + Math.sin(t + d.fase) * 0.0008;
      d.y += d.vy;
      if (d.y > 8) {
        d.y = -8;
        d.x = (Math.random() - 0.5) * 26;
      }
    }

    for (const laag of LAGEN) {
      ctx.fillStyle = laag.kleur;
      ctx.beginPath();
      for (const d of deeltjes) {
        const x = d.x * cos + d.z * sin;
        const z = -d.x * sin + d.z * cos;
        const afstand = CAMERA_Z - z;
        if (afstand <= 0.1) continue;
        const f = schaal / afstand;
        const sx = breedte / 2 + x * f;
        const sy = hoogte / 2 - d.y * f;
        // three.js schaalt puntgrootte met (hoogte / 2) / afstand, los van de beeldhoek.
        const r = Math.max((laag.grootte * hoogte) / 4 / afstand, 0.4);
        if (sx < -r || sx > breedte + r || sy < -r || sy > hoogte + r) continue;
        ctx.moveTo(sx + r, sy);
        ctx.arc(sx, sy, r, 0, Math.PI * 2);
      }
      ctx.fill();
    }

    if (zichtbaar && !document.hidden) frame = requestAnimationFrame(tik);
  };

  const hervat = () => {
    if (!frame && zichtbaar && !document.hidden) frame = requestAnimationFrame(tik);
  };

  if ('IntersectionObserver' in window) {
    new IntersectionObserver(([entry]) => {
      zichtbaar = entry?.isIntersecting ?? true;
      hervat();
    }).observe(canvas);
  }
  document.addEventListener('visibilitychange', hervat);

  hervat();
}
