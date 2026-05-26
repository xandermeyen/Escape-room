import { luisterNaarStatus, puzzelVoltooid } from '../../../shared/js/session.js';
import { volgendHint, controleerAntwoordHash } from '../../../shared/js/utils.js';
import { startAchtergrond, speelUnlock, speelVerhaalFragment } from './audio.js';
import { initialiseerTimer } from '../../../shared/js/timer.js';

let _audioGestart = false;

// Bijhouden welke puzzels al een fragment getriggerd hebben
const _fragmentenAfgespeeld = new Set();

// Fragmenten alleen spelen voor puzzels die tijdens DEZE sessie opgelost worden,
// niet voor puzzels die al opgelost waren vóór het laden van de pagina.
const _paginaLaadtijd = Date.now();
const WACHT_NA_LADEN  = 4000; // ms — Firebase-initiële snapshot duurt doorgaans < 2 s

function zorgVoorAudio() {
  if (_audioGestart) return;
  _audioGestart = true;
  startAchtergrond('a');
}

// Sessie ophalen uit URL
const params = new URLSearchParams(window.location.search);
const sessie = params.get('sessie');

if (!sessie) {
  window.location.href = 'index.html';
}

// ── Browsernavigatie blokkeren ────────────────────────────
// Voorkomt dat spelers per ongeluk de game verlaten via
// terugknop, muisknop of meerdere stappen terug.
// Wordt uitgeschakeld zodra ze bewust naar einde.html gaan.
let _gameBeschermd = true;

history.pushState({ scherm: 'game' }, '');
window.addEventListener('popstate', () => {
  if (_gameBeschermd) history.pushState({ scherm: 'game' }, '');
});
window.addEventListener('beforeunload', (e) => {
  if (_gameBeschermd) {
    e.preventDefault();
    e.returnValue = '';
  }
});

// Timer starten (na sessie-definitie)
initialiseerTimer(sessie);

// Casenummer tonen in systeembalk
document.getElementById('sys-case').textContent =
  `Intern dossier · Ref. OPZ-2026-0506-LB · Sessie ${sessie}`;


// ── Tabnavigatie ──────────────────────────────────────────
document.querySelectorAll('.tab:not(.slot)').forEach(tab => {
  tab.addEventListener('click', () => {
    zorgVoorAudio();
    const doel = tab.dataset.tab;
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('actief', 'nieuw-doc'));
    document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('actief'));
    tab.classList.add('actief');
    document.getElementById(`panel-${doel}`)?.classList.add('actief');
  });
});


// ── Voortgangsbalk bijwerken ──────────────────────────────
function updateVoortgang(p) {
  const stappen  = ['vp1','vp2','vp3','vp4','vp5'];
  const voltooid = [p.p1, p.p2, p.p3, p.p4, p.p5];
  const aantalKlaar = voltooid.filter(Boolean).length;

  stappen.forEach((id, i) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.className = 'vp-stap';
    if (voltooid[i])            el.classList.add('vp-klaar');
    else if (i === aantalKlaar) el.classList.add('vp-bezig');
    else                        el.classList.add('vp-open');
  });
}


// ── Tabs vrijgeven op basis van Firebase-status ───────────
function updateTabs(p) {
  const tabAtelier     = document.getElementById('tab-atelier');
  const tabIntakefiche = document.getElementById('tab-intakefiche');
  const tabBijlage     = document.getElementById('tab-bijlage');

  // Atelier: vrijgegeven na P1
  if (p.p1 && tabAtelier.classList.contains('slot')) {
    zorgVoorAudio();
    speelUnlock();
    tabAtelier.classList.remove('slot');
    tabAtelier.textContent = 'Atelier';
    tabAtelier.classList.add('nieuw-doc');
    tabAtelier.addEventListener('click', () => {
      zorgVoorAudio();
      document.querySelectorAll('.tab').forEach(t => t.classList.remove('actief', 'nieuw-doc'));
      document.querySelectorAll('.tab-panel').forEach(panel => panel.classList.remove('actief'));
      tabAtelier.classList.add('actief');
      document.getElementById('panel-atelier').classList.add('actief');
    });
  }

  // Intakefiche: vrijgegeven na P2 én P3
  if (p.p2 && p.p3 && tabIntakefiche.classList.contains('slot')) {
    zorgVoorAudio();
    speelUnlock();
    tabIntakefiche.classList.remove('slot');
    tabIntakefiche.textContent = 'Intakefiche';
    tabIntakefiche.classList.add('nieuw-doc');
    tabIntakefiche.addEventListener('click', () => {
      zorgVoorAudio();
      document.querySelectorAll('.tab').forEach(t => t.classList.remove('actief', 'nieuw-doc'));
      document.querySelectorAll('.tab-panel').forEach(panel => panel.classList.remove('actief'));
      tabIntakefiche.classList.add('actief');
      document.getElementById('panel-intakefiche').classList.add('actief');
    });
  }

  // Bijlage D: vrijgegeven na P4
  if (p.p4 && tabBijlage.classList.contains('slot')) {
    zorgVoorAudio();
    speelUnlock();
    tabBijlage.classList.remove('slot');
    tabBijlage.textContent = 'Bijlage D';
    tabBijlage.classList.add('nieuw-doc');
    tabBijlage.addEventListener('click', () => {
      zorgVoorAudio();
      document.querySelectorAll('.tab').forEach(t => t.classList.remove('actief', 'nieuw-doc'));
      document.querySelectorAll('.tab-panel').forEach(panel => panel.classList.remove('actief'));
      tabBijlage.classList.add('actief');
      document.getElementById('panel-bijlage').classList.add('actief');
    });
  }

  // ── Verhaalfragmenten na puzzeloplossing ─────────────────
  ['p1','p2','p3','p4','p5'].forEach(nr => {
    if (p[nr] && !_fragmentenAfgespeeld.has(nr)) {
      _fragmentenAfgespeeld.add(nr);
      if (Date.now() - _paginaLaadtijd > WACHT_NA_LADEN) {
        zorgVoorAudio();
        speelVerhaalFragment('a', nr);
      }
    }
  });

  // Voltooide puzzels markeren als verborgen
  ['p1','p2','p3','p4','p5'].forEach((nr, i) => {
    if (p[nr]) markeerVoltooid(`puzzel-${i + 1}`);
  });

  // Eindelink tonen als alle puzzels opgelost zijn
  if (p.p5 && !document.getElementById('einde-link')) {
    const balk     = document.createElement('a');
    balk.id        = 'einde-link';
    balk.href      = `einde.html?sessie=${sessie}`;
    balk.className = 'einde-link-balk';
    balk.innerHTML = '<i class="bi bi-arrow-right-circle me-2"></i>Alle puzzels opgelost — dien het rapport in';
    balk.addEventListener('click', () => { _gameBeschermd = false; });
    document.querySelector('.tabs').insertAdjacentElement('afterend', balk);
  }
}

function markeerVoltooid(id) {
  const blok = document.getElementById(id);
  if (!blok) return;
  blok.classList.add('verborgen');
}


// ── Puzzel-antwoorden (SHA-256 gehasht) ───────────────────
// Plain-text antwoorden staan niet in de broncode.
// Gebruik de console-snippet in utils.js om hashes te genereren.
const antwoordHashes = {
  p1: [
    '6d95368648b569fb1fe2adced89be071011bb3f9f82abf498daf495cc213116e', // dinsdag donderdag
    '5443975707db4d27536283ba2581340e52064790e20a31b12f45fcc421618e4d', // dinsdag en donderdag
  ],
  p2: [
    '0ba7ea9cf252f255e39e41ea00307fe7995436e190d08bc4adf70da603d609e9', // diest
  ],
  p3: [
    '2c624232cdd221771294dfbb310aca000a0df6ac8b66b696d90ef06fdefb64a3', // 8
    'fb33ab7105db46d8a43042ad35f9c42eb4f1eb4cb7ae1cf4b1490c4cb2a5d585', // acht
    '4b40153ffce0d94e69b84b4969edfed019723fe545ecae2cfb4c719aee52c274', // 8 weken
    'e4522c2a2595d6fa20e90e1fe1265ae20d0dc0f9b35a88d5579bfc0cdef6b6ff', // acht weken
  ],
  p4: [
    '91ada21b3f9f3b21939e6a7c3154c4f7cf002db220306095cb48010c84f4efaa', // marie stas
    'c6d17a3613b9914e68707fcfac8410f097643bc5840681bb533030d73cbb18f8', // marie
  ],
  p5: [
    '89f2a5f508866dcf1498b9e2059f33663672ddfc2a553f97bd17373545a43f82', // 07:35
    '27d40a0e226fb1e8e4ab8ebac2cb17f8de544c733db677ce556d0c9144a1c82d', // 7:35
  ],
};

['p1','p2','p3','p4','p5'].forEach(nr => {
  const puzzelNr = parseInt(nr.replace('p', ''));
  document.getElementById(`btn-${nr}`)?.addEventListener('click', () =>
    controleerAntwoordHash(
      nr, `input-${nr}`, `feedback-${nr}`, `btn-${nr}`,
      antwoordHashes,
      () => puzzelVoltooid(sessie, puzzelNr),
      'Niet correct. Overleg opnieuw met Speler B.'
    )
  );
  document.getElementById(`input-${nr}`)?.addEventListener('keydown', e => {
    if (e.key === 'Enter') document.getElementById(`btn-${nr}`)?.click();
  });
});


// ── Firebase live luisteren ───────────────────────────────
luisterNaarStatus(sessie, (puzzels) => {
  const p = puzzels || {};
  updateVoortgang(p);
  updateTabs(p);
});
