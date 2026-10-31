/* arquivo: js/state.js — Estado compartilhado: canais, canal atual, microfone, mute e conexões com os pares. */

let channels = [], cur = null, micStream = null, screenStream = null, localTile = null;
let muted = false, deaf = false;
const peers = new Map();
