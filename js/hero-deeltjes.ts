/**
 * hero-deeltjes.ts: zwevende stofdeeltjes achter de hero van de homepage.
 *
 * three.js komt nu uit npm (gepinde versie, gebundeld door Vite) in plaats van
 * een losse CDN-versie r128 uit 2021. Het wordt pas geladen na de rest van de
 * pagina, en niet bij "minder beweging" of zonder WebGL.
 *
 * Dit bestand wordt zelf dynamisch geladen (zie landing-home.ts), zodat three.js
 * in een aparte chunk zit; de named imports laten Vite ongebruikte delen weglaten.
 */
import {
  BufferAttribute,
  BufferGeometry,
  PerspectiveCamera,
  Points,
  PointsMaterial,
  Scene,
  WebGLRenderer,
} from 'three';

export function startHeroDeeltjes(canvas: HTMLCanvasElement): void {
  if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;

  let renderer: WebGLRenderer;
  try {
    renderer = new WebGLRenderer({ canvas, alpha: true, antialias: false });
  } catch {
    return; // geen WebGL: de hero werkt ook zonder deeltjes
  }
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));

  const scene = new Scene();
  const camera = new PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 100);
  camera.position.z = 5;

  const AANTAL = 400;
  const pos = new Float32Array(AANTAL * 3);
  const snelheid: { x: number; y: number; p: number }[] = [];
  for (let i = 0; i < AANTAL; i++) {
    pos[i * 3] = (Math.random() - 0.5) * 26;
    pos[i * 3 + 1] = (Math.random() - 0.5) * 16;
    pos[i * 3 + 2] = (Math.random() - 0.5) * 10 - 2;
    snelheid.push({
      x: (Math.random() - 0.5) * 0.0025,
      y: Math.random() * 0.004 + 0.0008,
      p: Math.random() * Math.PI * 2,
    });
  }

  const geo = new BufferGeometry();
  const positie = new BufferAttribute(pos, 3);
  geo.setAttribute('position', positie);
  const groot = new Points(
    geo,
    new PointsMaterial({ color: 0xc8a96e, size: 0.045, transparent: true, opacity: 0.35 }),
  );
  const klein = new Points(
    geo,
    new PointsMaterial({ color: 0xe8dcc8, size: 0.018, transparent: true, opacity: 0.5 }),
  );
  scene.add(groot, klein);

  let t = 0;
  const tik = () => {
    requestAnimationFrame(tik);
    t += 0.006;
    for (let j = 0; j < AANTAL; j++) {
      const v = snelheid[j];
      if (!v) continue;
      pos[j * 3] = (pos[j * 3] ?? 0) + v.x + Math.sin(t + v.p) * 0.0008;
      pos[j * 3 + 1] = (pos[j * 3 + 1] ?? 0) + v.y;
      if ((pos[j * 3 + 1] ?? 0) > 8) {
        pos[j * 3 + 1] = -8;
        pos[j * 3] = (Math.random() - 0.5) * 26;
      }
    }
    positie.needsUpdate = true;
    groot.rotation.y = klein.rotation.y = Math.sin(t * 0.04) * 0.015;
    renderer.render(scene, camera);
  };
  tik();

  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });
}
