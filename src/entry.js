import './style.css';
import '@fontsource/anton/400.css';
import '@fontsource/inter/600.css';
import '@fontsource/inter/700.css';
import '@fontsource/inter/800.css';
import '@fontsource/inter/900.css';
import { readGame } from './game.js';
import { showSetup } from './setup.js';

const g = readGame();
if (g) {
  window.__defaultName = g.him;
  const k = document.querySelector('#splash .kicker');
  if (k) k.textContent = `${g.her} made this game for ${g.him}`;
  import('./main.js');
} else showSetup();
