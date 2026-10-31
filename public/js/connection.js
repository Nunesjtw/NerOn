/* arquivo: js/connection.js — Nome, código de acesso, socket.io e servidores ICE (STUN/TURN). */

/* ---------- conexão ---------- */
let name = localStorage.name || prompt('Seu nome:') || 'Eu';
localStorage.name = name;
let code = localStorage.code || '';

const socket = io({ autoConnect: false });
let ice = [{ urls: 'stun:stun.l.google.com:19302' }];
fetch('/ice').then((r) => r.json()).then((j) => (ice = j)).catch(() => {});
function start() { socket.auth = { name, code }; socket.connect(); }
socket.on('connect_error', (e) => {
  if (e.message === 'code') {
    const c = prompt('Código de acesso:');
    if (c === null) return;
    code = c; localStorage.code = c; start();
  }
});
