import{i as e,n as t,o as n,s as r,t as i}from"./firebase-config-DYsVWJaX.js";async function a(e,t,n,r,i,a,o){let s=document.getElementById(t),c=document.getElementById(n),l=document.getElementById(r),u=s.value.trim().toLowerCase();if(!u)return;let d=await crypto.subtle.digest(`SHA-256`,new TextEncoder().encode(u)),f=Array.from(new Uint8Array(d)).map(e=>e.toString(16).padStart(2,`0`)).join(``);(i[e]||[]).includes(f)?(s.classList.remove(`fout`),c.className=`puzzel-feedback correct`,c.textContent=`Correct — Firebase wordt bijgewerkt…`,l.disabled=!0,a()):(s.classList.add(`fout`),c.className=`puzzel-feedback fout`,c.textContent=o||`Niet correct.`,setTimeout(()=>s.classList.remove(`fout`),1500))}function o(e){let t=document.getElementById(e);if(!t)return;let n=t.querySelectorAll(`.hint-stap`),r=t.querySelector(`.hint-verder`),i=t.querySelector(`.hint-knop`);for(let e of n)if(e.classList.contains(`verborgen`)){e.classList.remove(`verborgen`),i?.classList.add(`verborgen`);let t=[...n].some(e=>e.classList.contains(`verborgen`));r&&(t?r.classList.remove(`verborgen`):r.classList.add(`verborgen`));return}}window.volgendHint=o;var s=3600*1e3,c=null,l=null,u=!1,d=!1;async function f(a){l=a;let o=e(i,`sessions/${a}/timerGestart`),s=await t(o);(!s.exists()||s.val()===null)&&await r(o,n());let u=(await t(o)).val();u&&(h(),p(u),c&&clearInterval(c),c=setInterval(()=>p(u),1e3))}function p(e){let t=s-(Date.now()-e);if(t<=0){clearInterval(c),v();return}let n=Math.floor(t/6e4);n<=30&&!u&&(u=!0,_(30)),n<=10&&!d&&(d=!0,_(10));let r=document.getElementById(`timer-tijd-display`);r&&(r.textContent=m(t))}function m(e){let t=Math.max(0,Math.floor(e/1e3)),n=Math.floor(t/60),r=t%60;return`${String(n).padStart(2,`0`)}:${String(r).padStart(2,`0`)}`}function h(){let e=document.createElement(`button`);e.id=`timer-klok-knop`,e.className=`timer-klok-knop`,e.setAttribute(`title`,`Bekijk resterende onderzoekstijd`),e.setAttribute(`aria-label`,`Resterende onderzoekstijd`),e.innerHTML=`<i class="bi bi-clock"></i>`,e.addEventListener(`click`,g);let t=document.createElement(`div`);t.id=`timer-popup`,t.className=`timer-popup verborgen`,t.innerHTML=`
    <div class="timer-popup-kop">
      <span class="timer-popup-label">Onderzoekstijd</span>
      <button
        class="timer-popup-sluit"
        onclick="document.getElementById('timer-popup').classList.add('verborgen')"
        aria-label="Sluit"
      ><i class="bi bi-x"></i></button>
    </div>
    <div id="timer-tijd-display" class="timer-tijd-display">--:--</div>
    <p class="timer-popup-sub">Het intern dossier sluit na 60&nbsp;minuten.</p>
  `,document.body.appendChild(e),document.body.appendChild(t)}function g(){document.getElementById(`timer-popup`)?.classList.toggle(`verborgen`)}function _(e){document.getElementById(`timer-waarschuwing`)?.remove();let t=e<=10,n=t?`⚠ Dringend — nog 10 minuten`:`Melding — halftime`,r=t?`Het intern dossier van Lena Bogaert wordt automatisch gesloten als er geen rapport is ingediend.`:`Het kantoor van An Vermeersch sluit om 17u00. U heeft nog 30 minuten om uw rapport in te dienen.`,i=document.createElement(`div`);i.id=`timer-waarschuwing`,i.className=`timer-waarschuwing${t?` timer-waarschuwing-urgent`:``}`,i.innerHTML=`
    <div class="timer-waarschuwing-inhoud">
      <div class="timer-waarschuwing-titel">${n}</div>
      <div class="timer-waarschuwing-tekst">${r}</div>
    </div>
    <button
      class="timer-waarschuwing-sluit"
      onclick="this.closest('#timer-waarschuwing').remove()"
      aria-label="Sluit melding"
    ><i class="bi bi-x"></i></button>
  `,document.body.appendChild(i),setTimeout(()=>{i.isConnected&&(i.classList.add(`timer-waarschuwing-verdwijnen`),setTimeout(()=>i.remove(),500))},t?25e3:2e4)}function v(){let e=l?encodeURIComponent(l):``;window.location.href=`tijd-voorbij.html?sessie=${e}`}export{a as n,f as t};