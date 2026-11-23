import { PRESET_LIST, DEFAULT_PICKS, b64e } from './game.js';

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

export function showSetup() {
  document.getElementById('splash')?.classList.add('hidden');
  document.body.classList.add('in-setup');
  const el = document.createElement('div');
  el.className = 'setup';
  el.innerHTML = `
    <div class="setup-card">
      <div class="setup-kicker">PLAYER 2 HAS ENTERED THE CHAT</div>
      <h1>BOYFRIEND <span>MODE</span></h1>
      <p class="setup-sub">He's too busy playing GTA? Make him a GTA where the missions are you.</p>
      <div class="setup-row">
        <label>Your name<input id="s-her" maxlength="24" placeholder="Bella" /></label>
        <label>His name<input id="s-him" maxlength="24" placeholder="Jake" /></label>
      </div>
      <div class="setup-label">Pick his missions</div>
      <div class="chips" id="s-chips">${PRESET_LIST.map(([id, t]) => `<button class="chip${DEFAULT_PICKS.includes(id) ? ' on' : ''}" data-id="${id}">${esc(t)}</button>`).join('')}</div>
      <div class="setup-row custom"><input id="s-custom" maxlength="60" placeholder="Write your own: e.g. Bring me a Crumbl cookie" /><button id="s-add">Add</button></div>
      <div class="chips" id="s-own"></div>
      <label class="full">Message when he wins<textarea id="s-msg" maxlength="240" rows="2" placeholder="Okay fine, you can go back to your game now. Love you."></textarea></label>
      <button class="setup-go" id="s-go">MAKE HIS GAME</button>
      <div class="setup-out hidden" id="s-out">
        <div class="setup-label">Send him this link</div>
        <div class="setup-link"><input id="s-link" readonly /><button id="s-copy">Copy</button></div>
        <a id="s-play" class="setup-play" href="#">Preview his game →</a>
      </div>
    </div>`;
  document.body.appendChild(el);
  const own = [];
  const $ = (id) => el.querySelector('#' + id);
  $('s-chips').addEventListener('click', (e) => e.target.closest('.chip')?.classList.toggle('on'));
  const add = () => {
    const v = $('s-custom').value.trim();
    if (!v || own.length >= 3) return;
    own.push(v); $('s-custom').value = '';
    $('s-own').innerHTML = own.map((t) => `<span class="chip on">${esc(t)}</span>`).join('');
  };
  $('s-add').onclick = add;
  $('s-custom').addEventListener('keydown', (e) => { if (e.key === 'Enter') add(); });
  $('s-go').onclick = () => {
    const picks = [...el.querySelectorAll('#s-chips .chip.on')].map((c) => c.dataset.id);
    const m = [...picks, ...own.map((c) => ({ c }))].slice(0, 8);
    if (!m.length) { $('s-go').textContent = 'PICK AT LEAST ONE MISSION'; return; }
    const g = { h: $('s-her').value.trim() || 'Your girlfriend', b: $('s-him').value.trim() || 'Babe', m, x: $('s-msg').value.trim() };
    const url = `${location.origin}${location.pathname}?g=${b64e(g)}`;
    $('s-link').value = url; $('s-play').href = url;
    $('s-out').classList.remove('hidden');
    $('s-go').textContent = 'UPDATE LINK';
  };
  $('s-copy').onclick = async () => {
    try { await navigator.clipboard.writeText($('s-link').value); } catch { $('s-link').select(); document.execCommand('copy'); }
    $('s-copy').textContent = 'Copied!';
  };
}

export function showEnd(g) {
  if (document.querySelector('.endcard')) return;
  const el = document.createElement('div');
  el.className = 'endcard';
  el.innerHTML = `
    <div class="end-kicker">ALL MISSIONS PASSED</div>
    <h1>BOYFRIEND<br/>OF THE YEAR</h1>
    <div class="end-name">${esc(g.him)}</div>
    ${g.msg ? `<p class="end-msg">"${esc(g.msg)}"<br/><span>— ${esc(g.her)}</span></p>` : ''}
    <p class="end-cta">Screenshot this and send it to ${esc(g.her)}</p>
    <div class="end-btns"><button id="e-back">Keep playing</button><a href="${location.pathname}">Make your own</a></div>`;
  document.body.appendChild(el);
  el.querySelector('#e-back').onclick = () => el.remove();
}
