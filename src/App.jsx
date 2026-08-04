import React, { useState, useMemo, useEffect, useRef } from "react";

/* =====================================================
   GESTOR DE FUNDO — v3
   • Você define a taxa (cliente pode recusar)
   • 2 modos: Fundo Clássico × Marketplace
   • HUD de venda visual (carteira + tokens)
   Simulação educacional · dinheiro fictício
   ===================================================== */

const C = {
  bg: "#07100C", panel: "#0F1A14", panel2: "#16241C", line: "#22352A",
  green: "#4ADE80", greenDark: "#16A34A", amber: "#FBBF24", red: "#F87171",
  blue: "#60A5FA", text: "#EDF5EF", mute: "#8FA89A",
};

const PESSOAS = ["👩‍🦰","👨‍🦱","👨‍🌾","👩‍🍳","🧑‍🔧","👨‍💼","👩‍⚕️","🧑‍🎨","🧔","👩‍🏫","👨‍🔬"];
const NOMES = ["Maria","José","Ana","Carlos","Fê","Paulo","Ju","Rafa","Camila","Bruno","Lari","Diego","Paty","Thiago","Aline","Marcão","Rê","Guga","Bia","Felipe"];

const BIOS_NEGOCIO = [
  "as vendas dobraram no fim do ano", "ponto alugado, freguesia fiel", "sonha em abrir a 2ª unidade",
  "trabalha 12h por dia, não reclama", "começou vendendo na garagem", "cliente fiel que volta sempre",
  "sobreviveu à pandemia, tá renascendo", "primeira empresa da família",
];

// histórico de crédito: quem nunca pegou é incógnita, quem já quitou é mais confiável
const HISTORICOS = [
  { rot: "nunca pegou empréstimo", mult: 1.15 },
  { rot: "já quitou 1 empréstimo ✅", mult: 1 },
  { rot: "já quitou 3 empréstimos ✅", mult: 0.9 },
];

const MESES = 12; // duração da partida

const RISCO = { 1: 0.14, 2: 0.085, 3: 0.05, 4: 0.028, 5: 0.014 };
const TAXA  = { 1: 0.052, 2: 0.043, 3: 0.036, 4: 0.029, 5: 0.023 };

// fundo único de R$ 1 milhão — crédito PME de verdade
const OPEX = 9000;          // equipe, sistema e cobrança por mês
const FUNDING = 0.003;      // investidor recebe CDI + 3,6% a.a. (faixa real de cota sênior)
// MERCADO = em que ano do Brasil você está jogando (muda calote e frequência de crise)
const MERCADOS = {
  calmo:  { nome: "calmo",  icone: "🕊️", risco: 0.7,  crise: 0.08, notaBase: 50, notaMult: 40 },
  normal: { nome: "normal", icone: "⚖️", risco: 0.9,  crise: 0.14, notaBase: 58, notaMult: 45 },
  brabo:  { nome: "brabo",  icone: "💀", risco: 1.05, crise: 0.20, notaBase: 66, notaMult: 50 },
};

const FALAS_OK = ["Fechado! 🤝", "Contrato assinado! ✍️", "Mais um na carteira! 📈"];
const FALAS_RECUSA = ["recusou! Achou caro. 😤", "foi pro concorrente… 🏃", "disse 'tá louco?' e saiu. 💨"];
const FALAS_REJEITA = ["Melhor prevenir… 🛡️", "Foi mal, próximo! ➡️", "Sem chance pra esse. 🙅"];

const fmt = (v) => "R$ " + Math.round(Math.abs(v)).toLocaleString("pt-BR");
const pctm = (v) => (v * 100).toFixed(1).replace(".", ",");

/* ---------- som (sintetizado no navegador, sem arquivos) ---------- */
let AC = null, musicTimer = null, somLigado = true;
function actx() {
  if (typeof window === "undefined") return null;
  if (!AC) AC = new (window.AudioContext || window.webkitAudioContext)();
  if (AC.state === "suspended") AC.resume();
  return AC;
}
// som de ÓRGÃO: ataque suave, nota SUSTENTADA até o fim, harmônicos — pra música de verdade (o tom() é percussivo)
function orgao(freq, dur, delay = 0, vol = 0.15) {
  if (!somLigado) return;
  try {
    const a = actx(); if (!a) return;
    const toca = () => {
      const t = a.currentTime + delay;
      [[freq, vol], [freq * 2, vol * 0.22], [freq / 2, vol * 0.45], [freq * 1.004, vol * 0.35]].forEach(([f, v]) => {
        const o = a.createOscillator(), g = a.createGain();
        o.type = "triangle"; o.frequency.value = f;
        g.gain.setValueAtTime(0.0001, t);
        g.gain.linearRampToValueAtTime(v, t + 0.05);        // respira ao entrar
        g.gain.setValueAtTime(v, t + Math.max(0.06, dur * 0.78)); // SEGURA a nota (o segredo)
        g.gain.exponentialRampToValueAtTime(0.001, t + dur);
        o.connect(g); g.connect(a.destination);
        o.start(t); o.stop(t + dur + 0.05);
      });
    };
    if (a.state === "suspended") a.resume().then(toca).catch(() => {});
    else toca();
  } catch (e) {}
}
function tom(freq, dur = 0.12, type = "sine", vol = 0.14, delay = 0) {
  if (!somLigado) return;
  try {
    const a = actx(); if (!a) return;
    const toca = () => {
      const o = a.createOscillator(), g = a.createGain();
      o.type = type; o.frequency.value = freq;
      const t = a.currentTime + delay;
      g.gain.setValueAtTime(vol, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + dur);
      o.connect(g); g.connect(a.destination);
      o.start(t); o.stop(t + dur + 0.02);
    };
    // o navegador entrega o contexto SUSPENSO até o 1º gesto — sem isso as primeiras notas eram engolidas (o bug do "clica 3x pra tocar")
    if (a.state === "suspended") a.resume().then(toca).catch(() => {});
    else toca();
  } catch (e) {}
}
const SFX = {
  clique: () => tom(520, 0.06, "square", 0.07),
  partida: () => { // apito de largada: três toques subindo + o "VALENDO!"
    [523, 659, 784].forEach((f, i) => tom(f, 0.09, "square", 0.1, i * 0.12));
    tom(1047, 0.55, "triangle", 0.13, 0.42);
    [523, 659, 784].forEach((f) => tom(f, 0.55, "sine", 0.05, 0.42));
  },
  aprova: () => { tom(660, 0.09); tom(990, 0.12, "sine", 0.12, 0.08); },
  rejeita: () => tom(200, 0.12, "square", 0.1),
  recusa: () => { tom(330, 0.1); tom(220, 0.14, "sine", 0.12, 0.09); },
  venda: () => { tom(1250, 0.05, "square", 0.09); tom(1650, 0.08, "square", 0.09, 0.06); },
  carta: () => tom(480, 0.05, "triangle", 0.08),
  calote: () => { tom(180, 0.18, "sawtooth", 0.15); tom(120, 0.25, "sawtooth", 0.15, 0.12); },
  mes: () => { tom(300, 0.08, "sine", 0.08); tom(420, 0.08, "sine", 0.08, 0.06); },
  win: () => { // fanfarra: arpejo subindo + acorde final brilhando
    [523, 659, 784, 1047, 1319].forEach((f, i) => tom(f, 0.16, "triangle", 0.13, i * 0.11));
    [1047, 1319, 1568].forEach((f) => tom(f, 0.9, "sine", 0.09, 0.62));
    tom(523 / 2, 1.1, "sine", 0.08, 0.62);
  },
  lose: () => { // GAME OVER clássico: escorregada rápida ladeira abaixo + baque final
    [523, 494, 440, 392, 330, 262].forEach((f, i) => tom(f, 0.1 + i * 0.02, "square", 0.09, i * 0.11));
    tom(131, 0.5, "triangle", 0.13, 0.72);
    tom(65, 1.2, "sawtooth", 0.11, 0.85); // o baque
  },
  winFraco: () => [523, 494, 523].forEach((f, i) => tom(f, 0.2, "triangle", 0.1, i * 0.18)), // sobreviveu, mas sem glória
  meh: () => { tom(392, 0.18, "triangle", 0.1); tom(311, 0.3, "triangle", 0.1, 0.16); },      // desistiu no meio
  moedaMario: () => { tom(988, 0.08, "square", 0.11); tom(1319, 0.4, "square", 0.11, 0.08); }, // o plim clássico (Si→Mi)
  marchaFunebre: () => { // o cortejo em órgão — fecha o luto depois do lamento
    const b = 0.7;
    const Bbm = [116.54, 138.59, 174.61], Gb = [92.5, 116.54, 138.59], Fa = [87.31, 110, 130.81];
    const SEQ = [ // [início, nota, duração, acorde] em pulsos
      [0, 233.08, 1.0, Bbm], [1.0, 233.08, 0.72, Bbm], [1.75, 233.08, 0.25, Bbm], [2.0, 233.08, 1.0, Bbm],
      [3.0, 233.08, 1.0, Bbm], [4.0, 233.08, 0.72, Bbm], [4.75, 233.08, 0.25, Bbm], [5.0, 233.08, 1.0, Bbm],
      [6.0, 277.18, 1.0, Gb], [7.0, 261.63, 0.72, Fa], [7.75, 261.63, 0.25, Fa], [8.0, 233.08, 1.0, Bbm],
      [9.0, 233.08, 0.72, Gb], [9.75, 220.0, 0.25, Fa], [10.0, 233.08, 2.4, Bbm],
    ];
    SEQ.forEach(([t, f, d, ch]) => {
      orgao(f, d * b * 0.97, t * b, 0.15);
      ch.forEach((fa) => orgao(fa, d * b * 0.94, t * b, 0.04));
      orgao(ch[0] / 2, d * b, t * b, 0.07);
    });
  },
  lamento: () => {
    // sinos tristes num salão vazio: melodia simples em Lá menor, pausada, com o pad de órgão por baixo
    const SINO = (f, t, d = 1.6, v = 0.13) => { tom(f, d, "sine", v, t); tom(f * 2, d * 0.7, "sine", v * 0.25, t); };
    SINO(330, 0);          // Mi
    SINO(262, 1.1);        // Dó
    SINO(220, 2.2, 2.0);   // Lá…
    SINO(247, 4.0);        // Si
    SINO(220, 5.1);        // Lá
    SINO(196, 6.2, 2.6);   // Sol, morrendo devagar
    orgao(110, 4.1, 0.1, 0.06);   // pad grave (Lá1)
    orgao(98, 4.4, 4.05, 0.06);   // desce pro Sol — a esperança indo embora
    orgao(55, 8.5, 0.1, 0.05);    // sub contínuo
  },
  vitoria: () => { // hino de campeão: tá-tá-tá-TÃÃ… duas chamadas, escalada e acorde de estádio
    const MEL = [ // [freq, dur, início]
      [523, .13, 0], [523, .13, .16], [523, .13, .32], [659, .55, .48],     // tá-tá-tá-TÃÃ
      [587, .13, 1.25], [659, .13, 1.41], [784, .6, 1.57],                  // resposta subindo
      [659, .16, 2.5], [784, .16, 2.7], [880, .16, 2.9], [988, .16, 3.1],   // escalada
      [1047, 1.3, 3.35],                                                     // nota de glória
    ];
    MEL.forEach(([f, d, t]) => { tom(f, d, "triangle", 0.13, t); tom(f, d, "square", 0.04, t); });
    // acordes por baixo nos pontos fortes + acordão final de estádio
    [[0, [262, 330, 392]], [1.57, [392, 494, 587]], [3.35, [523, 659, 784, 1047]]].forEach(([t, acorde]) =>
      acorde.forEach((f) => tom(f, t === 3.35 ? 1.6 : .7, "sine", 0.055, t)));
    tom(131, 1.8, "sine", 0.1, 3.35); // baixão final
  },
  consolo: () => { // sobreviveu sem lucro: melodia doce que sobe, suspira e aterrissa quentinha
    const N = [[659, .4, 0], [784, .4, .45], [880, .65, .9], [784, .35, 1.65], [659, .5, 2.05], [587, .45, 2.6], [523, 1.3, 3.1]];
    N.forEach(([f, d, t]) => tom(f, d, "triangle", 0.11, t));
    tom(262, 4.2, "sine", 0.05, 0);                              // pedal grave segurando tudo
    [523, 659, 784].forEach((f) => tom(f, 1.4, "sine", 0.05, 3.1)); // acorde final acolhedor
  },
  ding: () => { tom(1568, 0.1, "triangle", 0.1); tom(2093, 0.35, "sine", 0.08, 0.09) },   // troféu de cristal
  tanto: () => { // encerrou no meio: assobio simples de "bom… foi isso aí"
    const N = [[659, .28, 0], [659, .2, .34], [587, .28, .6], [523, .4, .92], [392, .8, 1.4]];
    N.forEach(([f, d, t]) => { tom(f, d, "sine", 0.1, t); tom(f / 2, d, "sine", 0.05, t); });
  },
  robo: () => { // bip-bop de robozinho — parece que ele tá conversando (a voz clássica, o João prefere)
    const b = 500 + Math.random() * 900;
    tom(b, 0.06, "square", 0.09); tom(b * 1.5, 0.07, "square", 0.08, 0.07); tom(b * 0.8, 0.06, "square", 0.07, 0.15);
  },
  choque: () => { // curto-circuito: rajada de bips doidos caindo de tom
    for (let i = 0; i < 9; i++) tom(1500 - i * 140 + Math.random() * 300, 0.05, "sawtooth", 0.08, i * 0.07);
    tom(60, 0.9, "sawtooth", 0.07, 0.65);
  },
};
// a trilha original, incrementada: baixo, harmonia e um ciclo 2x mais longo antes de repetir
// (a melodia v2 em Am-F-C-G foi guardada na playlist do FuzzQuest pra quando o João pedir)
const NOTAS = [
  220, 261.6, 329.6, 392, 329.6, 261.6, 246.9, 293.7,   // parte A (a melodia original)
  220, 261.6, 329.6, 440, 392, 329.6, 293.7, 246.9,     // parte B (variação que sobe mais)
];
let musicaQuer = false; // o jogador QUER música? (sobrevive à troca de aba)
function musica(ligar) {
  musicaQuer = !!ligar && somLigado;
  if (musicTimer) { clearInterval(musicTimer); musicTimer = null; }
  if (!ligar || !somLigado) return;
  let i = 0;
  musicTimer = setInterval(() => {
    const n = NOTAS[i % NOTAS.length];
    tom(n, 1.9, "triangle", 0.07);                          // pad principal (o de sempre)
    if (i % 2 === 0) tom(n / 2, 2.6, "sine", 0.05);         // baixo acompanhando por baixo
    if (i % 4 === 0) tom(n * 2, 1.3, "sine", 0.028);        // brilho uma oitava acima
    if (i % 8 === 4) tom(n * 1.5, 1.7, "triangle", 0.032);  // harmonia que entra de vez em quando
    i++;
  }, 880);
}
// pausa SEM esquecer que o jogador queria música — pra ela voltar quando a aba voltar
function pausarMusica() { if (musicTimer) { clearInterval(musicTimer); musicTimer = null; } }

const CSS = `
    html, body { overflow-x: hidden; }
    @keyframes pop { 0%{transform:scale(.6);opacity:0} 100%{transform:scale(1);opacity:1} }
    @keyframes shakeX { 0%,100%{transform:translateX(0)} 25%{transform:translateX(-8px)} 75%{transform:translateX(8px)} }
    @keyframes slideL { to{transform:translateX(-120%) rotate(-8deg);opacity:0} }
    @keyframes slideR { to{transform:translateX(120%) rotate(8deg);opacity:0} }
    @keyframes float { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-6px)} }
    @keyframes giro { 0%{transform:rotate(0) scale(1)} 50%{transform:rotate(220deg) scale(1.6)} 100%{transform:rotate(360deg) scale(1)} }
    @keyframes pulo { 0%{transform:translateY(0) scaleY(1)} 22%{transform:translateY(4px) scaleY(.72) scaleX(1.2)} 55%{transform:translateY(-30px) scaleY(1.12)} 80%{transform:translateY(3px) scaleY(.85)} 100%{transform:translateY(0) scaleY(1)} }
    @keyframes tremido { 0%,100%{transform:rotate(0)} 12%{transform:rotate(-24deg)} 30%{transform:rotate(20deg)} 50%{transform:rotate(-15deg)} 70%{transform:rotate(10deg)} 88%{transform:rotate(-5deg)} }
    @keyframes moonwalk { 0%{transform:translateX(0)} 35%{transform:translateX(-40px) rotate(-9deg)} 70%{transform:translateX(14px) rotate(6deg)} 100%{transform:translateX(0)} }
    .pop{animation:pop .35s ease} .shake{animation:shakeX .35s ease}
    .left{animation:slideL .3s ease forwards} .right{animation:slideR .3s ease forwards}
    .float{animation:float 2.4s ease-in-out infinite}
    .giro{display:inline-block;animation:giro .8s ease}
    .pulo{display:inline-block;animation:pulo .7s ease}
    .tremido{display:inline-block;animation:tremido .7s ease}
    .moonwalk{display:inline-block;animation:moonwalk .9s ease}
    button{transition:transform .15s ease, filter .15s ease}
    button:hover{filter:brightness(1.15)}
    button:active{transform:scale(.96)}
    .opCalote:hover{transform:translateY(-3px)}
    @keyframes marioCoin { 0%{opacity:0;transform:translateY(0) rotateY(0)} 8%{opacity:1} 62%{opacity:1;transform:translateY(-74px) rotateY(400deg)} 100%{opacity:0;transform:translateY(-60px) rotateY(580deg)} }
    @keyframes trofeuPop { 0%{transform:scale(0) rotate(-25deg)} 55%{transform:scale(1.35) rotate(9deg)} 78%{transform:scale(.92) rotate(-4deg)} 100%{transform:scale(1) rotate(0)} }
    @keyframes caveiraCai { 0%{transform:translateY(-170px) rotate(-15deg);opacity:0} 10%{opacity:1} 55%{transform:translateY(0) rotate(0)} 67%{transform:translateY(-22px)} 79%{transform:translateY(0)} 87%{transform:translateY(-7px)} 100%{transform:translateY(0)} }
    @keyframes caveiraTreme { 0%,100%{transform:rotate(0)} 25%{transform:rotate(-8deg) translateX(-2px)} 75%{transform:rotate(8deg) translateX(2px)} }
    @keyframes eletrico { 0%,100%{transform:translate(0) rotate(0);filter:none} 20%{transform:translate(-4px,2px) rotate(-10deg);filter:hue-rotate(120deg) brightness(1.6)} 45%{transform:translate(4px,-3px) rotate(8deg)} 65%{transform:translate(-3px,-2px) rotate(-6deg);filter:hue-rotate(-90deg) brightness(1.4)} 85%{transform:translate(3px,2px) rotate(4deg)} }
    @keyframes cuspir { 0%{opacity:0;transform:translate(-50%,-50%) scale(.4) rotate(0)} 7%{opacity:1} 32%{opacity:1;transform:translate(calc(-50% + var(--dx)*0.55), calc(-50% - var(--vy))) scale(1) rotate(140deg)} 100%{opacity:.8;transform:translate(calc(-50% + var(--dx)), 58vh) rotate(600deg)} }
    @keyframes estouro { 0%{opacity:0;transform:translate(-50%,-50%) scale(.3)} 12%{opacity:1} 100%{opacity:0;transform:translate(calc(-50% + var(--dx)), calc(-50% + var(--dy))) scale(1.2) rotate(170deg)} }
    @keyframes cair { 0%{transform:translateY(0) rotate(0)} 100%{transform:translateY(115vh) rotate(600deg)} }
    @keyframes aura { 0%,100%{opacity:.45;transform:translate(-50%,-50%) scale(1)} 50%{opacity:.9;transform:translate(-50%,-50%) scale(1.25)} }
    @keyframes nota99pulsa { 0%,100%{transform:scale(1)} 50%{transform:scale(1.09)} }
    @keyframes despenca { to{transform:translateY(120vh) rotate(720deg)} }
    .despenca{animation:despenca .9s ease-in forwards}
    .trofeu{display:inline-block;animation:trofeuPop .75s cubic-bezier(.34,1.56,.64,1), float 2.6s ease-in-out .8s infinite}
    .nota99{display:inline-block;animation:nota99pulsa 1.6s ease-in-out infinite;color:#FFD700!important;text-shadow:0 0 24px rgba(255,215,0,.55),0 0 60px rgba(255,215,0,.25)}
    .caveira{display:inline-block;animation:caveiraCai 1.5s cubic-bezier(.3,.9,.4,1), caveiraTreme 3.2s ease-in-out 1.9s infinite}
    .eletrico{display:inline-block;animation:eletrico .2s linear infinite}
`;

const FALAS_ROBO = [
  "Tô de olho nos números. Sempre. 👀",
  "Spread é a diferença — e a diferença é tudo. 💸",
  "Cliente 1★ pedindo alto? Coragem, hein…",
  "Caixa parado rende, mas banco parado MORRE.",
  "Bip bop. Aprova esse não. Confia. 🤖",
  "Se a parcela não cabe no bolso, o calote cabe no seu.",
  "Eu já vi muita crise. Segura o caixa.",
  "Para de me cutucar e vai emprestar! 😤",
  "Consignado é o crédito mais seguro do país. Anota aí.",
];
const ANIMS_ROBO = ["giro", "pulo", "tremido", "moonwalk"];
const CARAS_ROBO = ["🥳", "😎", "🫡", "🤑", "🤖", "🕺"];
const FALAS_GLITCH = [
  "ERRO 0xC4LOT3 — c-c-cliente b-bom é o que p-p-pag— bzzzt",
  "§@#!% SPRE4D NEG4T1V0?? r-r-recalculando… ⚡",
  "vendendo t-t-tudo a 99% de d-deságio— NÃO. ERRO. ERRO. ⚡",
  "01001011 kkkk 01000101 aprova o 1★ apr— bzzzt NÃO APROVA",
];
// MODO CONSELHEIRO (formato final, definido pelo João em 04/08): o curto-circuito libera
// 3 ANÁLISES DO CLIENTE QUE ESTÁ NA MESA — uma frase, o fator que mais decide aquele pedido.
// Limitado a 1 desbloqueio por mês do jogo, pra não ficar fácil demais.
function dicaDoCliente(p) {
  if (!p) return null; // mesa vazia — não gasta análise
  const parcela = (p.valor * (1 + TAXA[p.score] * p.prazo)) / p.prazo;
  const comp = Math.round((parcela / p.renda) * 100); // % do faturamento comprometido
  if (p.gar) return "🧾 Tem garantia — quase não caloteia. Taxa justa fecha fácil.";
  if (comp > 45) return `A parcela come ~${comp}% do faturamento dele. Cheiro de calote.`;
  if (p.score <= 2 && p.valor >= 100000) return `${p.score}★ pedindo ${Math.round(p.valor / 1000)} mil? Coragem é isso aí.`;
  if (p.humor === "duro") return "Pechincheiro. Taxa alta ele recusa — vai na justa.";
  if (p.score >= 4 && comp <= 30) return `${p.score}★ e parcela leve (~${comp}%). Cliente de ouro.`;
  if (p.tempoNeg < 12) return "Menos de 1 ano de porta aberta. Negócio verde, risco extra.";
  if (comp <= 20) return `Parcela leve (~${comp}% do faturamento). Folga boa.`;
  return `Mediano: ${p.score}★, parcela ~${comp}%. Decide pelo teu caixa.`;
}

let SEQ = 1;
const QUER_PME = ["🏭 ampliar a produção", "🚛 renovar a frota", "🏪 abrir a 2ª loja", "📦 encher o estoque", "🛠️ maquinário novo", "💰 capital de giro", "🖥️ sistema novo", "👷 contratar equipe"];
const sorteia = (arr) => arr[Math.floor(Math.random() * arr.length)];
function novoPedido() {
  const score = 1 + Math.floor(Math.random() * 5);
  const valor = (4 + Math.floor(Math.random() * 13)) * 10000; // R$ 40 a 160 mil — faixa real de crédito PME
  const prazo = [6, 8, 10, 12][Math.floor(Math.random() * 4)];
  const quer = sorteia(QUER_PME);
  // ~35% das empresas oferecem travar os recebíveis como garantia
  const gar = Math.random() < 0.35 ? { icone: "🧾", rot: "recebíveis em garantia" } : null;
  // faturamento coerente com a parcela (compromete entre ~15% e ~50%)
  const parcelaJusta = (valor * (1 + TAXA[score] * prazo)) / prazo;
  const renda = Math.round(parcelaJusta / (0.15 + Math.random() * 0.35) / 100) * 100;
  return {
    id: SEQ++,
    emoji: sorteia(PESSOAS),
    nome: sorteia(NOMES),
    quer,
    bio: sorteia(BIOS_NEGOCIO),
    renda, rotRenda: "🏪 a empresa fatura",
    hist: sorteia(HISTORICOS),
    tempoNeg: 3 + Math.floor(Math.random() * 117), // meses de porta aberta
    score, valor, prazo, gar,
    humor: Math.random() < 0.45 ? "duro" : "deboa",
  };
}

function sorteiaMercado() {
  const r = Math.random();
  if (r < 0.3) return { rot: "🔥 comprador animado", adj: -0.03 };
  if (r < 0.75) return { rot: "😐 mercado normal", adj: 0 };
  return { rot: "🥶 comprador sumido", adj: 0.07 };
}

// demanda com sazonalidade real: fim de ano aquece (Natal/13º), começo de ano ainda agitado (IPVA, escola)
function novosPedidos(mes = 1) {
  const sazonal = mes >= 11 ? 2 : mes <= 2 ? 1 : 0;
  return Array.from({ length: Math.min(7, 3 + sazonal + Math.floor(Math.random() * 3)) }, novoPedido);
}

const INICIO = (modo = null, clima = "normal") => {
  return {
  tela: modo ? "jogo" : "intro",
  modo,                       // "fundo" | "mkt"
  clima,                      // "calmo" | "normal" | "brabo"
  mes: 1,
  caixa: 1000000,
  senior: 800000,
  cofre0: 200000,
  carteira: [],
  pedidos: novosPedidos(1),
  idx: 0,
  vendeuMes: false,
  mercado: sorteiaMercado(),
  fala: modo === "mkt" ? "Origina e repassa — lucro no giro! 🔁" : "Bora emprestar dinheiro! 🚀",
  anim: "",
  fila: [], filaIdx: 0,
  onda: 0, stress: 0,
  selic: 0.1425,            // Selic real de julho/2026
  totalEmprestado: 0, perdas: 0, gastoAcum: 0,
  processos: [],              // cobranças na justiça esperando sentença (paga ~2 meses depois)
  fim: null,
  };
};

const devido = (l) => l.parcela * l.restantes;
const meu = (l) => devido(l) * (1 - (l.vendido || 0));
// patrimônio de verdade: só o principal emprestado — juros contam quando a parcela cai
const principal = (l) => (l.valor / l.prazo) * l.restantes * (1 - (l.vendido || 0));

export default function App() {
  const [g, setG] = useState(() => INICIO());
  const [ajuda, setAjuda] = useState(false);
  const [som, setSom] = useState(true);
  const [qtd, setQtd] = useState(3); // tokens selecionados pra vender
  const [copiei, setCopiei] = useState(false);
  const [climaSel, setClimaSel] = useState("normal");
  const [robo, setRobo] = useState({ n: 0, anim: "", cara: "🤖" }); // cutucou o robô → animação aleatória
  const [roboChoque, setRoboChoque] = useState(false); // spam demais → curto-circuito
  const cliquesRobo = useRef([]);
  const dicasRobo = useRef(0);         // análises restantes do modo conselheiro (0 = inativo)
  const conselheiroMes = useRef(0);    // último mês do jogo em que o conselheiro foi desbloqueado (1x por mês)
  const avisoConselheiro = useRef(false); // logo após usar a análise, o próximo cutuco explica que acabou
  const [confEnc, setConfEnc] = useState(false); // trava de segurança do botão de encerrar
  const [fimFx, setFimFx] = useState({ queda: 0, chave: 0 }); // interações na tela final (caveira afundando etc)
  // decoração da tela final sorteada UMA vez por partida — senão qualquer clique re-sorteia e a chuva reinicia
  const fimDecor = useMemo(() => ({
    cuspe: Array.from({ length: 18 }, () => ({
      dx: (Math.random() < 0.5 ? -1 : 1) * (40 + Math.random() * 150),
      vy: 110 + Math.random() * 140,
      dur: 1.9 + Math.random() * 0.9, delay: Math.random() * 2.4,
      e: ["🎉", "✨", "🪙", "💸", "🎊"][Math.floor(Math.random() * 5)],
    })),
    chuvaOuro: Array.from({ length: 26 }, () => ({
      left: Math.random() * 100, dur: 2.6 + Math.random() * 2.4, delay: Math.random() * 3,
      size: 14 + Math.random() * 16, e: Math.random() < 0.6 ? "🪙" : "✨",
    })),
    estouro: Array.from({ length: 16 }, () => {
      const ang = Math.random() * Math.PI * 2, dist = 85 + Math.random() * 120;
      return {
        dx: Math.cos(ang) * dist, dy: Math.sin(ang) * dist - 30,
        dur: 0.8 + Math.random() * 0.5, delay: 0.3 + Math.random() * 0.4,
        e: ["🎉", "✨", "🪙", "💸", "🎊"][Math.floor(Math.random() * 5)],
      };
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [g.tela]);
  const [vendaFx, setVendaFx] = useState(0); // moedas voando quando vende tokens

  function reiniciar(modo = null) {
    setQtd(3); // seletor de tokens volta ao padrão a cada partida
    setCopiei(false);
    setFimFx({ queda: 0, chave: 0 });
    setG(INICIO(modo, climaSel));
  }

  // easter eggs da tela final: troféu re-pipoca com faísca · caveira afunda a cada clique até despencar · bandeira balança
  function clicarFim() {
    if (g.fim === "lose") {
      if (fimFx.queda) return; // já tá despencando
      SFX.calote();
      setFimFx((f) => ({ ...f, queda: 1 }));
      setTimeout(() => setFimFx((f) => ({ queda: 0, chave: f.chave + 1 })), 1600); // renasce caindo do céu
    } else {
      g.fim === "win" ? SFX.ding() : SFX.carta();
      setFimFx((f) => ({ ...f, chave: f.chave + 1 }));
    }
  }

  const M = MERCADOS[g.clima] || MERCADOS.normal;

  useEffect(() => {
    // seletor de tokens se ajusta ao mercado do mês (não "lembra" escolhas antigas do nada)
    setQtd((q) => Math.max(1, Math.min(q, maxTok)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [g.mes]);


  useEffect(() => {
    // saiu da aba: PAUSA (sem esquecer a vontade) · voltou: retoma de onde parou
    const aoOcultar = () => {
      if (document.hidden) pausarMusica();
      else if (musicaQuer && somLigado) musica(true);
    };
    document.addEventListener("visibilitychange", aoOcultar);
    window.addEventListener("pagehide", pausarMusica);
    return () => {
      musica(false);
      document.removeEventListener("visibilitychange", aoOcultar);
      window.removeEventListener("pagehide", pausarMusica);
    };
  }, []);

  // música já na ABERTURA: o navegador só libera áudio depois de um gesto do usuário.
  // Estratégia em 2 tempos pro som sair NA HORA: (1) cria o contexto já no carregamento
  // (fica suspenso, mas a placa de som acorda); (2) no 1º toque, resume + toca um buffer
  // MUDO — isso esquenta o caminho do áudio e a primeira nota de verdade sai sem atraso.
  const telaRef = useRef(g.tela);
  telaRef.current = g.tela;
  useEffect(() => {
    try { actx(); } catch (e) {} // acorda a placa de som cedo
    const unlock = () => {
      try {
        const a = actx();
        if (a) {
          if (a.state === "suspended") a.resume();
          const b = a.createBuffer(1, 1, 22050), s = a.createBufferSource();
          s.buffer = b; s.connect(a.destination); s.start(0); // buffer mudo: esquenta o pipeline
        }
      } catch (e) {}
      if (telaRef.current === "intro") musica(true);
      window.removeEventListener("pointerdown", unlock, true);
      window.removeEventListener("keydown", unlock, true);
      window.removeEventListener("touchstart", unlock, true);
    };
    // capture=true: dispara ANTES do clique chegar no botão — o som do próprio botão já sai destravado
    window.addEventListener("pointerdown", unlock, true);
    window.addEventListener("keydown", unlock, true);
    window.addEventListener("touchstart", unlock, true);
    return () => {
      window.removeEventListener("pointerdown", unlock, true);
      window.removeEventListener("keydown", unlock, true);
      window.removeEventListener("touchstart", unlock, true);
    };
  }, []);

  function alternarSom() {
    const novo = !som;
    setSom(novo);
    somLigado = novo;
    if (!novo) musica(false);
    else musica(true); // agora a trilha toca na intro também
  }

  const saldoCarteira = g.carteira.reduce((s, l) => s + meu(l), 0);
  const saldoPrincipal = g.carteira.reduce((s, l) => s + principal(l), 0);
  const cofre = g.caixa + saldoPrincipal - g.senior;
  const vida = Math.max(0, Math.min(1, cofre / g.cofre0));
  // tokenização RWA: carteira dividida em 10 tokens
  const maxTok = g.mercado.adj < 0 ? 10 : g.mercado.adj === 0 ? 6 : 3; // 🔥 até 10 · 😐 até 6 · 🥶 até 3
  const qtdOk = Math.max(1, Math.min(qtd, maxTok));
  // comprador esperto: o deságio cobre a perda esperada por calote + margem dele + humor do mercado + lote
  const riscoMedio = saldoCarteira ? g.carteira.reduce((s, l) => s + RISCO[l.score] * M.risco * (l.gar ? 0.4 : 1) * meu(l), 0) / saldoCarteira : 0;
  const prazoMedio = saldoCarteira ? g.carteira.reduce((s, l) => s + l.restantes * meu(l), 0) / saldoCarteira : 0;
  const perdaEsperada = (1 - Math.pow(1 - riscoMedio, prazoMedio * 0.55)) * 0.9;
  const descTok = (q) => Math.min(0.5, 0.03 + perdaEsperada + g.mercado.adj + (q / 10) * 0.05);
  const p = g.pedidos[g.idx];
  const acabou = g.idx >= g.pedidos.length;
  const semCaixa = p && g.caixa < p.valor;
  const compr = p ? ((p.valor * (1 + TAXA[p.score] * p.prazo)) / p.prazo) / p.renda : 0; // % da renda que a parcela come

  // opções de taxa: cliente pechincheiro recusa mais fácil · com garantia, ele consegue crédito mais barato em qualquer lugar
  const duro = p && p.humor === "duro";
  const tBase = p ? Math.max(0.013, TAXA[p.score] - (p.gar ? 0.008 : 0)) : 0;
  const opcoes = p ? [
    { rot: "😇", t: Math.max(0.011, tBase - 0.008), aceita: 1.0 },
    { rot: "🙂", t: tBase, aceita: duro ? 0.7 : 0.95 },
    { rot: "🤑", t: tBase + 0.015, aceita: duro ? 0.3 : 0.65 },
  ] : [];

  const nota = useMemo(() => {
    const rent = (cofre - g.cofre0) / g.cofre0;
    // calibrada por simulação (5000 partidas/estratégia): 99 = topo ~3% no peaceful, ~1% no hardcore
    const base = g.fim === "win" ? M.notaBase
      : g.fim === "out" ? 25 + Math.round(30 * (Math.min(g.mes, MESES) - 1) / MESES)
      : 20;
    return Math.max(1, Math.min(99, Math.round(base + rent * M.notaMult)));
  }, [cofre, g.cofre0, g.fim, g.mes, M]);

  // em 2 tempos pra animação ficar limpa: o card ATUAL desliza pra fora, SÓ DEPOIS o próximo entra
  const saindo = g.anim === "left" || g.anim === "right"; // card no meio da saída → segura os cliques
  function ofertar(op) {
    if (!p || semCaixa || saindo) return;
    const cliente = p;
    const aceitou = Math.random() < op.aceita;
    aceitou ? SFX.aprova() : SFX.recusa();
    setG((s) => ({
      ...s, anim: aceitou ? "right" : "left",
      fala: aceitou
        ? FALAS_OK[Math.floor(Math.random() * FALAS_OK.length)]
        : `${cliente.emoji} ${cliente.nome} ${FALAS_RECUSA[Math.floor(Math.random() * FALAS_RECUSA.length)]}`,
    }));
    setTimeout(() => setG((s) => {
      const base = { ...s, idx: s.idx + 1, anim: "pop" };
      if (!aceitou) return base;
      const parcela = (cliente.valor * (1 + op.t * cliente.prazo)) / cliente.prazo;
      return {
        ...base,
        caixa: s.caixa - cliente.valor,
        totalEmprestado: s.totalEmprestado + cliente.valor,
        carteira: [...s.carteira, { ...cliente, taxa: op.t, parcela, compr: parcela / cliente.renda, restantes: cliente.prazo, vendido: 0 }],
      };
    }), 330);
  }

  function rejeitar() {
    if (saindo) return;
    SFX.rejeita();
    setG((s) => ({ ...s, anim: "left", fala: FALAS_REJEITA[Math.floor(Math.random() * FALAS_REJEITA.length)] }));
    setTimeout(() => setG((s) => ({ ...s, idx: s.idx + 1, anim: "pop" })), 330);
  }

  function venderTokens(qtd, desc) {
    SFX.moedaMario();
    setVendaFx((n) => n + 1);
    setTimeout(() => setVendaFx(0), 1100);
    const frac = qtd / 10;
    setG((s) => {
      if (s.vendeuMes) return s;
      const saldo = s.carteira.reduce((t, l) => t + meu(l), 0);
      if (!saldo) return s;
      return {
        ...s,
        caixa: s.caixa + saldo * frac * (1 - desc),
        carteira: frac >= 0.999
          ? []
          : s.carteira.map((l) => ({ ...l, vendido: (l.vendido || 0) + frac * (1 - (l.vendido || 0)) })),
        vendeuMes: true,
        fala: `RWA! 🪙 Vendeu ${qtd} token${qtd > 1 ? "s" : ""} da carteira.`,
      };
    });
  }

  function encerrar() {
    musica(false);
    SFX.meh();
    setTimeout(() => SFX.tanto(), 1300);
    setG((s) => ({ ...s, fim: "out", tela: "fim" }));
  }

  function cutucarRobo() {
    if (roboChoque) return; // em curto-circuito ele não responde
    // MODO CONSELHEIRO ativo: UMA análise do CLIENTE DA MESA por desbloqueio
    if (dicasRobo.current > 0) {
      SFX.robo();
      const dica = dicaDoCliente(g.pedidos[g.idx]);
      setRobo((r) => ({ n: r.n + 1, anim: "pulo", cara: "🤖" }));
      if (!dica) { // mesa vazia — não gasta a análise
        setG((s) => ({ ...s, fala: "🔍 Sem cliente na mesa pra analisar. Roda o mês e me cutuca de novo! 📅" }));
        return;
      }
      dicasRobo.current = 0;
      avisoConselheiro.current = true; // o próximo cutuco explica que a análise acabou
      setG((s) => ({ ...s, fala: `🔍 ANÁLISE: ${dica}` }));
      return;
    }
    // acabou de gastar a análise do mês: um aviso claro, e aí volta ao normal
    if (avisoConselheiro.current) {
      avisoConselheiro.current = false;
      SFX.robo();
      setRobo((r) => ({ n: r.n + 1, anim: "tremido", cara: "🤖" }));
      setG((s) => ({ ...s, fala: "A análise do mês já foi. Mês que vem tem outra. 🤖" }));
      return;
    }
    const agora = Date.now();
    // precisa insistir DE VERDADE: 15 cliques rápidos numa janela de 6 segundos
    cliquesRobo.current = [...cliquesRobo.current.filter((t) => agora - t < 6000), agora];
    if (cliquesRobo.current.length >= 15) {
      // CURTO-CIRCUITO — treme, fala errado… e o curto pode destravar o modo conselheiro (1x por mês)
      cliquesRobo.current = [];
      setRoboChoque(true);
      SFX.choque();
      setRobo((r) => ({ n: r.n + 1, anim: "eletrico", cara: "😵‍💫" }));
      setG((s) => ({ ...s, fala: FALAS_GLITCH[Math.floor(Math.random() * FALAS_GLITCH.length)] }));
      setTimeout(() => {
        setRoboChoque(false);
        setRobo((r) => ({ n: r.n + 1, anim: "pulo", cara: "🤖" }));
        setG((s) => {
          if (conselheiroMes.current === s.mes) {
            // já usou o conselheiro neste mês — o curto não rende nada
            return { ...s, fala: "sistema reiniciado ✅ …as dicas deste mês já eram. Volta no próximo. 😤" };
          }
          conselheiroMes.current = s.mes;
          dicasRobo.current = 1;
          return { ...s, fala: "sistema reiniciado ✅ …o curto liberou 1 ANÁLISE DE CLIENTE 🔍 — me cutuca com um cliente na mesa!" };
        });
      }, 2600);
      return;
    }
    SFX.robo();
    setRobo((r) => ({
      n: r.n + 1,
      anim: ANIMS_ROBO[Math.floor(Math.random() * ANIMS_ROBO.length)],
      cara: CARAS_ROBO[Math.floor(Math.random() * CARAS_ROBO.length)],
    }));
    setG((s) => ({ ...s, fala: FALAS_ROBO[Math.floor(Math.random() * FALAS_ROBO.length)] }));
    setTimeout(() => setRobo((r) => (r.anim === "eletrico" ? r : { ...r, cara: "🤖" })), 1100); // a carinha volta ao normal
  }

  const textoNota = () =>
    `Tirei ${nota}/99 no Spread_ 💸 simulador do mercado de crédito (mercado ${M.icone} ${M.nome}).\nSobreviva 12 meses no comando do seu próprio banco: https://fuzzionx.com/spread`;

  async function copiarNota() {
    SFX.clique();
    try {
      await navigator.clipboard.writeText(textoNota());
    } catch {
      const ta = document.createElement("textarea");
      ta.value = textoNota();
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
    }
    setCopiei(true);
    setTimeout(() => setCopiei(false), 2500);
  }

  function compartilharNota() {
    SFX.clique();
    if (navigator.share) navigator.share({ text: textoNota() }).catch(() => {});
    else copiarNota();
  }

  function rodarMes() {
    SFX.mes();
    setG((s) => {
      const fila = [];
      const MM = MERCADOS[s.clima] || MERCADOS.normal;
      let { caixa, senior, perdas, onda, stress, selic } = s;
      let processos = s.processos || [];
      let carteira = s.carteira;
      const mult = onda > 0 ? 2 : 1;

      // MARKETPLACE: tenta repassar tudo antes de qualquer calote
      if (s.modo === "mkt" && carteira.length) {
        const travou = stress > 0 && Math.random() < 0.6;
        if (travou) {
          fila.push({ emoji: "🧊", titulo: "Ninguém comprou!", sub: "mercado travado — o estoque ficou com você (e o risco também)", delta: 0, cor: C.red, shake: true });
        } else {
          const saldo = carteira.reduce((t, l) => t + devido(l), 0);
          const sm = carteira.reduce((t, l) => t + l.score, 0) / carteira.length;
          const tm = carteira.reduce((t, l) => t + (l.taxa - TAXA[l.score]), 0) / carteira.length;
          const dM = Math.max(0.10, 0.19 - sm * 0.011 + (stress > 0 ? 0.08 : 0) + (tm > 0.005 ? 0.08 : 0));
          const recebe = saldo * (1 - dM);
          caixa += recebe;
          fila.push({ emoji: "🔁", titulo: "Carteira repassada!", sub: `investidores compraram · desconto ${pctm(dM)}%`, delta: recebe, cor: C.blue });
          carteira = [];
        }
      }

      // caixa parado rende meio CDI (a outra metade vira custo de administração)
      const rendeu = Math.max(0, caixa) * (selic / 12) * 0.5;
      caixa += rendeu;

      // FUNDO: parcelas e calotes (divididos com donos de tokens)
      let recebido = 0, quitados = 0; const sobrev = [];
      for (const l of carteira) {
        const perfil = (l.compr > 0.4 ? 1.25 : 1) * (l.hist ? l.hist.mult : 1) * (l.tempoNeg && l.tempoNeg < 12 ? 1.2 : 1);
        const rEf = RISCO[l.score] * MM.risco * mult * (l.gar ? 0.4 : 1) * perfil *
          (l.taxa > TAXA[l.score] + 0.005 ? 1.35 : l.taxa < TAXA[l.score] - 0.004 ? 0.85 : 1);
        if (Math.random() < rEf) {
          const perda = principal(l); // você perde o que emprestou e não voltou (juros futuros eram só promessa)
          perdas += perda;
          fila.push({
            emoji: "😬", titulo: "CALOTE!", sub: `${l.emoji} ${l.nome} parou de pagar — o que você faz?`,
            delta: -perda, cor: C.red, shake: true, calote: { perda },
          });
        } else {
          recebido += l.parcela * (1 - (l.vendido || 0));
          const resto = l.restantes - 1;
          if (resto > 0) sobrev.push({ ...l, restantes: resto });
          else quitados++;
        }
      }
      caixa += recebido;

      // investidores do fundo / banco
      const custo = senior * (selic / 12 + FUNDING);
      senior += custo;

      // custo operacional fixo (equipe, sistema, cobrança)
      caixa -= OPEX;

      // carta-resumo única do fechamento
      const liquido = recebido + rendeu - custo - OPEX;
      const partes = [];
      if (recebido > 0) partes.push(`💰 +${fmt(recebido)} parcelas`);
      if (rendeu > 0) partes.push(`💹 +${fmt(rendeu)} rendimento do caixa (CDI)`);
      partes.push(`🏦 –${fmt(custo)} juros dos investidores`);
      partes.push(`🏢 –${fmt(OPEX)} custo de operação (equipe/sistema)`);
      if (quitados > 0) partes.push(`🎉 ${quitados} ${quitados > 1 ? "quitaram" : "quitou"}`);
      fila.unshift({ emoji: "📊", titulo: "Fechamento do mês", sub: partes.join(" · "), delta: liquido, cor: liquido >= 0 ? C.green : C.amber });

      // eventos
      onda = Math.max(0, onda - 1);
      stress = Math.max(0, stress - 1);
      const r = Math.random();
      if (r < 0.12) { selic = Math.min(0.19, selic + 0.01); fila.push({ emoji: "📈", titulo: "Selic subiu!", sub: `${pctm(selic)}% a.a. — seu custo subiu`, delta: 0, cor: C.amber }); }
      else if (r < 0.20) { selic = Math.max(0.09, selic - 0.01); fila.push({ emoji: "📉", titulo: "Selic caiu", sub: `${pctm(selic)}% a.a. — custo aliviou`, delta: 0, cor: C.green }); }
      else if (r < 0.2 + MM.crise) {
        if (s.modo === "mkt") { stress = 2; fila.push({ emoji: "🥶", titulo: "Compradores sumiram!", sub: "descontos maiores por 2 meses", delta: 0, cor: C.red, shake: true }); }
        else { onda = 2; fila.push({ emoji: "🌪️", titulo: "Crise chegando!", sub: "risco de calote 2x por 2 meses", delta: 0, cor: C.red, shake: true }); }
      }
      else if (r < 0.28 + MM.crise && senior > 200000) {
        const saque = Math.min(120000, senior * 0.15);
        if (caixa >= saque) { caixa -= saque; senior -= saque; fila.push({ emoji: "🏃", titulo: "Investidor sacou", sub: "seu caixa aguentou", delta: -saque, cor: C.amber }); }
        else fila.push({ emoji: "🚨", titulo: "Quer sacar e não tem caixa!", sub: "venda a carteira JÁ", delta: 0, cor: C.red, shake: true });
      }

      // sentenças que saíram neste mês (no último mês do jogo, tudo que sobrou sai junto)
      const sentencas = processos.filter((pr) => pr.mesSai <= s.mes || s.mes >= MESES);
      processos = processos.filter((pr) => !sentencas.includes(pr));
      for (const pr of sentencas) {
        if (Math.random() < 0.45) {
          const rec = pr.valor * 0.65;
          caixa += rec; perdas -= rec;
          fila.push({ emoji: "😅", titulo: "A justiça decidiu — e pagou!", sub: "ele pagou 65% pra limpar o nome", delta: rec, cor: C.green });
        } else {
          fila.push({ emoji: "🪦", titulo: "Ganhou o processo, não os bens", sub: "devedor sem bens no nome — R$ 0", delta: 0, cor: C.red, shake: true });
        }
      }

      const novoSaldo = sobrev.reduce((t, l) => t + principal(l), 0);
      const novoCofre = caixa + novoSaldo - senior;
      const mes = s.mes + 1;
      let fim = null;
      if (novoCofre <= 0) fim = "lose";
      else if (mes > MESES) fim = "win";

      return {
        ...s, caixa, senior, perdas, onda, stress, selic, fim, processos,
        gastoAcum: s.gastoAcum + custo + OPEX,
        carteira: sobrev, mes: Math.min(mes, MESES + 1),
        pedidos: novosPedidos(mes), idx: 0,
        vendeuMes: false, mercado: sorteiaMercado(),
        tela: "resolvendo", fila, filaIdx: 0,
        fala: "Vamos ver como foi o mês… 🤞",
      };
    });
  }

  function decidirCalote(op) {
    const c = g.fila[g.filaIdx];
    if (!c || !c.calote) return;
    const perda = c.calote.perda;
    if (op === "renegociar") {
      // acordo à vista: menos dinheiro, mas AGORA — pode até te salvar de uma quebra decretada
      const rec = perda * 0.35;
      SFX.aprova();
      setG((s) => {
        const fila = [...s.fila];
        fila.splice(s.filaIdx + 1, 0, { emoji: "🤝", titulo: "Renegociado!", sub: "35% de volta na hora", delta: rec, cor: C.green });
        const caixa = s.caixa + rec;
        const cofreAgora = caixa + s.carteira.reduce((t, l) => t + principal(l), 0) - s.senior;
        const fim = s.fim === "lose" && cofreAgora > 0 ? null : s.fim;
        return { ...s, caixa, perdas: s.perdas - rec, fila, fim, filaIdx: s.filaIdx + 1 };
      });
    } else {
      // Serasa suja o nome NA HORA, mas dinheiro nenhum — a justiça decide ~2 meses depois
      SFX.rejeita();
      setG((s) => {
        const fila = [...s.fila];
        fila.splice(s.filaIdx + 1, 0, { emoji: "⚖️", titulo: "Nome no Serasa + processo aberto", sub: "resultado em ~2 meses", delta: 0, cor: C.amber });
        return { ...s, fila, filaIdx: s.filaIdx + 1, processos: [...(s.processos || []), { valor: perda, mesSai: s.mes + 1 }] };
      });
    }
  }

  function proximaCarta() {
    if (g.filaIdx + 1 < g.fila.length) {
      const prox = g.fila[g.filaIdx + 1];
      prox && prox.shake ? SFX.calote() : SFX.carta();
    } else if (g.fim === "win") { // 1º o toque, depois a musiquinha
      musica(false);
      if (cofre > g.cofre0) { SFX.win(); setTimeout(() => SFX.vitoria(), 2000); }
      else { SFX.winFraco(); setTimeout(() => SFX.consolo(), 1500); }
    }
    else if (g.fim === "lose") { // o luto em 3 atos: game over → lamento dos sinos → marcha fúnebre
      musica(false);
      SFX.lose();
      setTimeout(() => SFX.lamento(), 2000);
      setTimeout(() => SFX.marchaFunebre(), 11500);
    }
    else SFX.carta();
    setG((s) => {
      if (s.filaIdx + 1 < s.fila.length) return { ...s, filaIdx: s.filaIdx + 1 };
      if (s.fim) return { ...s, tela: "fim" };
      return { ...s, tela: "jogo", fala: "Novo mês, novos clientes! 📅" };
    });
  }


  /* ============ INTRO ============ */
  if (g.tela === "intro") {
    return (
      <Frame css={CSS}>
        <div style={{ position: "relative", textAlign: "center", paddingTop: 64, paddingBottom: 24 }}>
          <div style={{
            position: "absolute", top: -40, left: "50%", transform: "translateX(-50%)",
            width: 340, height: 340, borderRadius: "50%", pointerEvents: "none",
            background: "radial-gradient(circle, rgba(74,222,128,.14) 0%, rgba(74,222,128,0) 70%)",
          }} />
          <div className="float" style={{ fontSize: 88, position: "relative" }}>💸</div>
          <h1 style={{ color: C.text, fontSize: 66, fontWeight: 900, margin: "12px 0 2px", letterSpacing: 3, lineHeight: 1 }}>
            SPREAD<span style={{ color: C.green }}>_</span>
          </h1>
          <div style={{ color: C.green, fontSize: 12, letterSpacing: 3, fontFamily: "ui-monospace, monospace", marginTop: 14, marginBottom: 8 }}>
            SIMULADOR DO MERCADO DE CRÉDITO
          </div>
          <div style={{ color: C.mute, fontSize: 14, marginBottom: 40 }}>
            você aguenta {MESES} meses?
          </div>

          <div>
            <button onClick={() => { SFX.partida(); musica(true); reiniciar("fundo"); }} style={{ ...btnJogar, marginTop: 0, fontSize: 18, padding: "16px 64px" }}>
              ▶ JOGAR
            </button>
          </div>
          <div style={{ color: "#4A5C52", fontSize: 10, letterSpacing: 2, marginTop: 20 }}>MERCADO</div>
          <div style={{ display: "flex", gap: 8, justifyContent: "center", marginTop: 8 }}>
            {Object.entries(MERCADOS).map(([k, m]) => (
              <button key={k} onClick={() => { SFX.clique(); setClimaSel(k); }} style={{
                padding: "8px 16px", borderRadius: 10, cursor: "pointer", fontSize: 13, fontWeight: 800,
                border: `1px solid ${climaSel === k ? C.green : C.line}`,
                background: climaSel === k ? "#123B24" : "none",
                color: climaSel === k ? C.green : C.mute,
              }}>
                {m.icone} {m.nome}
              </button>
            ))}
          </div>
          <div>
            <button onClick={() => setAjuda(true)} style={{ background: "none", border: "none", color: C.mute, fontSize: 13, cursor: "pointer", marginTop: 26, textDecoration: "underline" }}>
              ? ajuda
            </button>
          </div>
          {ajuda && <Ajuda onClose={() => setAjuda(false)} />}
          <p style={{ color: "#4A5C52", fontSize: 10.5, marginTop: 34, letterSpacing: 0.5 }}>
            <a href="https://fuzzionx.com" target="_blank" rel="noopener noreferrer" style={{ color: "#5d6a61", textDecoration: "none", fontWeight: 700 }}>FUZZIONX</a>
            <span style={{ margin: "0 8px", opacity: 0.5 }}>·</span>
            <a href="https://github.com/FuzzionX545/spread" target="_blank" rel="noopener noreferrer" style={{ color: "#5d6a61", textDecoration: "none" }}>GitHub ↗</a>
          </p>
        </div>
      </Frame>
    );
  }

  /* ============ RESOLVENDO ============ */
  if (g.tela === "resolvendo") {
    const c = g.fila[g.filaIdx] || { emoji: "😴", titulo: "Mês tranquilo", sub: "nada aconteceu", delta: 0, cor: C.mute };
    return (
      <Frame css={CSS}>
        <Topo g={g} cofre={cofre} vida={vida} onAjuda={() => setAjuda(true)} onReset={() => reiniciar()} som={som} onSom={alternarSom} />
        {ajuda && <Ajuda onClose={() => setAjuda(false)} />}
        <div onClick={c.calote ? undefined : proximaCarta} className={c.shake ? "shake" : "pop"} key={g.filaIdx}
          style={{ ...cardResultado, cursor: c.calote ? "default" : "pointer", borderColor: c.cor }}>
          <div style={{ fontSize: 72 }}>{c.emoji}</div>
          <div style={{ color: c.cor, fontSize: 26, fontWeight: 900 }}>{c.titulo}</div>
          <div style={{ color: C.mute, fontSize: 14 }}>{c.sub}</div>
          {c.delta !== 0 && (
            <div style={{ color: c.delta > 0 ? C.green : C.red, fontSize: 30, fontWeight: 900, marginTop: 6 }}>
              {c.delta > 0 ? "+" : "–"}{fmt(c.delta)}
            </div>
          )}
          {c.calote ? (
            <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
              <button className="opCalote" onClick={() => decidirCalote("renegociar")} style={{
                flex: 1, padding: "14px 10px", borderRadius: 14, cursor: "pointer",
                border: `1px solid ${C.green}`, background: "rgba(74,222,128,.08)", color: C.green,
              }}>
                <div style={{ fontSize: 26 }}>🤝</div>
                <div style={{ fontWeight: 800, fontSize: 13, marginTop: 2 }}>acordo</div>
                <div style={{ fontWeight: 700, fontSize: 13, marginTop: 4 }}>+{fmt(c.calote.perda * 0.35)}</div>
                <div style={{ fontWeight: 400, fontSize: 10.5, opacity: 0.75 }}>na hora, garantido</div>
              </button>
              <button className="opCalote" onClick={() => decidirCalote("serasa")} style={{
                flex: 1, padding: "14px 10px", borderRadius: 14, cursor: "pointer",
                border: `1px solid ${C.red}`, background: "rgba(248,113,113,.08)", color: C.red,
              }}>
                <div style={{ fontSize: 26 }}>⚖️</div>
                <div style={{ fontWeight: 800, fontSize: 13, marginTop: 2 }}>Serasa + justiça</div>
                <div style={{ fontWeight: 700, fontSize: 13, marginTop: 4 }}>+{fmt(c.calote.perda * 0.65)} ou nada</div>
                <div style={{ fontWeight: 400, fontSize: 10.5, opacity: 0.75 }}>sai em ~2 meses 🎲</div>
              </button>
            </div>
          ) : (
            <div style={{ color: C.mute, fontSize: 12, marginTop: 14 }}>
              toque pra continuar · {g.filaIdx + 1}/{g.fila.length || 1}
            </div>
          )}
        </div>
      </Frame>
    );
  }

  /* ============ FIM ============ */
  if (g.tela === "fim") {
    const win = g.fim === "win";
    const out = g.fim === "out";
    const corFim = win ? C.green : out ? C.amber : C.red;
    const lucro = cofre - g.cofre0;
    const imposto = g.fim !== "lose" && lucro > 0 ? lucro * 0.15 : 0; // IR sobre o rendimento, como em fundo de verdade
    const ganhos = lucro + g.perdas + g.gastoAcum; // tudo que entrou (juros + CDI + vendas), pra conta fechar na tela
    const cuspe = nota === 99 ? fimDecor.cuspe : [];
    const chuvaOuro = nota === 99 ? fimDecor.chuvaOuro : [];
    const estouro = win && lucro > 0 ? fimDecor.estouro : [];
    return (
      <Frame css={CSS}>
        {nota === 99 && (
          <div style={{ position: "fixed", inset: 0, pointerEvents: "none", overflow: "hidden", zIndex: 40 }}>
            {chuvaOuro.map((p, i) => (
              <span key={i} style={{
                position: "absolute", left: p.left + "%", top: "-8%", fontSize: p.size,
                animation: `cair ${p.dur}s linear ${p.delay}s infinite`,
              }}>{p.e}</span>
            ))}
          </div>
        )}
        <div style={{ position: "relative", textAlign: "center", paddingTop: 40 }} className="pop">
          <div style={{
            position: "absolute", top: -30, left: "50%", transform: "translateX(-50%)",
            width: 320, height: 320, borderRadius: "50%", pointerEvents: "none",
            background: `radial-gradient(circle, ${win ? "rgba(74,222,128,.16)" : out ? "rgba(251,191,36,.14)" : "rgba(248,113,113,.14)"} 0%, transparent 70%)`,
          }} />
          <div style={{ fontSize: 84, position: "relative" }}>
            {win && (
              <span style={{
                position: "absolute", left: "50%", top: "48%", width: 190, height: 190, borderRadius: "50%", pointerEvents: "none",
                background: `radial-gradient(circle, ${nota === 99 ? "rgba(255,215,0,.32)" : "rgba(74,222,128,.22)"} 0%, transparent 68%)`,
                animation: "aura 2.4s ease-in-out infinite",
              }} />
            )}
            <span onClick={clicarFim} className={g.fim === "lose" && fimFx.queda > 0 ? "despenca" : ""} style={{
              display: "inline-block", cursor: "pointer", userSelect: "none", position: "relative",
            }}>
              <span key={fimFx.chave} className={win ? "trofeu" : g.fim === "lose" ? "caveira" : out && fimFx.chave > 0 ? "tremido" : "pop"} style={{ position: "relative", display: "inline-block" }}>
                {win ? "🏆" : out ? "🏁" : "💀"}
                {estouro.map((pc, i) => (
                  <span key={"e" + i} style={{
                    position: "absolute", left: "50%", top: "52%", fontSize: 21, opacity: 0, pointerEvents: "none",
                    "--dx": pc.dx + "px", "--dy": pc.dy + "px",
                    animation: `estouro ${pc.dur}s ease-out ${pc.delay}s forwards`,
                  }}>{pc.e}</span>
                ))}
              </span>
              {/* o vulcão fica FORA do miolo re-montável: clicar no troféu não reinicia a chuva */}
              {cuspe.map((pc, i) => (
                <span key={i} style={{
                  position: "absolute", left: "50%", top: "30%", fontSize: 20, opacity: 0, pointerEvents: "none",
                  "--dx": pc.dx + "px", "--vy": pc.vy + "px",
                  animation: `cuspir ${pc.dur}s ease-in ${pc.delay}s infinite`,
                }}>{pc.e}</span>
              ))}
            </span>
          </div>
          <h1 style={{ color: corFim, fontSize: 34, fontWeight: 900, margin: "8px 0" }}>
            {win ? "SOBREVIVEU!" : out ? "ENCERROU!" : "QUEBROU!"}
          </h1>
          <div style={{ color: C.mute }}>
            {win ? `${MESES} meses no comando 😎`
              : out ? `Saiu no mês ${Math.min(g.mes, MESES)} com o resultado no bolso`
              : `Seu cofre zerou no mês ${g.mes - 1} 💥`}
          </div>
          <div style={{ ...painel, maxWidth: 340, margin: "22px auto", padding: 20 }}>
            <div style={{ color: C.mute, fontSize: 12, letterSpacing: 2 }}>SUA NOTA</div>
            <div style={{ color: corFim, fontSize: 72, fontWeight: 900, lineHeight: 1 }}>
              <span className={nota === 99 ? "nota99" : undefined}>{nota}</span>
            </div>
            <div style={{ color: C.mute, fontSize: 12 }}>de 99 · modo {M.icone} {M.nome}</div>

            {/* o resultado, gigante e impossível de não entender */}
            <div style={{ background: C.panel2, borderRadius: 12, padding: "12px 14px", marginTop: 16 }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: C.mute }}>
                <span>começou com</span><b style={{ color: C.text }}>{fmt(g.cofre0)}</b>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: C.mute, marginTop: 4 }}>
                <span>terminou com</span><b style={{ color: C.text }}>{fmt(Math.max(0, cofre))}</b>
              </div>
              <div style={{ borderTop: `1px solid ${C.line}`, marginTop: 10, paddingTop: 10 }}>
                <div style={{ color: C.mute, fontSize: 11, letterSpacing: 1 }}>{lucro >= 0 ? "📈 LUCRO" : "📉 PREJUÍZO"}</div>
                <div style={{ color: lucro >= 0 ? C.green : C.red, fontSize: 30, fontWeight: 900 }}>
                  {lucro >= 0 ? "+" : "–"}{fmt(lucro)}
                  <span style={{ fontSize: 15, fontWeight: 700, opacity: 0.8 }}> ({lucro >= 0 ? "+" : "–"}{Math.abs(Math.round((lucro / g.cofre0) * 100))}%)</span>
                </div>
              </div>
            </div>

            {/* extrato: a conta FECHA — ganhou − calote − custos = resultado */}
            <div style={{ marginTop: 14, display: "grid", gap: 7, fontSize: 13.5, textAlign: "left" }}>
              <Res emoji="🤝" k="Emprestou no total" v={fmt(g.totalEmprestado)} />
              <div style={{ borderTop: `1px solid ${C.line}`, marginTop: 2, paddingTop: 9, display: "grid", gap: 7 }}>
                <Res emoji="💰" k="Ganhou (juros, CDI e vendas)" v={(ganhos >= 0 ? "+" : "–") + fmt(ganhos)} cor={ganhos >= 0 ? C.green : C.red} />
                <Res emoji="💥" k="Perdeu em calote" v={(g.perdas > 0 ? "–" : "") + fmt(g.perdas)} cor={g.perdas > 0 ? C.red : undefined} />
                <Res emoji="💸" k="Gastou pra operar" v={"–" + fmt(g.gastoAcum)} cor={C.amber} />
                <div style={{ borderTop: `1px dashed ${C.line}`, paddingTop: 7 }}>
                  <Res emoji={lucro >= 0 ? "📈" : "📉"} k="= Resultado" v={(lucro >= 0 ? "+" : "–") + fmt(lucro)} cor={lucro >= 0 ? C.green : C.red} bold />
                </div>
              </div>
              {imposto > 0 && <Res emoji="🧾" k="Imposto (15% do lucro)" v={"–" + fmt(imposto)} cor={C.amber} />}
              {imposto > 0 && (
                <div style={{ borderTop: `1px solid ${C.line}`, paddingTop: 8 }}>
                  <Res emoji="✅" k="Líquido no bolso" v={fmt(cofre - imposto)} cor={C.green} bold />
                </div>
              )}
            </div>
          </div>
          <button style={btnJogar} onClick={() => reiniciar()}>↻ JOGAR DE NOVO</button>
          <div style={{ display: "flex", gap: 10, justifyContent: "center", marginTop: 12 }}>
            <button onClick={compartilharNota} style={{
              padding: "11px 22px", borderRadius: 12, cursor: "pointer",
              background: "none", border: `1px solid ${C.green}`, color: C.green, fontWeight: 800, fontSize: 14,
            }}>
              📤 compartilhar
            </button>
            <button onClick={copiarNota} style={{
              padding: "11px 22px", borderRadius: 12, cursor: "pointer",
              background: "none", border: `1px solid ${C.line}`, color: C.mute, fontWeight: 800, fontSize: 14,
            }}>
              {copiei ? "✅ copiado!" : "📋 copiar nota"}
            </button>
          </div>
          <p style={{ color: C.mute, fontSize: 12, marginTop: 16 }}>Manda sua nota pra galera 😏 · fuzzionx.com</p>
        </div>
      </Frame>
    );
  }

  /* ============ JOGO ============ */
  return (
    <Frame css={CSS}>
      <Topo g={g} cofre={cofre} vida={vida} onAjuda={() => setAjuda(true)} onReset={() => reiniciar()} som={som} onSom={alternarSom} />
      {ajuda && <Ajuda onClose={() => setAjuda(false)} />}

      <div style={{ display: "flex", alignItems: "flex-end", gap: 8, margin: "10px 0 6px" }}>
        <div style={{ fontSize: 34, cursor: "pointer", userSelect: "none" }} className="float" onClick={cutucarRobo} title="cutuca ele">
          <span key={robo.n} className={robo.anim}>{robo.cara}</span>
        </div>
        <Balao txt={g.fala} mini />
      </div>

      {!acabou && p ? (
        <div className={g.anim} key={p.id} style={cardCliente}>
          <div style={{ fontSize: 60, textAlign: "center" }}>{p.emoji}</div>
          <div style={{ textAlign: "center", color: C.text, fontWeight: 800, fontSize: 19 }}>
            {p.nome} <span style={{ fontWeight: 400, color: C.mute, fontSize: 14 }}>quer {p.quer}</span>
          </div>
          <div style={{ textAlign: "center", color: C.mute, fontSize: 11.5, fontStyle: "italic", marginTop: 1 }}>
            “{p.bio}”
          </div>
          <div style={{ textAlign: "center", fontSize: 18, letterSpacing: 2, margin: "4px 0" }}>
            {"⭐".repeat(p.score)}{"▫️".repeat(5 - p.score)}
          </div>
          <div style={{ display: "flex", justifyContent: "center", gap: 8, margin: "6px 0 6px", flexWrap: "wrap" }}>
            <Tag>{fmt(p.valor)}</Tag>
            <Tag>{p.prazo} meses</Tag>
            <Tag>{p.humor === "duro" ? "🤨 pechincheiro" : "😄 de boa"}</Tag>
            {p.gar && (
              <span style={{ background: "#123B24", border: `1px solid ${C.green}`, color: C.green, borderRadius: 8, padding: "5px 10px", fontSize: 14, fontWeight: 700 }}>
                {p.gar.icone} {p.gar.rot}
              </span>
            )}
          </div>
          <div style={{ textAlign: "center", color: C.mute, fontSize: 11.5, marginBottom: 3 }}>
            {p.rotRenda} {fmt(p.renda)}/mês · 📜 {p.hist.rot}
            {p.tempoNeg != null && ` · ⏳ negócio aberto há ${p.tempoNeg >= 12 ? Math.floor(p.tempoNeg / 12) + (p.tempoNeg >= 24 ? " anos" : " ano") : p.tempoNeg + " meses"}`}
          </div>
          <div style={{ textAlign: "center", fontSize: 11.5, marginBottom: 8, fontWeight: 700,
            color: compr > 0.4 ? C.red : compr > 0.3 ? C.amber : C.green }}>
            parcela leva ~{Math.round(compr * 100)}% da renda {compr > 0.4 ? "😰 aperto" : compr > 0.3 ? "😬 no limite" : "🙂 cabe no bolso"}
          </div>

          <div style={{ textAlign: "center", color: C.mute, fontSize: 12, marginBottom: 6 }}>
            💬 qual taxa você cobra?
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            {opcoes.map((op) => (
              <button key={op.rot} onClick={() => ofertar(op)} disabled={semCaixa}
                style={{
                  flex: 1, padding: "10px 4px", borderRadius: 12, cursor: semCaixa ? "default" : "pointer",
                  border: `1px solid ${C.line}`, background: semCaixa ? C.panel : C.panel2,
                  opacity: semCaixa ? 0.5 : 1,
                }}>
                <div style={{ fontSize: 22 }}>{op.rot}</div>
                <div style={{ color: C.text, fontWeight: 800, fontSize: 14 }}>{pctm(op.t)}%</div>
                <div style={{ color: C.mute, fontSize: 10 }}>ao mês</div>
              </button>
            ))}
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", color: C.mute, fontSize: 10.5, margin: "4px 2px 0" }}>
            <span>aceita fácil</span><span>pode recusar 😬</span>
          </div>
          {semCaixa && (
            <div style={{ color: C.amber, fontSize: 12, textAlign: "center", marginTop: 8 }}>
              💼 Sem caixa pra esse valor — venda a carteira ou dispense.
            </div>
          )}
          <button onClick={rejeitar} style={{ width: "100%", marginTop: 10, background: "none", border: "none", color: C.mute, fontSize: 13, cursor: "pointer", textDecoration: "underline" }}>
            👎 dispensar cliente
          </button>
          <div style={{ textAlign: "center", color: C.mute, fontSize: 11, marginTop: 6 }}>
            cliente {g.idx + 1} de {g.pedidos.length}
          </div>
        </div>
      ) : (
        <div className="pop" style={{ ...cardCliente, textAlign: "center" }}>
          <div style={{ fontSize: 56 }}>🌙</div>
          <div style={{ color: C.text, fontWeight: 800, fontSize: 18 }}>Fim das decisões</div>
          <div style={{ color: C.mute, fontSize: 13, margin: "4px 0 12px" }}>
            {g.modo === "mkt" ? "hora de repassar a carteira…" : "hora de ver quem pagou…"}
          </div>
          <button onClick={rodarMes} style={{ ...btnJogar, marginTop: 0 }}>⏩ RODAR O MÊS</button>
        </div>
      )}

      {/* HUD das dívidas (só no modo fundo — no mkt o repasse é automático) */}
      {g.modo === "fundo" && saldoCarteira > 0 && (
        <div style={{ ...painel, marginTop: 12, padding: 12, position: "relative" }}>
          {vendaFx > 0 && (
            <div key={vendaFx} style={{ position: "absolute", inset: 0, pointerEvents: "none", overflow: "visible", zIndex: 5 }}>
              {[0, 1, 2].map((i) => (
                <span key={i} style={{
                  position: "absolute", left: `calc(50% - ${12 - i * 4}px)`, bottom: 46, fontSize: 22, opacity: 0,
                  animation: `marioCoin .65s ease-out ${i * 0.14}s forwards`,
                }}>🪙</span>
              ))}
            </div>
          )}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <span style={{ color: C.mute, fontSize: 12, fontWeight: 700 }}>📄 DÍVIDAS A RECEBER · <b style={{ color: C.text }}>{fmt(saldoCarteira)}</b></span>
            <span style={{ fontSize: 11, color: g.mercado.adj < 0 ? C.green : g.mercado.adj > 0 ? C.red : C.mute }}>{g.mercado.rot}</span>
          </div>
          {g.vendeuMes ? (
            <div style={{ textAlign: "center", color: C.mute, fontSize: 12.5, padding: "8px 0" }}>
              🛒 O mercado já comprou seu lote deste mês. Volte no próximo!
            </div>
          ) : (
            <div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 14, marginBottom: 8 }}>
                <BotIcone onClick={() => setQtd(Math.max(1, qtdOk - 1))} title="Menos">−</BotIcone>
                <div style={{ textAlign: "center", minWidth: 110 }}>
                  <div style={{ color: C.text, fontWeight: 900, fontSize: 22 }}>🪙 {qtdOk}<span style={{ color: C.mute, fontWeight: 400, fontSize: 14 }}>/10</span></div>
                  <div style={{ color: C.mute, fontSize: 10.5 }}>tokens (máx {maxTok} agora)</div>
                </div>
                <BotIcone onClick={() => setQtd(Math.min(maxTok, qtdOk + 1))} title="Mais">+</BotIcone>
              </div>
              <button onClick={() => venderTokens(qtdOk, descTok(qtdOk))} style={{
                width: "100%", padding: "12px", borderRadius: 12, border: "none", cursor: "pointer",
                background: C.green, color: "#04170B", fontWeight: 900, fontSize: 15,
              }}>
                VENDER {qtdOk} TOKEN{qtdOk > 1 ? "S" : ""} → +{fmt(saldoCarteira * (qtdOk / 10) * (1 - descTok(qtdOk)))}
              </button>
              <div style={{ textAlign: "center", color: C.mute, fontSize: 11, marginTop: 5 }}>
                desconto {pctm(descTok(qtdOk))}% · lote maior = desconto maior
              </div>
            </div>
          )}
        </div>
      )}
      {g.modo === "mkt" && saldoCarteira > 0 && (
        <div style={{ ...painel, marginTop: 12, padding: "10px 12px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ color: C.mute, fontSize: 12, fontWeight: 700 }}>🔁 PRA REPASSAR NO FIM DO MÊS</span>
          <b style={{ color: C.blue, fontSize: 15 }}>{fmt(saldoCarteira)}</b>
        </div>
      )}

      {/* trava de segurança: 1º clique só abre a pergunta — o encerrar de verdade fica atrás da confirmação
          (ele fica logo abaixo do VENDER TOKENS e já engoliu partida por clique acidental) */}
      {g.mes > 1 && (confEnc ? (
        <div style={{ marginTop: 28, textAlign: "center", padding: "12px", border: `1px solid ${C.line}`, borderRadius: 12 }}>
          <div style={{ color: C.text, fontSize: 13.5, fontWeight: 800, marginBottom: 10 }}>🏁 Encerrar a partida agora?</div>
          <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
            <button onClick={() => { setConfEnc(false); encerrar(); }} style={{ padding: "9px 16px", borderRadius: 10, border: "none", cursor: "pointer", background: C.red, color: "#fff", fontWeight: 800, fontSize: 13 }}>
              sim, ver minha nota
            </button>
            <button onClick={() => { SFX.clique(); setConfEnc(false); }} style={{ padding: "9px 16px", borderRadius: 10, border: `1px solid ${C.line}`, cursor: "pointer", background: "none", color: C.text, fontWeight: 700, fontSize: 13 }}>
              ✕ continuar jogando
            </button>
          </div>
        </div>
      ) : (
        <button onClick={() => { SFX.clique(); setConfEnc(true); setTimeout(() => setConfEnc(false), 6000); }}
          style={{ width: "100%", marginTop: 28, background: "none", border: "none", color: C.mute, fontSize: 12, cursor: "pointer", textDecoration: "underline" }}>
          🏁 encerrar agora e ver minha nota
        </button>
      ))}

    </Frame>
  );
}

/* ---------- componentes ---------- */

function Topo({ g, cofre, vida, onAjuda, onReset, som, onSom }) {
  const M = MERCADOS[g.clima] || MERCADOS.normal;
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ color: C.mute, fontSize: 12, fontWeight: 700 }}>
          {g.modo === "mkt" ? "🔁" : "🛡️"} MÊS {Math.min(g.mes, MESES)}<span style={{ opacity: 0.5 }}>/{MESES} · {M.icone}</span>
          {g.onda > 0 && <span style={{ color: C.red }}> 🌪️</span>}
          {g.stress > 0 && <span style={{ color: C.red }}> 🥶</span>}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ color: C.text, fontSize: 13, fontWeight: 700 }}>
            💼 {fmt(g.caixa)} <span style={{ color: C.mute, fontWeight: 400, fontSize: 11 }}>no caixa</span>
          </div>
          <BotIcone onClick={onSom} title="Som">
            <span style={{ textDecoration: som ? "none" : "line-through", color: som ? C.green : C.mute }}>♪</span>
          </BotIcone>
          <BotIcone onClick={onAjuda} title="Ajuda">?</BotIcone>
          <BotIcone onClick={onReset} title="Recomeçar">↻</BotIcone>
        </div>
      </div>
      <div style={{ marginTop: 8 }}>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 3 }}>
          <span style={{ color: C.mute }}>{g.modo === "mkt" ? "💼 SEU PATRIMÔNIO" : "🛡️ SEU COFRE"}</span>
          <b style={{ color: vida > 0.4 ? C.green : vida > 0.15 ? C.amber : C.red }}>{fmt(Math.max(0, cofre))}</b>
        </div>
        <div style={{ height: 14, background: "#241014", borderRadius: 8, border: `1px solid ${C.line}`, overflow: "hidden" }}>
          <div style={{
            width: `${vida * 100}%`, height: "100%", transition: "width .5s",
            background: vida > 0.4 ? `linear-gradient(90deg, ${C.greenDark}, ${C.green})` : vida > 0.15 ? C.amber : C.red,
          }} />
        </div>
      </div>
    </div>
  );
}

function BotIcone({ children, onClick, title }) {
  return (
    <button onClick={onClick} title={title} aria-label={title} style={{
      width: 32, height: 32, borderRadius: 16, border: `1px solid ${C.line}`,
      background: C.panel, color: C.mute, cursor: "pointer", fontSize: 15,
      fontWeight: 800, padding: 0, lineHeight: "30px", textAlign: "center",
      display: "flex", alignItems: "center", justifyContent: "center",
    }}>
      {children}
    </button>
  );
}

// d = resumo de 1 linha (sempre visível) · mais = a aula completa, com números (abre no toque)
const DICAS = [
  { e: "🎯", t: "O objetivo", d: "Sobreviva 12 meses. Cofre zerou = quebrou.",
    mais: "Seu cofre é a COTA SUBORDINADA: os SEUS R$ 200 mil dentro do fundo de R$ 1 milhão. Todo calote sai primeiro dele — o investidor só perde se o seu zerar. É assim que fundos de crédito reais (FIDCs) funcionam: existe uma fila pra perder dinheiro, e o dono da fintech é o primeiro da fila. Fórmula do cofre: caixa + o que está emprestado − dívida com os investidores." },
  { e: "💰", t: "De onde vem o dinheiro", d: "80% dos investidores + 20% seu.",
    mais: "Os investidores colocam 80% do fundo e recebem CDI + 3,6% ao ano (na vida real hoje: cota sênior de FIDC paga CDI+2 a 5%). Quem paga esse rendimento é VOCÊ, com os juros dos clientes. Se o cliente te paga 3,6% ao mês e o investidor custa ~1,4%, a diferença — o SPREAD — é seu lucro. Daí o nome do jogo." },
  { e: "💬", t: "Você define a taxa", d: "😇 aceita fácil · 🙂 justa · 🤑 pode recusar.",
    mais: "Cliente 🤨 pechincheiro recusa a taxa alta 70% das vezes (e até a justa, 30%). E tem o efeito escondido: taxa alta = parcela pesada = +35% de risco de calote, porque aperta o orçamento do cliente. É real: juro abusivo aumenta a inadimplência que ele tenta cobrir." },
  { e: "⭐", t: "As estrelas (score)", d: "Mais estrelas = paga certinho.",
    mais: "Chance de calote POR MÊS no mercado normal: ⭐ 12,6% · ⭐⭐ 7,7% · ⭐⭐⭐ 4,5% · ⭐⭐⭐⭐ 2,5% · ⭐⭐⭐⭐⭐ 1,3%. Por isso as taxas que eles aceitam são diferentes (5,2% → 2,3% ao mês): o banco cobra dos arriscados o prejuízo que eles causam. Na vida real esse score vem do Serasa/histórico — e funciona igualzinho." },
  { e: "🪙", t: "Tokenização (RWA)", d: "Sua carteira vira 10 tokens. Venda = dinheiro na hora, risco vai junto.",
    mais: "O comprador é esperto: o desconto (DESÁGIO) que ele exige = 3% de margem + a perda esperada por calote da SUA carteira + o humor do mercado + o tamanho do lote. E repara no cofre na hora de vender: se o preço da venda for MAIOR que o principal emprestado, o cofre SOBE (você antecipou o lucro dos juros) — se for menor, o cofre DESCE (vendeu no prejuízo). Vender carteira na hora certa é lucro; vender no desespero é sangria. RWA de verdade funciona assim." },
  { e: "🛒", t: "O humor do comprador", d: "🔥 lote até 10 · 😐 até 6 · 🥶 até 3 tokens.",
    mais: "🔥 comprador animado ainda dá 3% de desconto A MENOS · 🥶 sumido cobra 7% a mais. Regra de ouro: venda no 🔥, segure no 🥶. Máximo 1 venda por mês — na vida real também não se liquida carteira todo dia." },
  { e: "🧾", t: "Garantia (trava de recebíveis)", d: "Cliente com 🧾 tem dinheiro travado: calote despenca, juro também.",
    mais: "A parcela sai do fluxo dele ANTES do dinheiro chegar na mão: os recebíveis da empresa (vendas já feitas que ainda vão cair). Na vida real o mesmo esquema vale pra maquininha de cartão e pro consignado do aposentado. Calote cai pra menos da metade — mas ele só aceita juro menor, porque com garantia consegue crédito barato em qualquer banco. A troca real do mercado: margem gorda arriscada × margem magra tranquila." },
  { e: "💼", t: "O perfil do cliente", d: "Renda, histórico e idade do negócio mudam o risco DE VERDADE.",
    mais: "É o raio-X que todo banco tira antes de aprovar: 💼 RENDA — quanto entra por mês (o faturamento mensal da empresa). A linha colorida mostra quanto a parcela come dela: até 30% cabe no bolso 🙂 · acima de 40% é aperto 😰 e o risco sobe +25%. 📜 HISTÓRICO — quem nunca pegou empréstimo é incógnita (+15% de risco); quem já quitou vários é mais confiável (−10%). ⏳ NEGÓCIO NOVO — menos de 1 ano de porta aberta quebra mais (+20%)." },
  { e: "🌪️", t: "Crise", d: "Quando bate, o risco de calote DOBRA por 2 meses.",
    mais: "De tempos em tempos o país engasga (pandemia, Americanas) e o calote sobe em bloco. Defesa de gestor: clientes bons ANTES da crise e caixa folgado. No 💀 brabo ela bate a cada ~5 meses; no 🕊️ calmo, quase nunca." },
  { e: "🤝", t: "Calote tem conversa", d: "Acordo = 35% na hora. Justiça = 65% ou nada, ~2 meses depois.",
    mais: "O acordo cai na hora e é o único que pode te SALVAR de uma quebra no susto. A justiça: Serasa suja o nome imediatamente, mas o dinheiro (45% de chance de receber 65%) só sai ~2 meses depois — e se o devedor não tiver bens no nome, você ganha o processo e leva R$ 0. Números reais do Brasil: cobrança de dívida sem garantia recupera 25-35% em média, e processo de verdade leva 1-3 anos (o jogo comprime o tempo)." },
  { e: "💹", t: "Caixa parado rende", d: "Meio CDI por mês. Mas parado você DEFINHA.",
    mais: "Com a Selic a 14,25% ao ano, seu caixa rende ~0,6% ao mês (metade do CDI — a outra metade paga a administração). Só que os investidores custam ~1,4% ao mês SEMPRE. 0,6 entrando, 1,4 saindo + custo de operação: quem não empresta, morre devagar. Banco parado não existe." },
  { e: "🏢", t: "Custo de operação", d: "R$ 9.000 todo mês — equipe, sistema e cobrança.",
    mais: "Operar R$ 1 milhão exige analista, sistema de cobrança e contabilidade — R$ 108 mil por ano SAINDO, chova ou faça sol. É por isso que fintech pequena não sobrevive parada: o custo fixo come. E é por isso que crédito é jogo de escala." },
  { e: "🏃", t: "Saque do investidor", d: "Ele pode pedir resgate do nada. Tenha caixa.",
    mais: "O investidor pode sacar até 15% do dinheiro dele a qualquer mês. Se você não tiver caixa pra pagar o resgate, o desespero bate: precisa vender a carteira às pressas (com deságio) — a versão mini de uma corrida bancária. Regra de gestor: nunca opere com o caixa raspado." },
  { e: "🌦️", t: "O mercado (calmo/normal/brabo)", d: "É em que ano do Brasil você está jogando.",
    mais: "🕊️ calmo = 2021: dinheiro farto, calote 30% menor, crise rara. ⚖️ normal = ano típico. 💀 brabo = 2023: Americanas quebrando, Selic nas alturas, calote pesado e crise batendo na porta a cada 5 meses. A Selic do jogo também se mexe (Copom existe): sobe = investidor custa mais e caixa rende mais." },
  { e: "🧾", t: "Imposto e a nota final", d: "15% sobre o lucro no fim. Nota = sobreviver + rentabilidade.",
    mais: "Deu lucro? 15% vão de imposto (como o IR de fundos reais). A nota: sobreviver já garante uma base (50 no calmo, 58 no normal, 66 no brabo — mérito maior, base maior) e o resto vem da rentabilidade do SEU cofre. Nota 99 = top ~2% das partidas: precisa aprovar bem, cobrar certo, vender no timing e ter sorte. 42 é honesto. 70+ é gestor de verdade. 99 é lenda." },
];

function Ajuda({ onClose }) {
  const [aberto, setAberto] = useState(null);
  return (
    <div onClick={onClose} style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,.7)", zIndex: 50,
      display: "flex", alignItems: "center", justifyContent: "center", padding: 16,
    }}>
      <div onClick={(e) => e.stopPropagation()} className="pop" style={{ ...painel, padding: 18, maxWidth: 380, width: "100%", textAlign: "left", maxHeight: "85vh", overflowY: "auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
          <b style={{ color: C.text, fontSize: 17 }}>❓ Como joga</b>
          <button onClick={onClose} style={{ background: "none", border: "none", color: C.mute, fontSize: 20, cursor: "pointer" }}>✕</button>
        </div>
        <div style={{ color: C.mute, fontSize: 11.5, marginBottom: 10 }}>toque em um item pra entender como funciona de verdade 👇</div>
        <div style={{ display: "grid", gap: 6 }}>
          {DICAS.map((d, i) => (
            <div key={d.t} onClick={() => setAberto(aberto === i ? null : i)} style={{
              background: aberto === i ? C.panel2 : "none", border: `1px solid ${aberto === i ? C.line : "transparent"}`,
              borderRadius: 12, padding: "8px 10px", cursor: "pointer",
            }}>
              <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                <span style={{ fontSize: 22 }}>{d.e}</span>
                <div style={{ flex: 1 }}>
                  <b style={{ color: C.text, fontSize: 14 }}>{d.t}</b>
                  <div style={{ color: C.mute, fontSize: 12.5, lineHeight: 1.45 }}>{d.d}</div>
                </div>
                <span style={{ color: C.mute, fontSize: 12, marginTop: 4 }}>{aberto === i ? "▾" : "▸"}</span>
              </div>
              {aberto === i && (
                <div className="pop" style={{ color: C.text, fontSize: 12.5, lineHeight: 1.55, marginTop: 8, paddingTop: 8, borderTop: `1px solid ${C.line}`, opacity: 0.92 }}>
                  {d.mais}
                </div>
              )}
            </div>
          ))}
        </div>
        <button onClick={onClose} style={{ ...btnJogar, marginTop: 16, width: "100%", padding: "12px", fontSize: 15 }}>
          Entendi! 👊
        </button>
      </div>
    </div>
  );
}

function Balao({ txt, mini }) {
  return (
    <div style={{
      background: C.panel2, border: `1px solid ${C.line}`, color: C.text,
      borderRadius: 14, borderBottomLeftRadius: 4, padding: mini ? "8px 12px" : "12px 16px",
      fontSize: mini ? 13 : 14.5, maxWidth: mini ? "100%" : 380, margin: mini ? 0 : "12px auto 0",
      lineHeight: 1.5,
    }}>
      {txt}
    </div>
  );
}

function Tag({ children }) {
  return (
    <span style={{ background: C.panel2, border: `1px solid ${C.line}`, color: C.text, borderRadius: 8, padding: "5px 10px", fontSize: 14, fontWeight: 700 }}>
      {children}
    </span>
  );
}

function Res({ emoji, k, v, cor, bold }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", color: C.text }}>
      <span style={{ color: C.mute, fontWeight: bold ? 800 : 400 }}>{emoji} {k}</span>
      <b style={{ color: cor || C.text, fontSize: bold ? 15 : undefined }}>{v}</b>
    </div>
  );
}

function Frame({ children, css }) {
  return (
    <div style={{ minHeight: "100vh", background: C.bg, padding: "16px 14px", fontFamily: "system-ui, -apple-system, sans-serif" }}>
      <style>{css}</style>
      <div style={{ maxWidth: 480, margin: "0 auto" }}>{children}</div>
    </div>
  );
}

const painel = { background: C.panel, border: `1px solid ${C.line}`, borderRadius: 16 };
const cardCliente = { ...painel, padding: 18, marginTop: 10, boxShadow: "0 8px 30px rgba(0,0,0,.35)" };
const cardResultado = { ...painel, padding: "34px 20px", marginTop: 24, textAlign: "center", borderWidth: 2 };
const btnJogar = {
  marginTop: 20, padding: "16px 40px", borderRadius: 14, border: "none",
  background: C.green, color: "#04170B", fontWeight: 900, fontSize: 18,
  cursor: "pointer", boxShadow: "0 6px 20px rgba(74,222,128,.25)",
};
