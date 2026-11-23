// Boyfriend Mode: the girlfriend's custom game lives entirely in the share link (?g=...).
export const b64e = (o) => btoa(unescape(encodeURIComponent(JSON.stringify(o)))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const b64d = (s) => JSON.parse(decodeURIComponent(escape(atob(s.replace(/-/g, '+').replace(/_/g, '/')))));

export function readGame() {
  const g = new URLSearchParams(location.search).get('g');
  if (!g) return null;
  try { const d = b64d(g); return { her: String(d.h || 'Your girlfriend').slice(0, 24), him: String(d.b || 'Babe').slice(0, 24), missions: (d.m || []).slice(0, 8), msg: String(d.x || '').slice(0, 240) }; }
  catch { return null; }
}

export const PRESET_LIST = [
  ['boba', 'Boba run'], ['flowers', 'Flowers, just because'], ['bags', 'Hold my shopping bags'], ['outfit', '"Does this look good?"'],
  ['tacos', '2am taco run'], ['sunset', 'Sunset pic on the yacht'], ['fav', '"Who is your favorite?"'],
];
export const DEFAULT_PICKS = ['boba', 'flowers', 'bags', 'outfit', 'sunset'];
const FETCH_SPOTS = [[30, 0, -80], [-22, 0, -58], [-20, 0, 100], [62, 0, 13], [-38, 0, 38], [100, 1.6, 16]];

export function buildMissions(g) {
  const her = g.her;
  const P = {
    boba: { type: 'fetch', title: 'Boba Run', at: [-38, 0, 38], stall: 'BOBA', stallColor: '#c08bff', time: 120,
      ask: 'Babe. I need boba. Taro, oat milk, 50% sugar, extra pearls. You have two minutes.', brief: 'Taro, oat milk, 50% sugar. Do NOT mess this up.',
      goText: 'Get her <b>taro boba</b>', got: 'Taro, oat milk, 50%... nailed it. Get back to her!', passed: 'She said "omg you remembered"' },
    flowers: { type: 'fetch', title: 'Just Because', at: [62, 0, 13], stall: 'FLOWERS', stallColor: '#ff5c9a', time: 150,
      ask: 'Do you know what day it is? ...It is a normal day. Bring me flowers anyway.', brief: 'No reason. That is the point.',
      goText: 'Buy her <b>flowers</b>', got: 'Roses acquired. Get them to her before they wilt.', passed: 'Flowers delivered. Respect +100' },
    tacos: { type: 'fetch', title: '2AM Tacos', at: [-20, 0, 100], stall: 'TACOS 24/7', stallColor: '#ff9f1c', time: 120,
      ask: 'I am not hungry. ...Okay, get me three al pastor tacos. And do not eat any on the way.', brief: 'Three al pastor. Zero bites taken.',
      goText: 'Grab her <b>al pastor tacos</b>', got: 'Got the tacos. Resist. Do not eat one.', passed: 'Zero tacos eaten. Legendary.' },
    bags: { type: 'collect', title: 'Hold My Bags', spots: [[-22, 0, -58], [30, 0, -80], [36, 1.2, -67], [35, 0, -5]], time: 180,
      ask: 'I went a little crazy at the mall. Can you grab my bags? I left them... around.', brief: 'She left 4 shopping bags all over the city.',
      goText: 'Collect her <b>shopping bags</b>', got: 'All 4 bags. Your arms hurt. Worth it.', passed: 'Certified bag holder' },
    sunset: { type: 'fetch', title: 'Golden Hour', at: [100, 4.2, -10], time: 150,
      ask: 'The light is PERFECT right now. Meet me on the yacht deck and take my picture. Hurry!', brief: 'Top deck of the yacht. Golden hour waits for no one.',
      goText: 'Get to the <b>yacht top deck</b> for the pic', got: 'You got the shot. 47 photos. One is good. Show her!', passed: 'New profile pic unlocked' },
    outfit: { type: 'quiz', title: 'The Question', ask: 'Okay, be honest. Does this outfit look good?', question: 'Okay. Be honest. Does this look good on me?',
      options: ['You look amazing. Seriously.', 'It is... fine?', '*keeps playing GTA*'], correct: 0, wrong: 'Wrong answer. She is "fine". She is not fine.', passed: 'Correct answer. Phew.' },
    fav: { type: 'quiz', title: 'The Test', ask: 'Quick question. No pressure.', question: 'Who is your favorite person in the whole world?',
      options: ['My mom', `You, ${her}. Obviously.`, 'Lucia from GTA 6'], correct: 1, wrong: 'Bro. BRO.', passed: 'Right answer. Rage meter cooling.' },
  };
  const used = new Set(g.missions.flatMap((m) => (P[m] ? [P[m].at, ...(P[m].spots || [])] : [])).filter(Boolean).map(String));
  const free = FETCH_SPOTS.filter((s) => !used.has(String(s)));
  let k = 0;
  return g.missions.map((m) => {
    if (typeof m === 'string' && P[m]) return P[m];
    const text = String(m?.c || m || 'a surprise').slice(0, 60);
    return { type: 'fetch', title: 'Special Request', at: (free.length ? free : FETCH_SPOTS)[k++ % (free.length || FETCH_SPOTS.length)], stall: 'SHOP', stallColor: '#ff5c9a', time: 150,
      ask: `I need you to do something for me: ${text}.`, brief: text, goText: `<b>${text}</b>`, got: 'Done. Now go tell her.', passed: 'She is impressed. Rare.' };
  });
}
