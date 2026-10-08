/**
 * host-reviews.ts — gedeelde reviewlijst-logica voor de host-panels.
 *
 * Alle reviews lezen en goedkeuren mag alleen een beheerder
 * (`beheerders/<uid>` in firebase/database.rules.json). Het publiek ziet
 * enkel goedgekeurde reviews.
 */
import { db } from './firebase-config.ts';
import { ref, get, update } from 'firebase/database';
import { escHtml } from './utils.ts';
import type { Review } from './reviews.ts';

export interface ReviewRij {
  id: string;
  data: Review;
}

/** Haalt alle reviews (goedgekeurd of niet) op voor `ervaring`, nieuwste eerst. */
export async function haalReviews(ervaring: string): Promise<ReviewRij[]> {
  const snap = await get(ref(db, 'reviews'));
  const rijen: ReviewRij[] = [];
  if (snap.exists()) {
    snap.forEach(kind => {
      const d = kind.val() as Review | null;
      if (d && d.ervaring === ervaring) {
        rijen.push({ id: kind.key ?? '', data: d });
      }
    });
  }
  rijen.sort((a, b) => (b.data.tijdstip ?? 0) - (a.data.tijdstip ?? 0));
  return rijen;
}

/** Keurt een review goed zodat ze op de website verschijnt. */
export async function keurReviewGoed(id: string): Promise<void> {
  await update(ref(db, `reviews/${id}`), { goedgekeurd: true });
}

/** Samenvatting voor bovenaan de reviewlijst. Lage scores worden apart geteld, niet verborgen. */
export function reviewSamenvattingHtml(rijen: ReviewRij[], lageScore = 3): string {
  if (rijen.length === 0) return '';
  const gem = rijen.reduce((t, r) => t + r.data.rating, 0) / rijen.length;
  const laag = rijen.filter(r => r.data.rating <= lageScore).length;
  const open = rijen.filter(r => !r.data.goedgekeurd).length;
  return `<p class="review-samenvatting">Gemiddeld <strong>${gem.toFixed(1)} ★</strong> uit ${rijen.length} review${rijen.length === 1 ? '' : 's'} · ${laag} met een lage score (≤ ${lageScore}) · ${open} nog niet goedgekeurd</p>`;
}

/** Sterren als tekst (★★★★☆), geen markup nodig. */
function sterrenTekst(rating: number): string {
  const rond = Math.max(0, Math.min(5, Math.round(rating)));
  return '★'.repeat(rond) + '☆'.repeat(5 - rond);
}

/** Eén review-kaart als HTML. `data.tekst`, `data.naam` gaan door escHtml. */
export function reviewKaartHtml(rij: ReviewRij): string {
  const { id, data } = rij;
  const naam = data.naam ? escHtml(data.naam) : 'Anoniem';
  const datum = data.tijdstip
    ? new Date(data.tijdstip).toLocaleDateString('nl-BE', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      })
    : '—';
  const veiligId = escHtml(id);

  const actie = data.goedgekeurd
    ? '<span class="badge-klaar"><i class="bi bi-check2 me-1"></i>Goedgekeurd</span>'
    : `<button class="btn-admin" style="font-size:0.8rem; padding:0.35rem 0.9rem;" data-actie="keur-goed" data-id="${veiligId}">
        <i class="bi bi-check2 me-1"></i>Goedkeuren
      </button>`;

  const verbeter = data.verbeter
    ? `<p style="margin:0.5rem 0 0; color:#d8b48a; font-size:0.85rem;"><strong>Wat kan beter:</strong> ${escHtml(data.verbeter)}</p>`
    : '';
  const laag = data.rating <= 3 ? ' style="border-color:#8b3a3a;"' : '';

  return `<div class="review-kaart"${laag}>
    <div class="d-flex justify-content-between align-items-start">
      <div>
        <div style="color:#c9a84c; letter-spacing:2px;">${sterrenTekst(data.rating)}</div>
        <div style="color:#888; font-size:0.78rem; margin-top:2px;">${naam} · ${datum}</div>
      </div>
      ${actie}
    </div>
    <p style="margin:0.6rem 0 0; color:#ddd; font-size:0.9rem;">${escHtml(data.tekst)}</p>
    ${verbeter}
  </div>`;
}
