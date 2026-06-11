import"./bootstrap-icons.min-C4R3Xioj.js";import"./base-DN8jL8UZ.js";import"./sentry-BDYHEha_.js";var e=document.querySelectorAll(`.experience-kaart, .experience-kaart-locked, .archief-kaart, .stap-nummer, .dossier-blok`);e.forEach(e=>e.classList.add(`fade-in-element`));var t=new IntersectionObserver(e=>{e.forEach(e=>{e.isIntersecting&&(e.target.classList.add(`zichtbaar`),t.unobserve(e.target))})},{threshold:.15});e.forEach(e=>t.observe(e));var n=document.querySelectorAll(`section[id]`),r=document.querySelectorAll(`.navbar-nav .nav-link`),i=new IntersectionObserver(e=>{e.forEach(e=>{if(e.isIntersecting){r.forEach(e=>e.classList.remove(`nav-link-actief`));let t=document.querySelector(`.navbar-nav .nav-link[href="#${e.target.id}"]`);t&&t.classList.add(`nav-link-actief`)}})},{rootMargin:`-40% 0px -55% 0px`});n.forEach(e=>i.observe(e));var a=document.getElementById(`datum`);a&&(a.min=new Date().toISOString().split(`T`)[0]);var o=document.getElementById(`reserveerForm`);o&&o.addEventListener(`submit`,async e=>{e.preventDefault();let t=o.querySelector(`button[type="submit"]`),n=t.innerHTML;t.disabled=!0,t.innerHTML=`<i class="bi bi-hourglass-split me-2"></i>Bezig met verzenden…`;try{if((await fetch(o.action,{method:`POST`,body:new FormData(o),headers:{Accept:`application/json`}})).ok)o.innerHTML=`
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
        `;else throw Error(`Formspree fout`)}catch{t.disabled=!1,t.innerHTML=n;let e=o.querySelector(`.formulier-fout`);e&&e.remove();let r=document.createElement(`p`);r.className=`formulier-fout mt-3 mb-0 text-center`,r.style.color=`#c0392b`,r.style.fontFamily=`var(--font-archief)`,r.innerHTML=`<i class="bi bi-exclamation-triangle me-1"></i>Er ging iets mis. Probeer het opnieuw of stuur een mail.`,o.appendChild(r)}}),console.log(`%cBUREAU X — INTERN ARCHIEF`,`font-family: monospace; font-size: 14px; letter-spacing: 2px; color: #c49a2a;`,`

Je zoekt op plekken waar anderen niet kijken. Goede reflex, speurder.
Het archief reageert op haar naam. Typ die maar eens, gewoon op de pagina.`);var s=``,c=`lena`;function l(){if(document.querySelector(`.easter-overlay`))return;let e=document.createElement(`div`);e.className=`easter-overlay`,e.setAttribute(`role`,`dialog`),e.setAttribute(`aria-label`,`Verborgen archiefstuk`),e.innerHTML=`
    <div class="easter-kaart">
      <span class="easter-stempel">Vermist</span>
      <p class="easter-label">Archiefstuk B-X/14 &middot; niet voor publicatie</p>
      <h2>Gezocht: Lena Bogaert</h2>
      <p>Laatst gezien op een dinsdagochtend in mei, Geel.</p>
      <p>Bed opgemaakt. Jas weg. Geen briefje.</p>
      <p>Wie iets weet, opent dossier 14. Wie niets weet ook.</p>
      <p class="easter-sluiten">Klik om dit archiefstuk terug te leggen.</p>
    </div>
  `;let t=()=>{e.remove(),document.removeEventListener(`keydown`,n)},n=e=>{e.key===`Escape`&&t()};e.addEventListener(`click`,t),document.addEventListener(`keydown`,n),document.body.appendChild(e)}document.addEventListener(`keydown`,e=>{let t=e.target;t&&(t.tagName===`INPUT`||t.tagName===`TEXTAREA`||t.tagName===`SELECT`||t.isContentEditable)||e.key.length===1&&(s=(s+e.key.toLowerCase()).slice(-4),s===c&&(s=``,l()))});