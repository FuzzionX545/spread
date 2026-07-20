import React, { useState, useMemo, useEffect } from "react";

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

const PESSOAS = ["👩‍🦰","👨‍🦱","👵","👨‍🌾","👩‍🍳","🧑‍🔧","👨‍💼","👩‍⚕️","🧑‍🎨","🧔","👩‍🏫","👨‍🔬"];
const NOMES = ["Maria","José","Ana","Carlos","Fê","Paulo","Ju","Rafa","Camila","Bruno","Lari","Diego","Paty","Thiago","Aline","Marcão","Rê","Guga","Bia","Felipe"];
const QUER = ["🏪 lojinha","🏠 reforma","📦 estoque","💳 quitar dívida","🛠️ máquina","🚚 food truck","📚 curso","🚗 conserto do carro"];

const MESES = 12; // duração da partida

const RISCO = { 1: 0.11, 2: 0.07, 3: 0.045, 4: 0.027, 5: 0.014 };
const TAXA  = { 1: 0.052, 2: 0.043, 3: 0.036, 4: 0.029, 5: 0.023 };

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
function tom(freq, dur = 0.12, type = "sine", vol = 0.14, delay = 0) {
  if (!somLigado) return;
  try {
    const a = actx(); if (!a) return;
    const o = a.createOscillator(), g = a.createGain();
    o.type = type; o.frequency.value = freq;
    const t = a.currentTime + delay;
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g); g.connect(a.destination);
    o.start(t); o.stop(t + dur + 0.02);
  } catch (e) {}
}
const SFX = {
  clique: () => tom(520, 0.06, "square", 0.07),
  aprova: () => { tom(660, 0.09); tom(990, 0.12, "sine", 0.12, 0.08); },
  rejeita: () => tom(200, 0.12, "square", 0.1),
  recusa: () => { tom(330, 0.1); tom(220, 0.14, "sine", 0.12, 0.09); },
  venda: () => { tom(1250, 0.05, "square", 0.09); tom(1650, 0.08, "square", 0.09, 0.06); },
  carta: () => tom(480, 0.05, "triangle", 0.08),
  calote: () => { tom(180, 0.18, "sawtooth", 0.15); tom(120, 0.25, "sawtooth", 0.15, 0.12); },
  mes: () => { tom(300, 0.08, "sine", 0.08); tom(420, 0.08, "sine", 0.08, 0.06); },
  win: () => [523, 659, 784, 1047].forEach((f, i) => tom(f, 0.18, "sine", 0.13, i * 0.13)),
  lose: () => [392, 330, 262, 196].forEach((f, i) => tom(f, 0.2, "sine", 0.13, i * 0.15)),
};
function musica(ligar) {
  if (musicTimer) { clearInterval(musicTimer); musicTimer = null; }
  if (!ligar || !somLigado) return;
  // pad ambiente: notas longas sobrepostas (sem pulso de "batimento")
  const notas = [220, 261.6, 329.6, 392, 329.6, 261.6, 246.9, 293.7];
  let i = 0;
  musicTimer = setInterval(() => {
    tom(notas[i % notas.length], 1.9, "triangle", 0.07);
    if (i % 4 === 0) tom(notas[i % notas.length] * 2, 1.3, "sine", 0.028);
    i++;
  }, 880);
}

let SEQ = 1;
function novoPedido() {
  const score = 1 + Math.floor(Math.random() * 5);
  const valor = (4 + Math.floor(Math.random() * 13)) * 1000;
  const prazo = [6, 8, 10, 12][Math.floor(Math.random() * 4)];
  return {
    id: SEQ++,
    emoji: PESSOAS[Math.floor(Math.random() * PESSOAS.length)],
    nome: NOMES[Math.floor(Math.random() * NOMES.length)],
    quer: QUER[Math.floor(Math.random() * QUER.length)],
    score, valor, prazo,
    humor: Math.random() < 0.45 ? "duro" : "deboa",
  };
}

function sorteiaMercado() {
  const r = Math.random();
  if (r < 0.3) return { rot: "🔥 comprador animado", adj: -0.02 };
  if (r < 0.75) return { rot: "😐 mercado normal", adj: 0 };
  return { rot: "🥶 comprador sumido", adj: 0.03 };
}

const INICIO = (modo = null) => ({
  tela: modo ? "jogo" : "intro",
  modo,                       // "fundo" | "mkt"
  mes: 1,
  caixa: 100000,
  senior: 80000,
  cofre0: 20000,
  carteira: [],
  pedidos: [novoPedido(), novoPedido(), novoPedido()],
  idx: 0,
  vendeuMes: false,
  mercado: sorteiaMercado(),
  fala: modo === "mkt" ? "Origina e repassa — lucro no giro! 🔁" : "Bora emprestar dinheiro! 🚀",
  anim: "",
  fila: [], filaIdx: 0,
  onda: 0, stress: 0,
  selic: 0.12,
  totalEmprestado: 0, perdas: 0,
  fim: null,
});

const devido = (l) => l.parcela * l.restantes;
const meu = (l) => devido(l) * (1 - (l.vendido || 0));

export default function App() {
  const [g, setG] = useState(() => INICIO());
  const [ajuda, setAjuda] = useState(false);
  const [som, setSom] = useState(true);
  const [qtd, setQtd] = useState(3); // tokens selecionados pra vender

  useEffect(() => {
    const aoOcultar = () => { if (document.hidden) musica(false); };
    document.addEventListener("visibilitychange", aoOcultar);
    window.addEventListener("pagehide", () => musica(false));
    return () => {
      musica(false);
      document.removeEventListener("visibilitychange", aoOcultar);
    };
  }, []);

  function alternarSom() {
    const novo = !som;
    setSom(novo);
    somLigado = novo;
    if (!novo) musica(false);
    else if (g.tela !== "intro") musica(true);
  }

  const saldoCarteira = g.carteira.reduce((s, l) => s + meu(l), 0);
  const cofre = g.caixa + saldoCarteira - g.senior;
  const vida = Math.max(0, Math.min(1, cofre / g.cofre0));
  const scoreMedio = g.carteira.length
    ? g.carteira.reduce((s, l) => s + l.score, 0) / g.carteira.length : 3;
  // tokenização RWA: carteira dividida em 10 tokens
  const maxTok = g.mercado.adj < 0 ? 10 : g.mercado.adj === 0 ? 6 : 3; // 🔥 até 10 · 😐 até 6 · 🥶 até 3
  const qtdOk = Math.max(1, Math.min(qtd, maxTok));
  const descBase = Math.max(0.04, 0.13 - scoreMedio * 0.012 + g.mercado.adj);
  const descTok = (q) => descBase + (q / 10) * 0.06; // quanto maior o lote, maior o desconto
  const p = g.pedidos[g.idx];
  const acabou = g.idx >= g.pedidos.length;
  const semCaixa = p && g.caixa < p.valor;

  // opções de taxa: cliente pechincheiro recusa mais fácil
  const duro = p && p.humor === "duro";
  const opcoes = p ? [
    { rot: "😇", t: Math.max(0.015, TAXA[p.score] - 0.008), aceita: 1.0 },
    { rot: "🙂", t: TAXA[p.score], aceita: duro ? 0.7 : 0.95 },
    { rot: "🤑", t: TAXA[p.score] + 0.015, aceita: duro ? 0.3 : 0.65 },
  ] : [];

  const nota = useMemo(() => {
    const rent = (cofre - g.cofre0) / g.cofre0;
    const base = g.fim === "win" ? 55
      : g.fim === "out" ? 25 + Math.round(30 * (Math.min(g.mes, MESES) - 1) / MESES)
      : 20;
    return Math.max(1, Math.min(99, Math.round(base + rent * 60)));
  }, [cofre, g.cofre0, g.fim, g.mes]);

  function ofertar(op) {
    if (!p || semCaixa) return;
    const aceitou = Math.random() < op.aceita;
    aceitou ? SFX.aprova() : SFX.recusa();
    setG((s) => {
      if (!aceitou) {
        return {
          ...s, idx: s.idx + 1, anim: "left",
          fala: `${p.emoji} ${p.nome} ${FALAS_RECUSA[Math.floor(Math.random() * FALAS_RECUSA.length)]}`,
        };
      }
      const parcela = (p.valor * (1 + op.t * p.prazo)) / p.prazo;
      return {
        ...s,
        caixa: s.caixa - p.valor,
        totalEmprestado: s.totalEmprestado + p.valor,
        carteira: [...s.carteira, { ...p, taxa: op.t, parcela, restantes: p.prazo, vendido: 0 }],
        idx: s.idx + 1, anim: "right",
        fala: FALAS_OK[Math.floor(Math.random() * FALAS_OK.length)],
      };
    });
    setTimeout(() => setG((s) => ({ ...s, anim: "" })), 350);
  }

  function rejeitar() {
    SFX.rejeita();
    setG((s) => ({
      ...s, idx: s.idx + 1, anim: "left",
      fala: FALAS_REJEITA[Math.floor(Math.random() * FALAS_REJEITA.length)],
    }));
    setTimeout(() => setG((s) => ({ ...s, anim: "" })), 350);
  }

  function venderTokens(qtd, desc) {
    SFX.venda();
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
    SFX.clique();
    setG((s) => ({ ...s, fim: "out", tela: "fim" }));
  }

  function rodarMes() {
    SFX.mes();
    setG((s) => {
      const fila = [];
      let { caixa, senior, perdas, onda, stress, selic } = s;
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

      // FUNDO: parcelas e calotes (divididos com donos de tokens)
      let recebido = 0, quitados = 0; const sobrev = [];
      for (const l of carteira) {
        const rEf = RISCO[l.score] * mult *
          (l.taxa > TAXA[l.score] + 0.005 ? 1.35 : l.taxa < TAXA[l.score] - 0.004 ? 0.85 : 1);
        if (Math.random() < rEf) {
          const perda = meu(l);
          perdas += perda;
          fila.push({ emoji: "💥", titulo: "CALOTE!", sub: `${l.emoji} ${l.nome} sumiu — sua parte da perda`, delta: -perda, cor: C.red, shake: true });
        } else {
          recebido += l.parcela * (1 - (l.vendido || 0));
          const resto = l.restantes - 1;
          if (resto > 0) sobrev.push({ ...l, restantes: resto });
          else quitados++;
        }
      }
      caixa += recebido;

      // investidores do fundo / banco
      const custo = senior * (selic / 12 + 0.004);
      senior += custo;

      // custo operacional fixo (equipe, sistema, cobrança)
      const OPEX = 800;
      caixa -= OPEX;

      // carta-resumo única do fechamento
      const liquido = recebido - custo - OPEX;
      const partes = [];
      if (recebido > 0) partes.push(`💰 +${fmt(recebido)} parcelas`);
      partes.push(`🏦 –${fmt(custo)} juros dos investidores`);
      partes.push(`🏢 –${fmt(OPEX)} custo fixo (equipe/sistema)`);
      if (quitados > 0) partes.push(`🎉 ${quitados} ${quitados > 1 ? "quitaram" : "quitou"}`);
      fila.unshift({ emoji: "📊", titulo: "Fechamento do mês", sub: partes.join(" · "), delta: liquido, cor: liquido >= 0 ? C.green : C.amber });

      // eventos
      onda = Math.max(0, onda - 1);
      stress = Math.max(0, stress - 1);
      const r = Math.random();
      if (r < 0.12) { selic = Math.min(0.18, selic + 0.01); fila.push({ emoji: "📈", titulo: "Selic subiu!", sub: `${pctm(selic)}% a.a. — seu custo subiu`, delta: 0, cor: C.amber }); }
      else if (r < 0.20) { selic = Math.max(0.08, selic - 0.01); fila.push({ emoji: "📉", titulo: "Selic caiu", sub: `${pctm(selic)}% a.a. — custo aliviou`, delta: 0, cor: C.green }); }
      else if (r < 0.35) {
        if (s.modo === "mkt") { stress = 2; fila.push({ emoji: "🥶", titulo: "Compradores sumiram!", sub: "descontos maiores por 2 meses", delta: 0, cor: C.red, shake: true }); }
        else { onda = 2; fila.push({ emoji: "🌪️", titulo: "Crise chegando!", sub: "risco de calote 2x por 2 meses", delta: 0, cor: C.red, shake: true }); }
      }
      else if (r < 0.43 && senior > 20000) {
        const saque = Math.min(12000, senior * 0.15);
        if (caixa >= saque) { caixa -= saque; senior -= saque; fila.push({ emoji: "🏃", titulo: "Investidor sacou", sub: "seu caixa aguentou", delta: -saque, cor: C.amber }); }
        else fila.push({ emoji: "🚨", titulo: "Quer sacar e não tem caixa!", sub: "venda a carteira JÁ", delta: 0, cor: C.red, shake: true });
      }

      const novoSaldo = sobrev.reduce((t, l) => t + meu(l), 0);
      const novoCofre = caixa + novoSaldo - senior;
      const mes = s.mes + 1;
      let fim = null;
      if (novoCofre <= 0) fim = "lose";
      else if (mes > MESES) fim = "win";

      return {
        ...s, caixa, senior, perdas, onda, stress, selic, fim,
        carteira: sobrev, mes: Math.min(mes, MESES + 1),
        pedidos: [novoPedido(), novoPedido(), novoPedido()], idx: 0,
        vendeuMes: false, mercado: sorteiaMercado(),
        tela: "resolvendo", fila, filaIdx: 0,
        fala: "Vamos ver como foi o mês… 🤞",
      };
    });
  }

  function proximaCarta() {
    if (g.filaIdx + 1 < g.fila.length) {
      const prox = g.fila[g.filaIdx + 1];
      prox && prox.shake ? SFX.calote() : SFX.carta();
    } else if (g.fim === "win") SFX.win();
    else if (g.fim === "lose") SFX.lose();
    else SFX.carta();
    setG((s) => {
      if (s.filaIdx + 1 < s.fila.length) return { ...s, filaIdx: s.filaIdx + 1 };
      if (s.fim) return { ...s, tela: "fim" };
      return { ...s, tela: "jogo", fala: "Novo mês, novos clientes! 📅" };
    });
  }

  const css = `
    @keyframes pop { 0%{transform:scale(.6);opacity:0} 100%{transform:scale(1);opacity:1} }
    @keyframes shakeX { 0%,100%{transform:translateX(0)} 25%{transform:translateX(-8px)} 75%{transform:translateX(8px)} }
    @keyframes slideL { to{transform:translateX(-120%) rotate(-8deg);opacity:0} }
    @keyframes slideR { to{transform:translateX(120%) rotate(8deg);opacity:0} }
    @keyframes float { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-6px)} }
    .pop{animation:pop .35s ease} .shake{animation:shakeX .35s ease}
    .left{animation:slideL .3s ease forwards} .right{animation:slideR .3s ease forwards}
    .float{animation:float 2.4s ease-in-out infinite}
    @media (prefers-reduced-motion: reduce){ *{animation:none!important} }
  `;

  /* ============ INTRO ============ */
  if (g.tela === "intro") {
    return (
      <Frame css={css}>
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
          <div style={{ color: C.green, fontSize: 12, letterSpacing: 3, fontFamily: "ui-monospace, monospace", marginBottom: 6 }}>
            O JOGO DO CRÉDITO
          </div>
          <div style={{ color: C.mute, fontSize: 14, marginBottom: 40 }}>
            você aguenta {MESES} meses?
          </div>

          <div>
            <button onClick={() => { SFX.clique(); musica(true); setG(INICIO("fundo")); }} style={{ ...btnJogar, marginTop: 0, fontSize: 18, padding: "16px 64px" }}>
              ▶ JOGAR
            </button>
          </div>
          <div>
            <button onClick={() => setAjuda(true)} style={{ background: "none", border: "none", color: C.mute, fontSize: 13, cursor: "pointer", marginTop: 26, textDecoration: "underline" }}>
              ? ajuda
            </button>
          </div>
          {ajuda && <Ajuda onClose={() => setAjuda(false)} />}
          <p style={{ color: "#4A5C52", fontSize: 10, marginTop: 34 }}>
            simulação educacional · dinheiro fictício · fuzzionx.com ·{" "}
            <a
              href="https://github.com/FuzzionX545/spread"
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: "#4A5C52" }}
            >
              código
            </a>
          </p>
        </div>
      </Frame>
    );
  }

  /* ============ RESOLVENDO ============ */
  if (g.tela === "resolvendo") {
    const c = g.fila[g.filaIdx] || { emoji: "😴", titulo: "Mês tranquilo", sub: "nada aconteceu", delta: 0, cor: C.mute };
    return (
      <Frame css={css}>
        <Topo g={g} cofre={cofre} vida={vida} onAjuda={() => setAjuda(true)} onReset={() => setG(INICIO())} som={som} onSom={alternarSom} />
        {ajuda && <Ajuda onClose={() => setAjuda(false)} />}
        <div onClick={proximaCarta} className={c.shake ? "shake" : "pop"} key={g.filaIdx}
          style={{ ...cardResultado, cursor: "pointer", borderColor: c.cor }}>
          <div style={{ fontSize: 72 }}>{c.emoji}</div>
          <div style={{ color: c.cor, fontSize: 26, fontWeight: 900 }}>{c.titulo}</div>
          <div style={{ color: C.mute, fontSize: 14 }}>{c.sub}</div>
          {c.delta !== 0 && (
            <div style={{ color: c.delta > 0 ? C.green : C.red, fontSize: 30, fontWeight: 900, marginTop: 6 }}>
              {c.delta > 0 ? "+" : "–"}{fmt(c.delta)}
            </div>
          )}
          <div style={{ color: C.mute, fontSize: 12, marginTop: 14 }}>
            toque pra continuar · {g.filaIdx + 1}/{g.fila.length || 1}
          </div>
        </div>
      </Frame>
    );
  }

  /* ============ FIM ============ */
  if (g.tela === "fim") {
    const win = g.fim === "win";
    const out = g.fim === "out";
    const corFim = win ? C.green : out ? C.amber : C.red;
    return (
      <Frame css={css}>
        <div style={{ position: "relative", textAlign: "center", paddingTop: 40 }} className="pop">
          <div style={{
            position: "absolute", top: -30, left: "50%", transform: "translateX(-50%)",
            width: 320, height: 320, borderRadius: "50%", pointerEvents: "none",
            background: `radial-gradient(circle, ${win ? "rgba(74,222,128,.16)" : out ? "rgba(251,191,36,.14)" : "rgba(248,113,113,.14)"} 0%, transparent 70%)`,
          }} />
          <div style={{ fontSize: 84, position: "relative" }}>{win ? "🏆" : out ? "🏁" : "💀"}</div>
          <h1 style={{ color: corFim, fontSize: 34, fontWeight: 900, margin: "8px 0" }}>
            {win ? "SOBREVIVEU!" : out ? "ENCERROU!" : "QUEBROU!"}
          </h1>
          <div style={{ color: C.mute }}>
            {win ? `${MESES} meses no comando do fundo 😎`
              : out ? `Saiu no mês ${Math.min(g.mes, MESES)} com o resultado no bolso`
              : `Seu cofre zerou no mês ${g.mes - 1} 💥`}
          </div>
          <div style={{ ...painel, maxWidth: 340, margin: "22px auto", padding: 20 }}>
            <div style={{ color: C.mute, fontSize: 12, letterSpacing: 2 }}>SUA NOTA</div>
            <div style={{ color: C.green, fontSize: 64, fontWeight: 900, lineHeight: 1 }}>{nota}</div>
            <div style={{ color: C.mute, fontSize: 12 }}>de 99</div>
            <div style={{ borderTop: `1px solid ${C.line}`, marginTop: 14, paddingTop: 12, display: "grid", gap: 6, fontSize: 14 }}>
              <Res emoji="💵" k="Seu cofre no fim" v={fmt(Math.max(0, cofre))} />
              <Res emoji="🤝" k="Emprestado" v={fmt(g.totalEmprestado)} />
              <Res emoji="💥" k="Perdido em calote" v={fmt(g.perdas)} />
            </div>
          </div>
          <button style={btnJogar} onClick={() => setG(INICIO())}>↻ JOGAR DE NOVO</button>
          <p style={{ color: C.mute, fontSize: 12, marginTop: 16 }}>Manda sua nota pra galera 😏 · fuzzionx.com</p>
        </div>
      </Frame>
    );
  }

  /* ============ JOGO ============ */
  return (
    <Frame css={css}>
      <Topo g={g} cofre={cofre} vida={vida} onAjuda={() => setAjuda(true)} onReset={() => setG(INICIO())} som={som} onSom={alternarSom} />
      {ajuda && <Ajuda onClose={() => setAjuda(false)} />}

      <div style={{ display: "flex", alignItems: "flex-end", gap: 8, margin: "10px 0 6px" }}>
        <div style={{ fontSize: 34 }} className="float">🤖</div>
        <Balao txt={g.fala} mini />
      </div>

      {!acabou && p ? (
        <div className={g.anim} key={p.id} style={cardCliente}>
          <div style={{ fontSize: 60, textAlign: "center" }}>{p.emoji}</div>
          <div style={{ textAlign: "center", color: C.text, fontWeight: 800, fontSize: 19 }}>
            {p.nome} <span style={{ fontWeight: 400, color: C.mute, fontSize: 14 }}>quer {p.quer}</span>
          </div>
          <div style={{ textAlign: "center", fontSize: 18, letterSpacing: 2, margin: "4px 0" }}>
            {"⭐".repeat(p.score)}{"▫️".repeat(5 - p.score)}
          </div>
          <div style={{ display: "flex", justifyContent: "center", gap: 8, margin: "6px 0 10px", flexWrap: "wrap" }}>
            <Tag>{fmt(p.valor)}</Tag>
            <Tag>{p.prazo} meses</Tag>
            <Tag>{p.humor === "duro" ? "🤨 pechincheiro" : "😄 de boa"}</Tag>
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
        <div style={{ ...painel, marginTop: 12, padding: 12 }}>
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

      {g.mes > 1 && (
        <button onClick={encerrar} style={{ width: "100%", marginTop: 10, background: "none", border: "none", color: C.mute, fontSize: 12, cursor: "pointer", textDecoration: "underline" }}>
          🏁 encerrar agora e ver minha nota
        </button>
      )}

      <p style={{ color: C.mute, fontSize: 10, textAlign: "center", marginTop: 14 }}>
        simulação educacional · dinheiro fictício
      </p>
    </Frame>
  );
}

/* ---------- componentes ---------- */

function Topo({ g, cofre, vida, onAjuda, onReset, som, onSom }) {
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ color: C.mute, fontSize: 12, fontWeight: 700 }}>
          {g.modo === "mkt" ? "🔁" : "🛡️"} MÊS {Math.min(g.mes, MESES)}<span style={{ opacity: 0.5 }}>/{MESES}</span>
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

const DICAS = [
  { e: "🛡️", t: "Seu cofre", d: "São os SEUS R$ 20 mil. Todo calote sai daqui. Zerou = fim de jogo. (No marketplace, é o patrimônio da sua empresa.)" },
  { e: "💬", t: "Você define a taxa", d: "Taxa baixa: todo mundo aceita. Taxa alta: mais lucro, mas cliente 🤨 pechincheiro recusa — e parcela pesada aumenta o risco de calote!" },
  { e: "⭐", t: "Estrelas", d: "Mais estrelas = paga certinho. Menos estrelas = risco alto (cobre mais caro pra compensar!)." },
  { e: "🪙", t: "Tokenização (RWA)", d: "Suas dívidas viram 10 tokens. Escolha quantos vender: recebe na hora, e o risco daquela parte vai junto. Lote maior = desconto maior. Pode vender de novo todo mês." },
  { e: "🛒", t: "Mercado", d: "O humor do comprador limita o lote: 🥶 até 3 · 😐 até 6 · 🔥 até 10 tokens. E mexe no desconto. Máximo 1 venda por mês." },
  { e: "🏢", t: "Custo de operação", d: "Equipe e sistema custam R$ 800 todo mês. Ficar parado ou operar com margem apertada demais também quebra." },
  { e: "🏃", t: "Cuidado", d: "Investidor pode sacar do nada. Deixe sempre uma grana no caixa." },
];

function Ajuda({ onClose }) {
  return (
    <div onClick={onClose} style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,.7)", zIndex: 50,
      display: "flex", alignItems: "center", justifyContent: "center", padding: 16,
    }}>
      <div onClick={(e) => e.stopPropagation()} className="pop" style={{ ...painel, padding: 18, maxWidth: 380, width: "100%", textAlign: "left", maxHeight: "85vh", overflowY: "auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
          <b style={{ color: C.text, fontSize: 17 }}>❓ Como joga</b>
          <button onClick={onClose} style={{ background: "none", border: "none", color: C.mute, fontSize: 20, cursor: "pointer" }}>✕</button>
        </div>
        <div style={{ display: "grid", gap: 10 }}>
          {DICAS.map((d) => (
            <div key={d.t} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
              <span style={{ fontSize: 24 }}>{d.e}</span>
              <div>
                <b style={{ color: C.text, fontSize: 14 }}>{d.t}</b>
                <div style={{ color: C.mute, fontSize: 12.5, lineHeight: 1.45 }}>{d.d}</div>
              </div>
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

function Res({ emoji, k, v }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", color: C.text }}>
      <span style={{ color: C.mute }}>{emoji} {k}</span><b>{v}</b>
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
