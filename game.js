/**
 * ============================================================================
 * TETRO / BALATRO - GAME ENGINE (Vanilla JS)
 * Tetris clássico com visual, combos, multiplicadores e intensidade Balatro.
 * 100% puro: Sem frameworks, sem bibliotecas, sem arquivos externos.
 * ============================================================================
 */

(function () {
  'use strict';

  // --- CONFIGURAÇÕES DO TABULEIRO ---
  // Resolução lógica interna mantida em 10x20 (320x640px) para máxima precisão de renderização
  // e física SRS. A escala visual responsiva (100% de zoom em 1366x768 até 1920x1080)
  // é gerenciada dinamicamente via CSS com unidades relativas (clamp, vh).
  const COLS = 10;
  const ROWS = 20;
  const BLOCK_SIZE = 32; // Buffer nativo 320x640 canvas

  // --- PALETA DAS 7 PEÇAS (Estilo Balatro Saturado / Chips) ---
  const TETROMINO_COLORS = {
    I: { base: '#0bd4bd', light: '#70fff0', dark: '#056d61', shadow: '#033f38' }, // Ciano
    O: { base: '#f4be13', light: '#ffec78', dark: '#9c7704', shadow: '#594401' }, // Ouro
    T: { base: '#9b51e0', light: '#d399ff', dark: '#5b1ea1', shadow: '#371064' }, // Roxo
    S: { base: '#2ecc71', light: '#86ffb6', dark: '#167a3e', shadow: '#0c4d26' }, // Verde
    Z: { base: '#ea3c36', light: '#ff8681', dark: '#8f1b17', shadow: '#590e0b' }, // Vermelho
    J: { base: '#008ee6', light: '#68c8ff', dark: '#00538a', shadow: '#003357' }, // Azul
    L: { base: '#f49b13', light: '#ffd175', dark: '#995a00', shadow: '#5e3700' }  // Laranja
  };

  // Formas das 7 peças (matrizes 4x4 ou 3x3)
  const SHAPES = {
    I: [
      [0, 0, 0, 0],
      [1, 1, 1, 1],
      [0, 0, 0, 0],
      [0, 0, 0, 0]
    ],
    O: [
      [1, 1],
      [1, 1]
    ],
    T: [
      [0, 1, 0],
      [1, 1, 1],
      [0, 0, 0]
    ],
    S: [
      [0, 1, 1],
      [1, 1, 0],
      [0, 0, 0]
    ],
    Z: [
      [1, 1, 0],
      [0, 1, 1],
      [0, 0, 0]
    ],
    J: [
      [1, 0, 0],
      [1, 1, 1],
      [0, 0, 0]
    ],
    L: [
      [0, 0, 1],
      [1, 1, 1],
      [0, 0, 0]
    ]
  };

  // --- SRS (SUPER ROTATION SYSTEM) WALL KICK DATA ---
  // Kicks para J, L, S, T, Z
  const KICKS_JLSTZ = {
    '0->1': [[0, 0], [-1, 0], [-1, 1], [0, -2], [-1, -2]],
    '1->0': [[0, 0], [1, 0], [1, -1], [0, 2], [1, 2]],
    '1->2': [[0, 0], [1, 0], [1, -1], [0, 2], [1, 2]],
    '2->1': [[0, 0], [-1, 0], [-1, 1], [0, -2], [-1, -2]],
    '2->3': [[0, 0], [1, 0], [1, 1], [0, -2], [1, -2]],
    '3->2': [[0, 0], [-1, 0], [-1, -1], [0, 2], [-1, 2]],
    '3->0': [[0, 0], [-1, 0], [-1, -1], [0, 2], [-1, 2]],
    '0->3': [[0, 0], [1, 0], [1, 1], [0, -2], [1, -2]]
  };

  // Kicks para a peça I
  const KICKS_I = {
    '0->1': [[0, 0], [-2, 0], [1, 0], [-2, -1], [1, 2]],
    '1->0': [[0, 0], [2, 0], [-1, 0], [2, 1], [-1, -2]],
    '1->2': [[0, 0], [-1, 0], [2, 0], [-1, 2], [2, -1]],
    '2->1': [[0, 0], [1, 0], [-2, 0], [1, -2], [-2, 1]],
    '2->3': [[0, 0], [2, 0], [-1, 0], [2, 1], [-1, -2]],
    '3->2': [[0, 0], [-2, 0], [1, 0], [-2, -1], [1, 2]],
    '3->0': [[0, 0], [1, 0], [-2, 0], [1, -2], [-2, 1]],
    '0->3': [[0, 0], [-1, 0], [2, 0], [-1, 2], [2, -1]]
  };

  // --- FUNÇÃO AUXILIAR PARA RENDERIZAR ÍCONES (PNGs individuais 32x32px em assets/items/) ---
  // Não usa corte de sprite sheet: cada ícone é carregado diretamente como imagem própria (<img>)
  // com renderização pixelada (image-rendering: pixelated) para máxima nitidez pixel art.
  function getItemIconHTML(item, extraClass = '') {
    if (!item || !item.sprite) return '';
    return `<img src="${item.sprite}" class="item-sprite-icon ${extraClass}" alt="${item.name}" draggable="false" />`;
  }

  // --- CATÁLOGO DOS 28 ITENS ROGUELIKE (Tier 0 a 4, Passivos e Ativos) ---
  // Pesos de sorteio balanceados por tier (Tier 0 = 60, Tier 1 = 35, Tier 2 = 20, Tier 3 = 12, Tier 4 = 6)
  // Sprite-0023.png é mantido sem uso conforme especificação.
  const ROGUELIKE_ITEMS = {
    oculos: {
      id: 'oculos',
      name: 'Óculos',
      tier: 1,
      tierName: 'TIER 1',
      tierClass: 'tier-1',
      quote: 'Eu estou venho peças em dobro!',
      sprite: 'assets/items/Sprite-0001.png',
      type: 'passive',
      weight: 35,
      desc: (stacks) => `Duplica seus itens passivos, porém as peças ficam duas vezes mais rápidas`
    },
    bomba: {
      id: 'bomba',
      name: 'Bomba',
      tier: 3,
      tierName: 'TIER 3',
      tierClass: 'tier-3',
      quote: 'Explosão Controlada',
      sprite: 'assets/items/Sprite-0002.png',
      type: 'active',
      cooldownPieces: 30,
      weight: 12,
      desc: (stacks) => `Ativo: explode uma área 3x3 escolhida a cada 30 peças`
    },
    ima: {
      id: 'ima',
      name: 'Ímã',
      tier: 0,
      tierName: 'TIER 0',
      tierClass: 'tier-0',
      quote: 'Vem aqui, pecinha...',
      sprite: 'assets/items/Sprite-0003.png',
      type: 'passive',
      weight: 60,
      desc: (stacks) => `Movimento das peças vira uma onda`
    },
    escudo: {
      id: 'escudo',
      name: 'Escudo',
      tier: 2,
      tierName: 'TIER 2',
      tierClass: 'tier-2',
      quote: 'NÃO HOJE.',
      sprite: 'assets/items/Sprite-0004.png',
      type: 'passive',
      weight: 20,
      desc: (stacks) => `Impede o Game Over, remove 1 linha e sai do inventário`
    },
    relogio: {
      id: 'relogio',
      name: 'Relógio',
      tier: 3,
      tierName: 'TIER 3',
      tierClass: 'tier-3',
      quote: 'Eu quero voltar.',
      sprite: 'assets/items/Sprite-0005.png',
      type: 'active',
      maxCharges: 3,
      chargesRemaining: 3,
      weight: 12,
      desc: (stacks) => `Ativo: volta o estado do jogo em até 20s, 3 usos`
    },
    d6: {
      id: 'd6',
      name: 'D6',
      tier: 4,
      tierName: 'TIER 4',
      tierClass: 'tier-4',
      quote: 'Role os dados novamente.',
      sprite: 'assets/items/Sprite-0006.png',
      type: 'passive',
      weight: 6,
      desc: (stacks) => `Permite trocar os itens na escolha, com botão de troca que ganha mais usos por stack`
    },
    backspace_key: {
      id: 'backspace_key',
      name: 'Backspace Key',
      tier: 4,
      tierName: 'TIER 4',
      tierClass: 'tier-4',
      quote: 'Apaga tudo e recomeça.',
      sprite: 'assets/items/Sprite-0007.png',
      type: 'active',
      maxCharges: 1,
      chargesRemaining: 1,
      weight: 6,
      desc: (stacks) => `Ativo, uso único: remove TODAS as peças do tabuleiro (limpa o tabuleiro inteiro) e zera a pontuação do jogador (score total e fichas/mult, se existirem). Depois de usado, é consumido e sai do inventário`
    },
    tijolo: {
      id: 'tijolo',
      name: 'Tijolo',
      tier: 0,
      tierName: 'TIER 0',
      tierClass: 'tier-0',
      quote: 'Construção pesada.',
      sprite: 'assets/items/Sprite-0008.png',
      type: 'passive',
      weight: 60,
      desc: (stacks) => `Adiciona 3 blocos aleatórios ao tabuleiro a cada 20 peças`
    },
    dna: {
      id: 'dna',
      name: 'DNA',
      tier: 0,
      tierName: 'TIER 0',
      tierClass: 'tier-0',
      quote: 'Mutação!',
      sprite: 'assets/items/Sprite-0009.png',
      type: 'passive',
      weight: 60,
      desc: (stacks) => `Próxima peça pode virar uma forma irregular`
    },
    pocao: {
      id: 'pocao',
      name: 'Poção',
      tier: 0,
      tierName: 'TIER 0',
      tierClass: 'tier-0',
      quote: 'Bebe aí, confia.',
      sprite: 'assets/items/Sprite-0010.png',
      type: 'active',
      cooldownPieces: 20,
      weight: 60,
      desc: (stacks) => `Ativo: efeito aleatório, pode ajudar ou atrapalhar`
    },
    fogo: {
      id: 'fogo',
      name: 'Fogo',
      tier: 4,
      tierName: 'TIER 4',
      tierClass: 'tier-4',
      quote: 'QUEIMA TUDO!',
      sprite: 'assets/items/Sprite-0011.png',
      type: 'passive',
      weight: 6,
      desc: (stacks) => `Queima uma linha e as adjacentes, vira pontos`
    },
    liquido_misterioso: {
      id: 'liquido_misterioso',
      name: 'Líquido Misterioso',
      tier: 4,
      tierName: 'TIER 4',
      tierClass: 'tier-4',
      quote: 'Isso ai não foi testado bem',
      sprite: 'assets/items/Sprite-0012.png',
      type: 'active',
      cooldownPieces: 25,
      weight: 6,
      desc: (stacks) => `Ativo: edita a peça atual (grade 5x5)`
    },
    fantasma: {
      id: 'fantasma',
      name: 'Fantasma',
      tier: 0,
      tierName: 'TIER 0',
      tierClass: 'tier-0',
      quote: 'Buuu...',
      sprite: 'assets/items/Sprite-0013.png',
      type: 'passive',
      weight: 60,
      desc: (stacks) => `Chance da peça ficar transparente`
    },
    controle: {
      id: 'controle',
      name: 'Controle',
      tier: 0,
      tierName: 'TIER 0',
      tierClass: 'tier-0',
      quote: 'Pensa, pensa...',
      sprite: 'assets/items/Sprite-0014.png',
      type: 'passive',
      weight: 60,
      desc: (stacks) => `Embaralha controles, dobra pontos`
    },
    extintor: {
      id: 'extintor',
      name: 'Extintor',
      tier: 0,
      tierName: 'TIER 0',
      tierClass: 'tier-0',
      quote: 'MEUS OLHOS',
      sprite: 'assets/items/Sprite-0015.png',
      type: 'passive',
      weight: 60,
      desc: (stacks) => `Fumaça bloqueia a visão temporariamente`
    },
    relogio_quebrado: {
      id: 'relogio_quebrado',
      name: 'Relógio Quebrado',
      tier: 0,
      tierName: 'TIER 0',
      tierClass: 'tier-0',
      quote: 'Tempo é relativo.',
      sprite: 'assets/items/Sprite-0016.png',
      type: 'passive',
      weight: 60,
      desc: (stacks) => `Passivo: a velocidade de queda da peça atual muda aleatoriamente (pode acelerar ou voltar ao normal, de forma imprevisível)`
    },
    vulcao: {
      id: 'vulcao',
      name: 'Vulcão',
      tier: 1,
      tierName: 'TIER 1',
      tierClass: 'tier-1',
      quote: 'ERUPÇÃO!',
      sprite: 'assets/items/Sprite-0017.png',
      type: 'passive',
      weight: 35,
      desc: (stacks) => `Remove blocos da parte inferior`
    },
    meteoro: {
      id: 'meteoro',
      name: 'Meteoro',
      tier: 3,
      tierName: 'TIER 3',
      tierClass: 'tier-3',
      quote: 'OLHA PRA CIMA!',
      sprite: 'assets/items/Sprite-0018.png',
      type: 'active',
      cooldownPieces: 25,
      weight: 12,
      desc: (stacks) => `Ativo: destrói uma área escolhida`
    },
    clone: {
      id: 'clone',
      name: 'Clone',
      tier: 0,
      tierName: 'TIER 0',
      tierClass: 'tier-0',
      quote: 'Eu posso fazer isso duas vezes.',
      sprite: 'assets/items/Sprite-0019.png',
      type: 'passive',
      weight: 60,
      desc: (stacks) => `Duplica a próxima peça sem avisar`
    },
    learn_how_to_jump: {
      id: 'learn_how_to_jump',
      name: 'Learn how to jump',
      tier: 0,
      tierName: 'TIER 0',
      tierClass: 'tier-0',
      quote: 'Pula, pula!',
      sprite: 'assets/items/Sprite-0020.png',
      type: 'passive',
      weight: 60,
      desc: (stacks) => `Próxima peça salta para uma posição horizontal aleatória ao surgir`
    },
    vassoura: {
      id: 'vassoura',
      name: 'Vassoura',
      tier: 1,
      tierName: 'TIER 1',
      tierClass: 'tier-1',
      quote: 'Só vou dar uma limpada.',
      sprite: 'assets/items/Sprite-0021.png',
      type: 'active',
      cooldownPieces: 20,
      weight: 35,
      desc: (stacks) => `Ativo: remove 2 blocos escolhidos`
    },
    pena: {
      id: 'pena',
      name: 'Pena',
      tier: 3,
      tierName: 'TIER 3',
      tierClass: 'tier-3',
      quote: 'Levinho...',
      sprite: 'assets/items/Sprite-0022.png',
      type: 'passive',
      weight: 12,
      desc: (stacks) => `Peça atual cai 20% mais devagar`
    },
    balao: {
      id: 'balao',
      name: 'Balão',
      tier: 1,
      tierName: 'TIER 1',
      tierClass: 'tier-1',
      quote: 'Não vai embora!',
      sprite: 'assets/items/Sprite-0024.png',
      type: 'passive',
      weight: 35,
      desc: (stacks) => `Próxima peça fica 20% mais lenta`
    },
    construtor: {
      id: 'construtor',
      name: 'Construtor',
      tier: 2,
      tierName: 'TIER 2',
      tierClass: 'tier-2',
      quote: 'Vou colocar só um aqui.',
      sprite: 'assets/items/Sprite-0025.png',
      type: 'active',
      cooldownPieces: 35,
      weight: 20,
      desc: (stacks) => `Ativo: coloca 2 blocos a cada 35 peças`
    },
    olho_futuro: {
      id: 'olho_futuro',
      name: 'Olho do Futuro',
      tier: 4,
      tierName: 'TIER 4',
      tierClass: 'tier-4',
      quote: 'Eu já vi isso acontecer.',
      sprite: 'assets/items/Sprite-0026.png',
      type: 'passive',
      weight: 6,
      desc: (stacks) => `Mostra as próximas 10 peças`
    },
    glitch: {
      id: 'glitch',
      name: 'Glitch',
      tier: 4,
      tierName: 'TIER 4',
      tierClass: 'tier-4',
      quote: 'Isso definitivamente não é um bug.',
      sprite: 'assets/items/Sprite-0027.png',
      type: 'active',
      cooldownPieces: 40,
      weight: 6,
      desc: (stacks) => `Desliga colisão por alguns segundos`
    },
    pedra: {
      id: 'pedra',
      name: 'Pedra',
      tier: 0,
      tierName: 'TIER 0',
      tierClass: 'tier-0',
      quote: 'É uma pedra, do que você esperava',
      sprite: 'assets/items/Sprite-0028.png',
      type: 'passive',
      weight: 60,
      desc: (stacks) => `Sem efeito relevante`
    },
    trevo_4_folhas: {
      id: 'trevo_4_folhas',
      name: 'Trevo de 4 folhas',
      tier: 4,
      tierName: 'TIER 4',
      tierClass: 'tier-4',
      quote: 'Sorte pura.',
      sprite: 'assets/items/Sprite-0029.png',
      type: 'passive',
      weight: 6,
      desc: (stacks) => `Mostra quais itens de Tier 0 vão aparecer nas próximas escolhas`
    }
  };

  // ============================================================================
  // MOTOR DE ÁUDIO SINTETIZADO (Web Audio API - Sem arquivos)
  // ============================================================================
  class SoundEngine {
    constructor() {
      this.ctx = null;
      this.isMuted = false;
      this.musicPlaying = false;
      this.stepTimer = null;
      this.currentStep = 0;
      this.bpm = 118;
      this.initOnFirstGesture();
    }

    initContext() {
      if (!this.ctx) {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (AudioCtx) {
          this.ctx = new AudioCtx();
        }
      }
      if (this.ctx && this.ctx.state === 'suspended') {
        this.ctx.resume();
      }
    }

    initOnFirstGesture() {
      const unlock = () => {
        this.initContext();
        if (this.ctx && !this.musicPlaying && !this.isMuted) {
          this.startMusic();
        }
        window.removeEventListener('keydown', unlock);
        window.removeEventListener('pointerdown', unlock);
      };
      window.addEventListener('keydown', unlock);
      window.addEventListener('pointerdown', unlock);
    }

    toggleMute() {
      this.isMuted = !this.isMuted;
      if (this.isMuted) {
        this.stopMusic();
      } else {
        this.initContext();
        this.startMusic();
      }
      return this.isMuted;
    }

    // Som de mover a peça
    playMove() {
      if (this.isMuted || !this.ctx) return;
      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(280, t);
      osc.frequency.exponentialRampToValueAtTime(140, t + 0.04);
      gain.gain.setValueAtTime(0.08, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.04);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(t);
      osc.stop(t + 0.04);
    }

    // Som de girar a peça
    playRotate() {
      if (this.isMuted || !this.ctx) return;
      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(360, t);
      osc.frequency.exponentialRampToValueAtTime(620, t + 0.06);
      gain.gain.setValueAtTime(0.12, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.06);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(t);
      osc.stop(t + 0.06);
    }

    // Som de pousar (soft drop / lock suave)
    playLand() {
      if (this.isMuted || !this.ctx) return;
      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(120, t);
      osc.frequency.exponentialRampToValueAtTime(40, t + 0.07);
      gain.gain.setValueAtTime(0.15, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.07);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(t);
      osc.stop(t + 0.07);
    }

    // Som de Hard Drop (batida forte de impacto)
    playHardDrop() {
      if (this.isMuted || !this.ctx) return;
      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(200, t);
      osc.frequency.exponentialRampToValueAtTime(35, t + 0.12);
      gain.gain.setValueAtTime(0.35, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(t);
      osc.stop(t + 0.12);
    }

    // Som de Hold (whoosh de carta)
    playHold() {
      if (this.isMuted || !this.ctx) return;
      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(240, t);
      osc.frequency.linearRampToValueAtTime(440, t + 0.05);
      osc.frequency.linearRampToValueAtTime(220, t + 0.1);
      gain.gain.setValueAtTime(0.12, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(t);
      osc.stop(t + 0.1);
    }

    // Som de Linha Limpa (acorde musical que sobe com o combo)
    playLineClear(lines, combo) {
      if (this.isMuted || !this.ctx) return;
      const t = this.ctx.currentTime;

      // Escala pentatônica em tons Balatro (C4, D4, E4, G4, A4, C5, etc.)
      const scale = [261.63, 293.66, 329.63, 392.0, 440.0, 523.25, 587.33, 659.25, 783.99, 880.0];
      const baseIdx = Math.min(scale.length - 4, combo);
      const root = scale[baseIdx];

      const intervals = lines >= 4
        ? [0, 4, 7, 12] // Acorde maior glorioso (TETRIS!)
        : lines === 3
        ? [0, 4, 7]
        : lines === 2
        ? [0, 4]
        : [0];

      intervals.forEach((semi, idx) => {
        const noteFreq = root * Math.pow(2, semi / 12);
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = lines >= 4 ? 'sawtooth' : 'triangle';
        osc.frequency.setValueAtTime(noteFreq, t + idx * 0.04);

        const duration = lines >= 4 ? 0.45 : 0.28;
        gain.gain.setValueAtTime(0.18 / intervals.length, t + idx * 0.04);
        gain.gain.exponentialRampToValueAtTime(0.001, t + idx * 0.04 + duration);

        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(t + idx * 0.04);
        osc.stop(t + idx * 0.04 + duration);
      });
    }

    // Som de Level Up
    playLevelUp() {
      if (this.isMuted || !this.ctx) return;
      const t = this.ctx.currentTime;
      const notes = [440, 554.37, 659.25, 880];
      notes.forEach((freq, idx) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, t + idx * 0.07);
        gain.gain.setValueAtTime(0.2, t + idx * 0.07);
        gain.gain.exponentialRampToValueAtTime(0.001, t + idx * 0.07 + 0.2);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(t + idx * 0.07);
        osc.stop(t + idx * 0.07 + 0.2);
      });
    }

    // Som de Game Over
    playGameOver() {
      if (this.isMuted || !this.ctx) return;
      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(320, t);
      osc.frequency.linearRampToValueAtTime(80, t + 0.8);
      gain.gain.setValueAtTime(0.25, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.85);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(t);
      osc.stop(t + 0.85);
    }

    // Som ao abrir a tela de escolha de itens (mistério/fanfarra mágica)
    playItemOffer() {
      if (this.isMuted || !this.ctx) return;
      const t = this.ctx.currentTime;
      [330, 415.3, 493.88, 659.25].forEach((freq, idx) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, t + idx * 0.06);
        gain.gain.setValueAtTime(0.14, t + idx * 0.06);
        gain.gain.exponentialRampToValueAtTime(0.001, t + idx * 0.06 + 0.3);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(t + idx * 0.06);
        osc.stop(t + idx * 0.06 + 0.3);
      });
    }

    // Som ao escolher um item (carta Balatro triunfante)
    playItemPick() {
      if (this.isMuted || !this.ctx) return;
      const t = this.ctx.currentTime;
      [523.25, 659.25, 783.99, 1046.5].forEach((freq, idx) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, t + idx * 0.05);
        gain.gain.setValueAtTime(0.18, t + idx * 0.05);
        gain.gain.exponentialRampToValueAtTime(0.001, t + idx * 0.05 + 0.35);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(t + idx * 0.05);
        osc.stop(t + idx * 0.05 + 0.35);
      });
    }

    // Som de explosão da Bomba Pequena
    playExplosion() {
      if (this.isMuted || !this.ctx) return;
      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(150, t);
      osc.frequency.exponentialRampToValueAtTime(25, t + 0.35);
      gain.gain.setValueAtTime(0.4, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.4);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(t);
      osc.stop(t + 0.4);
    }

    // Som de ativação salvadora do Escudo
    playShieldRevive() {
      if (this.isMuted || !this.ctx) return;
      const t = this.ctx.currentTime;
      [261.63, 329.63, 392.0, 523.25, 659.25, 783.99].forEach((freq, idx) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, t + idx * 0.05);
        gain.gain.setValueAtTime(0.2, t + idx * 0.05);
        gain.gain.exponentialRampToValueAtTime(0.001, t + idx * 0.05 + 0.4);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(t + idx * 0.05);
        osc.stop(t + idx * 0.05 + 0.4);
      });
    }

    // Som de ativação de item ativo genérico
    playActiveItem() {
      if (this.isMuted || !this.ctx) return;
      const t = this.ctx.currentTime;
      [440, 660, 880, 1320].forEach((freq, idx) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, t + idx * 0.04);
        gain.gain.setValueAtTime(0.18, t + idx * 0.04);
        gain.gain.exponentialRampToValueAtTime(0.001, t + idx * 0.04 + 0.25);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(t + idx * 0.04);
        osc.stop(t + idx * 0.04 + 0.25);
      });
    }

    // Som do Relógio voltando no tempo (pitch bend decrescente e reverso)
    playRewind() {
      if (this.isMuted || !this.ctx) return;
      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(880, t);
      osc.frequency.exponentialRampToValueAtTime(110, t + 0.45);
      gain.gain.setValueAtTime(0.25, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.45);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(t);
      osc.stop(t + 0.45);
    }

    // Som do Glitch desligando colisões
    playGlitch() {
      if (this.isMuted || !this.ctx) return;
      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(180, t);
      osc.frequency.setValueAtTime(920, t + 0.05);
      osc.frequency.setValueAtTime(240, t + 0.1);
      osc.frequency.setValueAtTime(1100, t + 0.15);
      gain.gain.setValueAtTime(0.2, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.25);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(t);
      osc.stop(t + 0.25);
    }

    // Som borbulhante da Poção
    playPotion() {
      if (this.isMuted || !this.ctx) return;
      const t = this.ctx.currentTime;
      [300, 450, 400, 600, 520, 750].forEach((freq, idx) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, t + idx * 0.04);
        gain.gain.setValueAtTime(0.12, t + idx * 0.04);
        gain.gain.exponentialRampToValueAtTime(0.001, t + idx * 0.04 + 0.08);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(t + idx * 0.04);
        osc.stop(t + idx * 0.04 + 0.08);
      });
    }

    // Som de varrer da Vassoura
    playSweep() {
      if (this.isMuted || !this.ctx) return;
      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(600, t);
      osc.frequency.exponentialRampToValueAtTime(200, t + 0.12);
      gain.gain.setValueAtTime(0.2, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(t);
      osc.stop(t + 0.12);
    }

    // Som de martelo do Construtor
    playBuilder() {
      if (this.isMuted || !this.ctx) return;
      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(220, t);
      osc.frequency.exponentialRampToValueAtTime(80, t + 0.08);
      gain.gain.setValueAtTime(0.3, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.08);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(t);
      osc.stop(t + 0.08);
    }

    // Música Chiptune em Loop (Sequenciador procedural estilo Balatro jazz/chiptune)
    startMusic() {
      if (this.musicPlaying || this.isMuted || !this.ctx) return;
      this.musicPlaying = true;
      this.currentStep = 0;

      // Linha de baixo (D menor / A menor jazz retro)
      const bassNotes = [
        146.83, 0, 146.83, 174.61, 164.81, 0, 146.83, 0,
        130.81, 0, 130.81, 146.83, 110.0, 0, 123.47, 0
      ];

      // Arpeggios melódicos suaves
      const leadNotes = [
        293.66, 349.23, 440.0, 523.25, 440.0, 349.23, 293.66, 0,
        261.63, 329.63, 392.0, 440.0, 392.0, 329.63, 246.94, 261.63
      ];

      const stepIntervalMs = (60 / this.bpm / 2) * 1000;

      const tick = () => {
        if (!this.musicPlaying || this.isMuted || !this.ctx) return;
        const t = this.ctx.currentTime;
        const step = this.currentStep % 16;

        // Baixo
        const bFreq = bassNotes[step];
        if (bFreq > 0) {
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(bFreq, t);
          gain.gain.setValueAtTime(0.06, t);
          gain.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
          osc.connect(gain);
          gain.connect(this.ctx.destination);
          osc.start(t);
          osc.stop(t + 0.2);
        }

        // Melodia
        const lFreq = leadNotes[step];
        if (lFreq > 0 && step % 2 === 0) {
          const oscL = this.ctx.createOscillator();
          const gainL = this.ctx.createGain();
          oscL.type = 'sine';
          oscL.frequency.setValueAtTime(lFreq, t);
          gainL.gain.setValueAtTime(0.035, t);
          gainL.gain.exponentialRampToValueAtTime(0.001, t + 0.16);
          oscL.connect(gainL);
          gainL.connect(this.ctx.destination);
          oscL.start(t);
          oscL.stop(t + 0.18);
        }

        // Hi-hat sutil (ruído estalo)
        if (step % 2 === 1) {
          const oscH = this.ctx.createOscillator();
          const gainH = this.ctx.createGain();
          oscH.type = 'square';
          oscH.frequency.setValueAtTime(1400 + (step * 80), t);
          gainH.gain.setValueAtTime(0.015, t);
          gainH.gain.exponentialRampToValueAtTime(0.0001, t + 0.03);
          oscH.connect(gainH);
          gainH.connect(this.ctx.destination);
          oscH.start(t);
          oscH.stop(t + 0.035);
        }

        this.currentStep++;
        this.stepTimer = setTimeout(tick, stepIntervalMs);
      };

      this.stepTimer = setTimeout(tick, stepIntervalMs);
    }

    stopMusic() {
      this.musicPlaying = false;
      if (this.stepTimer) {
        clearTimeout(this.stepTimer);
        this.stepTimer = null;
      }
    }
  }

  // ============================================================================
  // SISTEMA DE PARTÍCULAS CANVAS (Faíscas, Confetes, Flocos)
  // ============================================================================
  class ParticleEngine {
    constructor(canvas, ctx) {
      this.canvas = canvas;
      this.ctx = ctx;
      this.particles = [];
    }

    spawnLineClear(yRow, count = 18, color) {
      const py = yRow * BLOCK_SIZE + BLOCK_SIZE / 2;
      for (let i = 0; i < count; i++) {
        const px = Math.random() * (COLS * BLOCK_SIZE);
        // Partículas básicas e calmas para feedback de linha limpa
        const speed = 1.2 + Math.random() * 2.0;
        const angle = Math.random() * Math.PI * 2;
        this.particles.push({
          x: px,
          y: py + (Math.random() - 0.5) * BLOCK_SIZE,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed - (0.8 + Math.random() * 1.5),
          size: 2.5 + Math.random() * 2.5,
          color: color || (Math.random() > 0.5 ? '#f4be13' : '#ea3c36'),
          rot: Math.random() * Math.PI,
          vRot: (Math.random() - 0.5) * 0.2,
          alpha: 1,
          decay: 0.02 + Math.random() * 0.015,
          gravity: 0.12,
          shape: 'rect'
        });
      }
    }

    spawnHardDrop(colX, rowY, count) {
      const px = colX * BLOCK_SIZE;
      const py = rowY * BLOCK_SIZE;
      for (let i = 0; i < count; i++) {
        this.particles.push({
          x: px + Math.random() * (BLOCK_SIZE * 3),
          y: py,
          vx: (Math.random() - 0.5) * 4,
          vy: -Math.random() * 3,
          size: 2 + Math.random() * 3,
          color: '#ffffff',
          rot: 0,
          vRot: 0,
          alpha: 0.8,
          decay: 0.04,
          gravity: 0.15,
          shape: 'rect'
        });
      }
    }

    // Explosão em área para a Bomba Pequena
    spawnExplosion(gridX, gridY) {
      const px = gridX * BLOCK_SIZE + BLOCK_SIZE / 2;
      const py = gridY * BLOCK_SIZE + BLOCK_SIZE / 2;
      for (let i = 0; i < 40; i++) {
        const speed = 2 + Math.random() * 6;
        const angle = Math.random() * Math.PI * 2;
        this.particles.push({
          x: px,
          y: py,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed - 1.5,
          size: 4 + Math.random() * 5,
          color: Math.random() > 0.4 ? '#ea3c36' : (Math.random() > 0.5 ? '#f49b13' : '#ffd700'),
          rot: Math.random() * Math.PI,
          vRot: (Math.random() - 0.5) * 0.35,
          alpha: 1,
          decay: 0.02 + Math.random() * 0.02,
          gravity: 0.14,
          shape: Math.random() > 0.4 ? 'star' : 'rect'
        });
      }
    }

    updateAndDraw() {
      if (this.particles.length === 0) return;

      this.ctx.save();
      for (let i = this.particles.length - 1; i >= 0; i--) {
        const p = this.particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.vy += p.gravity;
        p.rot += p.vRot;
        p.alpha -= p.decay;

        if (p.alpha <= 0) {
          this.particles.splice(i, 1);
          continue;
        }

        this.ctx.globalAlpha = Math.max(0, p.alpha);
        this.ctx.fillStyle = p.color;

        this.ctx.save();
        this.ctx.translate(p.x, p.y);
        this.ctx.rotate(p.rot);

        if (p.shape === 'star') {
          // Pequena estrela / centelha
          this.ctx.beginPath();
          this.ctx.arc(0, 0, p.size * 0.8, 0, Math.PI * 2);
          this.ctx.fill();
        } else {
          // Retângulo / confete
          this.ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
        }
        this.ctx.restore();
      }
      this.ctx.restore();
    }
  }

  // ============================================================================
  // CLASSE PRINCIPAL DO JOGO TETRIS BALATRO
  // ============================================================================
  class TetrisGame {
    constructor() {
      // Elementos do DOM
      this.mainCanvas = document.getElementById('tetrisCanvas');
      this.mainCtx = this.mainCanvas.getContext('2d');

      this.holdCanvas = document.getElementById('holdCanvas');
      this.holdCtx = this.holdCanvas.getContext('2d');

      this.nextCanvases = [
        document.getElementById('nextCanvas1'),
        document.getElementById('nextCanvas2'),
        document.getElementById('nextCanvas3')
      ];
      this.nextCtxs = this.nextCanvases.map(c => c.getContext('2d'));

      // DOM UI Elements
      this.scoreValEl = document.getElementById('scoreVal');
      this.chipsValEl = document.getElementById('chipsVal');
      this.multValEl = document.getElementById('multVal');
      this.chipsBoxEl = document.getElementById('chipsBox');
      this.multBoxEl = document.getElementById('multBox');
      this.comboCountEl = document.getElementById('comboCount');
      this.comboBubbleEl = document.getElementById('comboBubble');
      this.b2bBadgeEl = document.getElementById('b2bBadge');
      this.levelValEl = document.getElementById('levelVal');
      this.linesValEl = document.getElementById('linesVal');
      this.highScoreValEl = document.getElementById('highScoreVal');
      this.boardFrameEl = document.getElementById('boardFrame');
      this.gameWrapperEl = document.getElementById('gameWrapper');
      this.floatContainerEl = document.getElementById('floatBannerContainer');

      // Modais
      this.pauseOverlayEl = document.getElementById('pauseOverlay');
      this.gameOverOverlayEl = document.getElementById('gameOverOverlay');
      this.finalScoreValEl = document.getElementById('finalScoreVal');
      this.finalLinesValEl = document.getElementById('finalLinesVal');
      this.finalLevelValEl = document.getElementById('finalLevelVal');
      this.finalComboValEl = document.getElementById('finalComboVal');
      this.newRecordBadgeEl = document.getElementById('newRecordBadge');

      // Elementos do Modal de Itens Roguelike e Barra Lateral
      this.itemChoiceOverlayEl = document.getElementById('itemChoiceOverlay');
      this.itemCardsGridEl = document.getElementById('itemCardsGrid');
      this.itemsListTrayEl = document.getElementById('itemsListTray');
      this.itemCountValEl = document.getElementById('itemCountVal');
      this.nextItemLinesValEl = document.getElementById('nextItemLinesVal');
      this.holdSubtextEl = document.getElementById('holdSubtext');
      this.trevoPreviewEl = document.getElementById('trevoPreview');
      this.smokeOverlayEl = document.getElementById('smokeOverlay');

      // Barra Separada de Itens Ativos
      this.activeItemsBarEl = document.getElementById('activeItemsBar');
      this.activeSlotsTrayEl = document.getElementById('activeSlotsTray');

      // Botão D6 (Troca de Itens)
      this.btnD6RerollEl = document.getElementById('btnD6Reroll');

      // Modal do Líquido Misterioso (Editor 5x5)
      this.liquidModalEl = document.getElementById('liquidModal');
      this.liquidGrid5x5El = document.getElementById('liquidGrid5x5');
      this.btnLiquidApplyEl = document.getElementById('btnLiquidApply');
      this.btnLiquidCancelEl = document.getElementById('btnLiquidCancel');

      // Botões
      this.btnSound = document.getElementById('btnSound');
      this.soundIcon = document.getElementById('soundIcon');
      this.btnPause = document.getElementById('btnPause');
      this.btnResume = document.getElementById('btnResume');
      this.btnRestart = document.getElementById('btnRestart');
      this.btnPlayAgain = document.getElementById('btnPlayAgain');

      // Motores Auxiliares
      this.sound = new SoundEngine();
      this.particles = new ParticleEngine(this.mainCanvas, this.mainCtx);

      // Estado do Tabuleiro
      this.grid = this.createEmptyGrid();

      // Estado das Peças
      this.bag = [];
      this.currentPiece = null;
      this.holdPiece = null;
      this.canHold = true;
      this.holdCountForPiece = 0;
      this.nextQueue = [];

      // Dados de Jogo
      this.score = 0;
      this.lines = 0;
      this.level = 1;
      this.combo = 0;
      this.maxCombo = 0;
      this.isBackToBack = false;
      this.highScore = parseInt(localStorage.getItem('tetro_balatro_highscore') || '0', 10);
      this.highScoreValEl.textContent = this.highScore.toLocaleString();

      // Sistema de Itens Roguelike (27 Itens - Passivos e Ativos)
      this.activeItems = {}; // { itemId: stackCount } para passivos acumuláveis
      this.activeItemInventory = {}; // { itemId: { id, level, cooldownPieces, currentPiecesProgress, maxCharges, chargesRemaining, isReady } }
      this.nextItemLinesTarget = 15; // Gatilho a cada 15 linhas limpas
      this.isChoosingItem = false;
      this.offeredItems = [];
      this.totalPiecesCount = 0;

      // Variáveis de Mecânica dos Novos Itens
      this.speedMultiplier = 1.0; // Óculos: 2x velocidade de queda
      this.historySnapshots = []; // Relógio: snapshots de estados dos últimos 20 segundos
      this.snapshotTimer = 0;
      this.d6RerollsLeft = 0; // D6: trocas disponíveis na rodada de escolha
      this.isGlitchActive = false; // Glitch: regras de colisão desligadas
      this.glitchTimer = 0;
      this.smokeTimer = 0; // Extintor: tempo de fumaça ativa
      this.tijoloCounter = 0; // Tijolo: contador a cada 20 peças
      this.vulcaoCounter = 0; // Vulcão: contador a cada 25 peças
      this.extintorCounter = 0; // Extintor: contador a cada 18 peças
      this.imaWaveTimer = 0; // Ímã: timer para onda senoidal
      this.targetingMode = null; // 'bomba' | 'meteoro' | 'vassoura'
      this.vassouraBlocksLeft = 0;
      this.mouseHoverPos = null;
      this.liquidGridState = null;

      // Controle do Overlay de Combo (substituição limpa sem sobreposição nem bugs)
      this.currentComboOverlay = null;
      this.comboOverlayTimer = null;

      // Estados de Controle
      this.isPaused = false;
      this.isGameOver = false;

      // Timers e Queda
      this.lastTime = 0;
      this.dropCounter = 0;
      this.lockDelayCounter = 0;
      this.lockDelayLimit = 500; // 500ms de tolerância SRS no chão
      this.isOnFloor = false;

      // Linhas em animação de flash branco
      this.clearingRows = [];
      this.clearAnimTimer = 0;
      this.clearAnimDuration = 220; // ms

      // Controles Teclado (DAS e ARR)
      this.keys = {};
      this.dasDelay = 150; // ms antes do auto-repeat
      this.arrRate = 32;   // ms entre repetições
      this.dasTimers = { left: 0, right: 0, down: 0 };
      this.dasActive = { left: false, right: false, down: false };

      this.setupControls();
      this.resetGame();
      this.startLoop();
    }

    createEmptyGrid() {
      const grid = [];
      for (let r = 0; r < ROWS; r++) {
        grid.push(new Array(COLS).fill(null));
      }
      return grid;
    }

    // Sistema 7-Bag
    refillBag() {
      const types = ['I', 'O', 'T', 'S', 'Z', 'J', 'L'];
      // Fisher-Yates Shuffle
      for (let i = types.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [types[i], types[j]] = [types[j], types[i]];
      }
      this.bag.push(...types);
    }

    getNextPieceType() {
      if (this.bag.length < 7) {
        this.refillBag();
      }
      return this.bag.shift();
    }

    spawnPiece(type) {
      this.totalPiecesCount++;
      let shape = SHAPES[type].map(row => [...row]);

      // DNA (Tier 0): Chance de a próxima peça sofrer mutação aleatória para uma forma difícil
      if (this.getItemStacks('dna') > 0 && Math.random() < 0.35) {
        const DNA_MUTATIONS = [
          [[1, 1, 1], [0, 1, 0], [0, 1, 0]], // Cruz T estendida
          [[1, 1, 0], [0, 1, 1], [0, 0, 1]], // Escada Z irregular
          [[1, 0, 1], [1, 1, 1]],            // Ferradura / U
          [[1, 1, 1, 1, 1]],                  // Super I (5 blocos)
          [[0, 1, 0], [1, 1, 1], [0, 1, 0]]  // Cruz perfeita
        ];
        shape = DNA_MUTATIONS[Math.floor(Math.random() * DNA_MUTATIONS.length)].map(row => [...row]);
        this.spawnScorePopup('🧬 MUTAÇÃO DE DNA!', 50);
      }

      // Fantasma (Tier 0): Chance de a peça ficar transparente e invisível
      const isTransparent = (this.getItemStacks('fantasma') > 0 && Math.random() < 0.35);
      if (isTransparent) {
        this.spawnScorePopup('👻 PEÇA FANTASMA!', 75);
      }

      const piece = {
        type: type,
        shape: shape,
        rot: 0,
        x: Math.floor(COLS / 2) - Math.ceil(shape[0].length / 2),
        y: type === 'I' ? -1 : 0,
        isTransparent: isTransparent
      };

      // Learn how to jump (Tier 0): Próxima peça salta para uma posição horizontal aleatória ao surgir
      if (this.getItemStacks('learn_how_to_jump') > 0) {
        const maxX = Math.max(0, COLS - shape[0].length);
        const randomX = Math.floor(Math.random() * (maxX + 1));
        if (!this.checkCollision(piece, randomX, piece.y, piece.shape)) {
          piece.x = randomX;
          this.sound.playRotate();
          this.spawnScorePopup('🦘 SALTO: Posição aleatória!', 50);
        }
      }

      // Se já não cabe ao spawnar, Game Over (ou o Escudo evita)
      if (this.checkCollision(piece, piece.x, piece.y, piece.shape)) {
        const saved = this.triggerGameOver();
        if (saved) {
          return this.currentPiece;
        }
        return null;
      }
      return piece;
    }

    resetGame() {
      this.grid = this.createEmptyGrid();
      this.score = 0;
      this.lines = 0;
      this.level = 1;
      this.combo = 0;
      this.maxCombo = 0;
      this.isBackToBack = false;
      this.isGameOver = false;
      this.isPaused = false;
      this.holdPiece = null;
      this.canHold = true;
      this.holdCountForPiece = 0;
      this.clearingRows = [];
      this.bag = [];
      this.refillBag();
      this.refillBag();

      // Reset total dos itens roguelike (passivos e ativos)
      this.activeItems = {};
      this.activeItemInventory = {};
      this.nextItemLinesTarget = 15;
      this.isChoosingItem = false;
      this.offeredItems = [];
      this.totalPiecesCount = 0;

      // Reset dos estados dos 28 itens
      this.speedMultiplier = 1.0;
      this.historySnapshots = [];
      this.snapshotTimer = 0;
      this.d6RerollsLeft = 0;
      this.isGlitchActive = false;
      this.glitchTimer = 0;
      this.smokeTimer = 0;
      this.tijoloCounter = 0;
      this.vulcaoCounter = 0;
      this.extintorCounter = 0;
      this.imaWaveTimer = 0;
      this.targetingMode = null;
      this.vassouraBlocksLeft = 0;
      this.mouseHoverPos = null;
      this.relogioQuebradoTimer = 0;
      this.relogioQuebradoSpeedFactor = 1.0;
      this.relogioQuebradoNextInterval = 1000;

      if (this.smokeOverlayEl) {
        this.smokeOverlayEl.classList.add('hidden');
      }

      // Limpar overlays e modais anteriores
      this.clearComboOverlay();
      if (this.itemChoiceOverlayEl) {
        this.itemChoiceOverlayEl.classList.add('hidden');
      }
      if (this.liquidModalEl) {
        this.liquidModalEl.classList.add('hidden');
      }

      const queueLength = this.getItemStacks('olho_futuro') > 0 ? 10 : 3;
      this.nextQueue = [];
      for (let i = 0; i < queueLength; i++) {
        this.nextQueue.push(this.getNextPieceType());
      }

      this.currentPiece = this.spawnPiece(this.getNextPieceType());

      this.pauseOverlayEl.classList.add('hidden');
      this.gameOverOverlayEl.classList.add('hidden');
      this.newRecordBadgeEl.classList.add('hidden');
      this.b2bBadgeEl.classList.add('hidden');

      this.updateUI();
      this.updateItemsUI();
      this.updateActiveItemsUI();
      this.updateTrevoPreview();
      this.updateHoldUI();
      this.renderHold();
      this.renderNextQueue();
    }

    // ============================================================================
    // CONTROLES DE ENTRADA & EVENTOS
    // ============================================================================
    setupControls() {
      // Conjunto com todas as teclas utilizadas no jogo para prevenir o comportamento padrão (rolagem/tremer da página)
      const GAME_KEYS = new Set([
        'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown',
        'Space', ' ',
        'KeyX', 'x', 'X',
        'KeyZ', 'z', 'Z',
        'KeyC', 'c', 'C',
        'KeyP', 'p', 'P',
        'Escape', 'Esc',
        'KeyR', 'r', 'R',
        'KeyM', 'm', 'M',
        'Digit1', 'Digit2', 'Digit3', 'Digit4', 'Digit5', 'Digit6', 'Digit7', 'Digit8',
        'Numpad1', 'Numpad2', 'Numpad3',
        'KeyQ', 'KeyW', 'KeyE', 'KeyT', 'KeyY', 'KeyU', 'KeyG',
        '1', '2', '3', '4', '5', '6', '7', '8', 'q', 'w', 'e', 't', 'y', 'u', 'g'
      ]);

      window.addEventListener('keydown', e => {
        // Bloqueia qualquer rolagem de tela ou ação nativa do navegador imediatamente
        if (GAME_KEYS.has(e.code) || GAME_KEYS.has(e.key)) {
          e.preventDefault();
        }

        if (e.repeat) return; // Gerenciamos nosso próprio DAS/ARR para repetição contínua
        this.keys[e.code] = true;

        if (this.isGameOver) {
          if (e.code === 'KeyR' || e.key === 'r' || e.key === 'R') {
            this.resetGame();
          }
          return;
        }

        // Escolha de itens Roguelike (teclas 1, 2 ou 3)
        if (this.isChoosingItem) {
          if (e.code === 'Digit1' || e.code === 'Numpad1' || e.key === '1') {
            this.selectOfferedItem(0);
            return;
          }
          if (e.code === 'Digit2' || e.code === 'Numpad2' || e.key === '2') {
            this.selectOfferedItem(1);
            return;
          }
          if (e.code === 'Digit3' || e.code === 'Numpad3' || e.key === '3') {
            this.selectOfferedItem(2);
            return;
          }
          // Bloqueia qualquer outro comando durante a escolha
          return;
        }

        // Ativação de Itens Ativos por Teclas de Atalho [Q, W, E, T, Y, U, G] ou [4, 5, 6, 7, 8]
        const activeKeyMap = {
          KeyQ: 0, Digit4: 0,
          KeyW: 1, Digit5: 1,
          KeyE: 2, Digit6: 2,
          KeyT: 3, Digit7: 3,
          KeyY: 4, Digit8: 4,
          KeyU: 5,
          KeyG: 6
        };
        if (activeKeyMap[e.code] !== undefined && !this.isPaused) {
          this.useActiveItemByIndex(activeKeyMap[e.code]);
          return;
        }

        // Tecla Backspace física ativa diretamente o Backspace Key se estiver equipado
        if ((e.code === 'Backspace' || e.key === 'Backspace') && !this.isPaused) {
          if (this.activeItemInventory['backspace_key']) {
            e.preventDefault();
            this.useActiveItem('backspace_key');
            return;
          }
        }

        // Pausa
        if (e.code === 'KeyP' || e.key === 'p' || e.key === 'P' || e.code === 'Escape' || e.key === 'Escape') {
          // Se estiver em modo de mira ativa, cancelar a mira
          if (this.targetingMode) {
            this.targetingMode = null;
            this.spawnScorePopup('Mira cancelada', 50);
            return;
          }
          this.togglePause();
          return;
        }

        if (this.isPaused) return;

        // Ações imediatas
        switch (e.code) {
          case 'ArrowLeft':
            this.moveLeft();
            this.dasActive.left = true;
            this.dasTimers.left = performance.now() + this.dasDelay;
            break;
          case 'ArrowRight':
            this.moveRight();
            this.dasActive.right = true;
            this.dasTimers.right = performance.now() + this.dasDelay;
            break;
          case 'ArrowUp':
          case 'KeyX':
            this.rotatePiece(1); // Horário
            break;
          case 'KeyZ':
            this.rotatePiece(-1); // Anti-horário
            break;
          case 'ArrowDown':
            this.softDrop();
            this.dasActive.down = true;
            this.dasTimers.down = performance.now() + (this.dasDelay / 2);
            break;
          case 'Space':
            this.hardDrop();
            break;
          case 'KeyC':
            this.doHold();
            break;
          case 'KeyM':
            this.toggleMute();
            break;
          case 'KeyR':
            this.resetGame();
            break;
        }
      });

      window.addEventListener('keyup', e => {
        this.keys[e.code] = false;
        if (e.code === 'ArrowLeft') this.dasActive.left = false;
        if (e.code === 'ArrowRight') this.dasActive.right = false;
        if (e.code === 'ArrowDown') this.dasActive.down = false;
      });

      // Suporte a cliques no tabuleiro para mira dos itens ativos (Bomba, Meteoro, Vassoura)
      this.mainCanvas.addEventListener('mousemove', e => {
        const rect = this.mainCanvas.getBoundingClientRect();
        const scaleX = this.mainCanvas.width / rect.width;
        const scaleY = this.mainCanvas.height / rect.height;
        const col = Math.floor(((e.clientX - rect.left) * scaleX) / BLOCK_SIZE);
        const row = Math.floor(((e.clientY - rect.top) * scaleY) / BLOCK_SIZE);
        this.mouseHoverPos = { col, row };
      });

      this.mainCanvas.addEventListener('mouseleave', () => {
        this.mouseHoverPos = null;
      });

      this.mainCanvas.addEventListener('click', () => {
        if (this.isPaused || this.isGameOver || this.isChoosingItem) return;
        if (this.targetingMode && this.mouseHoverPos) {
          this.handleTargetingClick(this.mouseHoverPos.col, this.mouseHoverPos.row);
        }
      });

      // Botão D6 (Troca de Itens oferecidos)
      if (this.btnD6RerollEl) {
        this.btnD6RerollEl.addEventListener('click', () => this.rerollWithD6());
      }

      // Botões do Modal Líquido Misterioso
      if (this.btnLiquidApplyEl) {
        this.btnLiquidApplyEl.addEventListener('click', () => this.applyLiquidPiece());
      }
      if (this.btnLiquidCancelEl) {
        this.btnLiquidCancelEl.addEventListener('click', () => this.closeLiquidModal());
      }

      // Botões do DOM
      this.btnSound.addEventListener('click', () => this.toggleMute());
      this.btnPause.addEventListener('click', () => this.togglePause());
      this.btnResume.addEventListener('click', () => this.togglePause());
      this.btnRestart.addEventListener('click', () => this.resetGame());
      this.btnPlayAgain.addEventListener('click', () => this.resetGame());
    }

    handleContinuousInput(now) {
      if (this.isPaused || this.isGameOver || !this.currentPiece || this.isChoosingItem) return;

      if (this.dasActive.left && this.keys['ArrowLeft']) {
        if (now >= this.dasTimers.left) {
          this.moveLeft();
          this.dasTimers.left = now + this.arrRate;
        }
      }

      if (this.dasActive.right && this.keys['ArrowRight']) {
        if (now >= this.dasTimers.right) {
          this.moveRight();
          this.dasTimers.right = now + this.arrRate;
        }
      }

      if (this.dasActive.down && this.keys['ArrowDown']) {
        if (now >= this.dasTimers.down) {
          this.softDrop();
          this.dasTimers.down = now + (this.arrRate * 1.2);
        }
      }
    }

    togglePause() {
      if (this.isGameOver) return;
      this.isPaused = !this.isPaused;
      if (this.isPaused) {
        this.pauseOverlayEl.classList.remove('hidden');
        this.btnPause.innerHTML = '▶ CONTINUAR [P]';
      } else {
        this.pauseOverlayEl.classList.add('hidden');
        this.btnPause.innerHTML = '⏸ PAUSA [P]';
      }
    }

    toggleMute() {
      const muted = this.sound.toggleMute();
      this.soundIcon.textContent = muted ? '🔇' : '🔊';
      this.btnSound.classList.toggle('card-btn-danger', muted);
    }

    // ============================================================================
    // MOVIMENTAÇÃO & SRS ROTATION
    // ============================================================================
    checkCollision(piece, offsetX, offsetY, shape) {
      for (let r = 0; r < shape.length; r++) {
        for (let c = 0; c < shape[r].length; c++) {
          if (shape[r][c]) {
            const newX = offsetX + c;
            const newY = offsetY + r;

            // Limites laterais e inferior
            if (newX < 0 || newX >= COLS || newY >= ROWS) {
              return true;
            }
            // Colisão com blocos já fixados no grid (desligada se Glitch estiver ativo!)
            if (!this.isGlitchActive) {
              if (newY >= 0 && this.grid[newY][newX]) {
                return true;
              }
            }
          }
        }
      }
      return false;
    }

    moveLeft() {
      // Controle (Tier 0): Inverte os controles laterais (esquerda vira direita)
      if (this.getItemStacks('controle') > 0) {
        this.executeMoveRight();
      } else {
        this.executeMoveLeft();
      }
    }

    moveRight() {
      // Controle (Tier 0): Inverte os controles laterais (direita vira esquerda)
      if (this.getItemStacks('controle') > 0) {
        this.executeMoveLeft();
      } else {
        this.executeMoveRight();
      }
    }

    executeMoveLeft() {
      if (!this.checkCollision(this.currentPiece, this.currentPiece.x - 1, this.currentPiece.y, this.currentPiece.shape)) {
        this.currentPiece.x--;
        this.sound.playMove();
        this.resetLockDelayIfMoved();
      }
    }

    executeMoveRight() {
      if (!this.checkCollision(this.currentPiece, this.currentPiece.x + 1, this.currentPiece.y, this.currentPiece.shape)) {
        this.currentPiece.x++;
        this.sound.playMove();
        this.resetLockDelayIfMoved();
      }
    }

    softDrop() {
      if (!this.checkCollision(this.currentPiece, this.currentPiece.x, this.currentPiece.y + 1, this.currentPiece.shape)) {
        this.currentPiece.y++;
        this.score += 1;
        this.scoreValEl.textContent = this.score.toLocaleString();
      } else {
        this.isOnFloor = true;
      }
    }

    hardDrop() {
      let droppedCells = 0;
      while (!this.checkCollision(this.currentPiece, this.currentPiece.x, this.currentPiece.y + 1, this.currentPiece.shape)) {
        this.currentPiece.y++;
        droppedCells++;
      }
      this.score += droppedCells * 2;
      this.scoreValEl.textContent = this.score.toLocaleString();

      this.sound.playHardDrop();
      this.triggerSquash();
      this.particles.spawnHardDrop(this.currentPiece.x, this.currentPiece.y + this.currentPiece.shape.length, 8);
      this.lockPiece();
    }

    rotateMatrix(matrix, dir) {
      const N = matrix.length;
      const result = [];
      for (let r = 0; r < N; r++) {
        result.push(new Array(N).fill(0));
      }
      for (let r = 0; r < N; r++) {
        for (let c = 0; c < N; c++) {
          if (dir === 1) {
            result[c][N - 1 - r] = matrix[r][c]; // Horário
          } else {
            result[N - 1 - c][r] = matrix[r][c]; // Anti-horário
          }
        }
      }
      return result;
    }

    rotatePiece(dir) {
      if (!this.currentPiece || this.currentPiece.type === 'O') return;

      const currentRot = this.currentPiece.rot;
      const nextRot = (currentRot + (dir === 1 ? 1 : 3)) % 4;
      const newShape = this.rotateMatrix(this.currentPiece.shape, dir);

      // Obter tabela de kicks SRS
      const kickKey = `${currentRot}->${nextRot}`;
      const kickTable = this.currentPiece.type === 'I' ? KICKS_I[kickKey] : KICKS_JLSTZ[kickKey];

      let kicked = false;
      if (kickTable) {
        for (let i = 0; i < kickTable.length; i++) {
          const [kx, ky] = kickTable[i];
          // Nota: no SRS o eixo Y cresce para cima, no nosso canvas Y cresce para baixo
          const testX = this.currentPiece.x + kx;
          const testY = this.currentPiece.y - ky;

          if (!this.checkCollision(this.currentPiece, testX, testY, newShape)) {
            this.currentPiece.x = testX;
            this.currentPiece.y = testY;
            this.currentPiece.shape = newShape;
            this.currentPiece.rot = nextRot;
            kicked = true;
            this.sound.playRotate();
            this.resetLockDelayIfMoved();
            break;
          }
        }
      }

      // Fallback simples caso não encontre na tabela
      if (!kicked && !this.checkCollision(this.currentPiece, this.currentPiece.x, this.currentPiece.y, newShape)) {
        this.currentPiece.shape = newShape;
        this.currentPiece.rot = nextRot;
        this.sound.playRotate();
        this.resetLockDelayIfMoved();
      }
    }

    resetLockDelayIfMoved() {
      if (this.isOnFloor) {
        this.lockDelayCounter = 0;
      }
    }

    doHold() {
      if (!this.canHold || this.isGameOver || this.isPaused || this.isChoosingItem) return;

      this.sound.playHold();
      const currentType = this.currentPiece.type;

      if (!this.holdPiece) {
        this.holdPiece = currentType;
        this.currentPiece = this.spawnPiece(this.nextQueue.shift());
        this.nextQueue.push(this.getNextPieceType());
      } else {
        const temp = this.holdPiece;
        this.holdPiece = currentType;
        this.currentPiece = this.spawnPiece(temp);
      }

      this.canHold = false;
      this.updateHoldUI();
      this.renderHold();
      this.renderNextQueue();
    }

    // Ghost Piece (Posição de sombra)
    getGhostY() {
      if (!this.currentPiece) return 0;
      let ghostY = this.currentPiece.y;
      while (!this.checkCollision(this.currentPiece, this.currentPiece.x, ghostY + 1, this.currentPiece.shape)) {
        ghostY++;
      }
      return ghostY;
    }

    // ============================================================================
    // FIXAÇÃO DE PEÇA & BALATRO SCORING / COMBOS
    // ============================================================================
    lockPiece() {
      if (!this.currentPiece) return;

      // Transferir blocos da peça para o grid
      for (let r = 0; r < this.currentPiece.shape.length; r++) {
        for (let c = 0; c < this.currentPiece.shape[r].length; c++) {
          if (this.currentPiece.shape[r][c]) {
            const gy = this.currentPiece.y + r;
            const gx = this.currentPiece.x + c;
            if (gy >= 0 && gy < ROWS && gx >= 0 && gx < COLS) {
              this.grid[gy][gx] = this.currentPiece.type;
            }
          }
        }
      }

      this.sound.playLand();
      this.triggerSquash();

      // Recarga de Itens Ativos (progresso por peças colocadas)
      Object.values(this.activeItemInventory).forEach(item => {
        if (item.cooldownPieces) {
          if (item.currentPiecesProgress < item.cooldownPieces) {
            item.currentPiecesProgress++;
            if (item.currentPiecesProgress >= item.cooldownPieces) {
              item.isReady = true;
            }
          }
        }
      });
      this.updateActiveItemsUI();

      // Tijolo (Tier 0): Adiciona 3 blocos aleatórios ao tabuleiro a cada 20 peças
      if (this.getItemStacks('tijolo') > 0) {
        this.tijoloCounter = (this.tijoloCounter || 0) + 1;
        if (this.tijoloCounter % 20 === 0) {
          let placed = 0;
          for (let attempt = 0; attempt < 50 && placed < 3; attempt++) {
            const r = Math.floor(ROWS / 2) + Math.floor(Math.random() * (ROWS / 2));
            const c = Math.floor(Math.random() * COLS);
            if (this.grid[r][c] === null) {
              this.grid[r][c] = 'O';
              placed++;
            }
          }
          this.sound.playLand();
          this.spawnScorePopup('🧱 TIJOLO: +3 Blocos Pesados!', 60);
        }
      }

      // Extintor (Tier 0): Solta fumaça densa e bloqueia a visão temporariamente a cada 18 peças
      if (this.getItemStacks('extintor') > 0) {
        this.extintorCounter = (this.extintorCounter || 0) + 1;
        if (this.extintorCounter % 18 === 0) {
          this.smokeTimer = 5000;
          if (this.smokeOverlayEl) this.smokeOverlayEl.classList.remove('hidden');
          this.spawnScorePopup('💨 EXTINTOR: MEUS OLHOS!', 80);
        }
      }

      // Vulcão (Tier 1): Erupção remove blocos da parte inferior do tabuleiro a cada 25 peças
      if (this.getItemStacks('vulcao') > 0) {
        this.vulcaoCounter = (this.vulcaoCounter || 0) + 1;
        if (this.vulcaoCounter % 25 === 0) {
          let melted = 0;
          for (let r = ROWS - 1; r >= ROWS - 2; r--) {
            for (let c = 0; c < COLS; c++) {
              if (this.grid[r][c] !== null && melted < 4) {
                this.grid[r][c] = null;
                melted++;
              }
            }
          }
          this.sound.playExplosion();
          this.spawnScorePopup('🌋 VULCÃO: ERUPÇÃO!', 90);
        }
      }

      // Resetar Hold para a próxima peça
      this.canHold = true;
      this.updateHoldUI();

      // Checar linhas completadas
      const fullRows = [];
      for (let r = 0; r < ROWS; r++) {
        if (this.grid[r].every(cell => cell !== null)) {
          fullRows.push(r);
        }
      }

      if (fullRows.length > 0) {
        this.handleLineClears(fullRows);
      } else {
        this.combo = 0;
        this.comboCountEl.textContent = '0';
        this.multValEl.textContent = 'x1.0';
        this.chipsValEl.textContent = '0';
        this.advanceNextPiece();
      }
    }

    handleLineClears(rows) {
      this.clearingRows = rows;
      this.clearAnimTimer = this.clearAnimDuration;

      const linesCount = rows.length;
      this.lines += linesCount;
      this.combo++;
      if (this.combo > this.maxCombo) {
        this.maxCombo = this.combo;
      }

      // Nível sobe a cada 10 linhas
      const newLevel = Math.floor(this.lines / 10) + 1;
      if (newLevel > this.level) {
        this.level = newLevel;
        this.sound.playLevelUp();
      }

      // Multiplicador Balatro escalonado por combo
      const multSteps = [1.0, 1.5, 2.0, 3.0, 4.0, 5.0];
      const mult = multSteps[Math.min(this.combo, multSteps.length - 1)];

      // Pontuação Base de Fichas (Chips)
      const baseChipsTable = { 1: 100, 2: 300, 3: 500, 4: 800 };
      let totalChips = (baseChipsTable[linesCount] || 100) * this.level;

      // Fogo (Tier 4): Queima a linha inteira e as linhas adjacentes, transformando blocos em pontos
      if (this.getItemStacks('fogo') > 0) {
        let fireBurnedCount = 0;
        rows.forEach(r => {
          [-1, 1].forEach(offset => {
            const adjR = r + offset;
            if (adjR >= 0 && adjR < ROWS && !rows.includes(adjR)) {
              for (let c = 0; c < COLS; c++) {
                if (this.grid[adjR][c] !== null) {
                  this.grid[adjR][c] = null;
                  fireBurnedCount++;
                }
              }
              this.particles.spawnLineClear(adjR, 20, '#ea3c36');
            }
          });
        });
        if (fireBurnedCount > 0) {
          const fireBonus = fireBurnedCount * 250;
          totalChips += fireBonus;
          this.spawnScorePopup(`🔥 FOGO: +${fireBonus.toLocaleString()} FICHAS!`, 60);
        }
      }

      // Back-to-Back (Tetris seguido)
      let b2bBonus = 1.0;
      let isB2BActive = false;
      if (linesCount === 4) {
        if (this.isBackToBack) {
          b2bBonus = 1.5;
          isB2BActive = true;
          this.b2bBadgeEl.classList.remove('hidden');
        } else {
          this.isBackToBack = true;
          this.b2bBadgeEl.classList.remove('hidden');
        }
      } else {
        this.isBackToBack = false;
        this.b2bBadgeEl.classList.add('hidden');
      }

      let pointsEarned = Math.floor(totalChips * mult * b2bBonus);

      // Controle (Tier 0): Embaralha controles, porém DOBRA todos os pontos ganhos (2x)
      if (this.getItemStacks('controle') > 0) {
        pointsEarned *= 2;
      }

      this.score += pointsEarned;

      // Atualizar Recorde
      if (this.score > this.highScore) {
        this.highScore = this.score;
        localStorage.setItem('tetro_balatro_highscore', this.highScore.toString());
        this.highScoreValEl.textContent = this.highScore.toLocaleString();
      }

      // Áudio musical do combo
      this.sound.playLineClear(linesCount, this.combo);

      // Partículas em cada linha limpa
      rows.forEach(r => {
        this.particles.spawnLineClear(r);
      });

      // Animações UI de Pulo Balatro
      this.bumpUIElements(totalChips, mult, pointsEarned);

      // Overlay de Combo
      this.showComboOverlay(linesCount, this.combo, isB2BActive);

      // Popup de pontos nas linhas
      const popupY = (rows[0] * BLOCK_SIZE);
      const textPopup = `+${pointsEarned.toLocaleString()} (x${mult.toFixed(1)})`;
      this.spawnScorePopup(textPopup, popupY);

      this.updateUI();
    }

    collapseClearedRows() {
      // Remove as linhas completas do grid
      for (const r of this.clearingRows) {
        this.grid.splice(r, 1);
        this.grid.unshift(new Array(COLS).fill(null));
      }
      this.clearingRows = [];
      this.canHold = true;
      this.updateHoldUI();

      // Sistema de escolha de itens roguelike (a cada 15 linhas limpas)
      if (this.lines >= this.nextItemLinesTarget) {
        this.nextItemLinesTarget += 15;
        this.openItemChoiceModal();
      } else {
        this.advanceNextPiece();
      }
      this.updateItemsUI();
    }

    advanceNextPiece() {
      // Clone (Tier 0): Duplica a próxima peça sem avisar (chance de 40%)
      if (this.getItemStacks('clone') > 0 && Math.random() < 0.40 && this.currentPiece) {
        this.nextQueue.unshift(this.currentPiece.type);
        this.spawnScorePopup('👥 CLONE: Peça duplicada!', 40);
      }

      this.currentPiece = this.spawnPiece(this.nextQueue.shift());
      this.nextQueue.push(this.getNextPieceType());
      this.renderNextQueue();
    }

    triggerGameOver() {
      // Escudo (Tier 2): "NÃO HOJE." - Impede o Game Over com animação de escudo;
      // quando usado, sai dos itens passivos e remove 1 linha
      const escudoStacks = this.getItemStacks('escudo');
      if (escudoStacks > 0) {
        this.activeItems['escudo']--;
        if (this.activeItems['escudo'] <= 0) {
          delete this.activeItems['escudo'];
        }
        this.updateItemsUI();

        // Remove 1 linha (a linha ocupada mais próxima do topo para dar espaço imediato)
        let rowToRemove = 0;
        for (let r = 0; r < ROWS; r++) {
          if (this.grid[r].some(cell => cell !== null)) {
            rowToRemove = r;
            break;
          }
        }
        this.grid.splice(rowToRemove, 1);
        this.grid.unshift(new Array(COLS).fill(null));

        this.sound.playShieldRevive();
        for (let c = 0; c < COLS; c++) {
          this.particles.spawnLineClear(rowToRemove, 25, '#ffd700');
        }
        this.showShieldSavedOverlay();

        // Spawna uma nova peça no topo agora desobstruído
        this.currentPiece = this.spawnPiece(this.getNextPieceType());
        this.isGameOver = false;
        return true; // Game Over evitado com sucesso!
      }

      this.clearComboOverlay();
      this.isGameOver = true;
      this.sound.playGameOver();

      this.finalScoreValEl.textContent = this.score.toLocaleString();
      this.finalLinesValEl.textContent = this.lines.toString();
      this.finalLevelValEl.textContent = this.level.toString();
      this.finalComboValEl.textContent = this.maxCombo.toString();

      if (this.score >= this.highScore && this.score > 0) {
        this.newRecordBadgeEl.classList.remove('hidden');
      }

      this.gameOverOverlayEl.classList.remove('hidden');
      return false;
    }

    // ============================================================================
    // SISTEMA DE OVERLAY DE COMBO & POPUPS
    // ============================================================================
    clearComboOverlay() {
      if (this.comboOverlayTimer) {
        clearTimeout(this.comboOverlayTimer);
        this.comboOverlayTimer = null;
      }
      if (this.currentComboOverlay) {
        this.currentComboOverlay.remove();
        this.currentComboOverlay = null;
      }
      // Remove qualquer banner órfão para garantir que nunca fique preso na tela
      const orphanBoxes = this.floatContainerEl.querySelectorAll('.combo-overlay-box');
      orphanBoxes.forEach(el => el.remove());
    }

    showComboOverlay(linesCount, combo, isBackToBack) {
      // 1. Evitar sobreposição: limpa qualquer overlay anterior antes de criar novo
      this.clearComboOverlay();

      // 2. Determinar texto da limpeza
      let lineType = 'SINGLE';
      if (linesCount === 2) lineType = 'DOUBLE';
      else if (linesCount === 3) lineType = 'TRIPLE';
      else if (linesCount === 4) lineType = 'TETRIS';

      // Formato: "TETRIS + 4X COMBO!", "TRIPLE + 3X COMBO!", "DOUBLE + 2X COMBO!"
      // Se não houver combo (só 1x): mostrar só o tipo: "TETRIS!", "SINGLE", "DOUBLE!", "TRIPLE!"
      let mainText = '';
      if (combo > 1) {
        mainText = `${lineType} + ${combo}X COMBO!`;
      } else {
        mainText = (linesCount === 1) ? 'SINGLE' : `${lineType}!`;
      }

      // 3. Determinar o tier para tamanho, cor e brilho que escalam
      let tierClass = 'combo-tier-1';
      if (combo >= 4) {
        tierClass = 'combo-tier-4';
      } else if (combo === 3) {
        tierClass = 'combo-tier-3';
      } else if (combo === 2) {
        tierClass = 'combo-tier-2';
      } else if (linesCount === 4) {
        tierClass = 'combo-tier-1 type-tetris';
      }

      // 4. Criar estrutura do overlay centralizado sobre o tabuleiro
      const box = document.createElement('div');
      box.className = 'combo-overlay-box';

      const titleEl = document.createElement('div');
      titleEl.className = `combo-title-text ${tierClass}`;
      titleEl.textContent = mainText;
      box.appendChild(titleEl);

      // Se Back-to-Back estiver ativo, adicionar segunda linha menor
      if (isBackToBack && linesCount === 4) {
        const b2bEl = document.createElement('div');
        b2bEl.className = 'combo-b2b-sub';
        b2bEl.textContent = 'BACK-TO-BACK!';
        box.appendChild(b2bEl);
      }

      this.floatContainerEl.appendChild(box);
      this.currentComboOverlay = box;

      // 5. Timer de desaparecimento em 1,2s (pop-in com escala, rotação e fade-out)
      this.comboOverlayTimer = setTimeout(() => {
        if (this.currentComboOverlay === box) {
          box.remove();
          this.currentComboOverlay = null;
          this.comboOverlayTimer = null;
        }
      }, 1200);
    }

    showShieldSavedOverlay() {
      this.clearComboOverlay();

      const box = document.createElement('div');
      box.className = 'combo-overlay-box';

      const titleEl = document.createElement('div');
      titleEl.className = 'shield-saved-banner';
      titleEl.textContent = '🛡️ ESCUDO: "NÃO HOJE!" (1 LINHA REMOVIDA)';
      box.appendChild(titleEl);

      this.floatContainerEl.appendChild(box);
      this.currentComboOverlay = box;

      this.comboOverlayTimer = setTimeout(() => {
        if (this.currentComboOverlay === box) {
          box.remove();
          this.currentComboOverlay = null;
          this.comboOverlayTimer = null;
        }
      }, 1400);
    }

    // ============================================================================
    // SISTEMA DE ITENS ROGUELIKE (A CADA 15 LINHAS)
    // ============================================================================
    getItemStacks(itemId) {
      return this.activeItems[itemId] || 0;
    }

    // Sorteio das 3 cartas pesadas por tier (Tier 0: 60, Tier 1: 35, Tier 2: 20, Tier 3: 12, Tier 4: 6)
    drawRandomItems(count = 3) {
      const allItemKeys = Object.keys(ROGUELIKE_ITEMS);
      const chosen = [];
      const pool = [...allItemKeys];

      for (let i = 0; i < count && pool.length > 0; i++) {
        const totalWeight = pool.reduce((sum, key) => sum + ROGUELIKE_ITEMS[key].weight, 0);
        let randomVal = Math.random() * totalWeight;
        let selectedKey = pool[0];

        for (let j = 0; j < pool.length; j++) {
          const key = pool[j];
          randomVal -= ROGUELIKE_ITEMS[key].weight;
          if (randomVal <= 0) {
            selectedKey = key;
            break;
          }
        }

        chosen.push(ROGUELIKE_ITEMS[selectedKey]);
        // Remove do pool desta mão para nunca sortear duplicatas na mesma escolha de 3
        const indexInPool = pool.indexOf(selectedKey);
        if (indexInPool > -1) {
          pool.splice(indexInPool, 1);
        }
      }

      return chosen;
    }

    openItemChoiceModal() {
      this.isPaused = true;
      this.isChoosingItem = true;
      this.sound.playItemOffer();

      // Suporte ao item D6 (Tier 4): permite trocar as 3 cartas se o jogador tiver o item
      const d6Stacks = this.getItemStacks('d6');
      if (d6Stacks > 0 && this.btnD6RerollEl) {
        this.d6RerollsLeft = d6Stacks;
        this.updateD6Button();
        this.btnD6RerollEl.classList.remove('hidden');
      } else if (this.btnD6RerollEl) {
        this.btnD6RerollEl.classList.add('hidden');
      }

      this.offeredItems = this.drawRandomItems(3);
      this.renderItemChoiceCards();
      this.itemChoiceOverlayEl.classList.remove('hidden');
    }

    renderItemChoiceCards() {
      this.itemCardsGridEl.innerHTML = '';

      this.offeredItems.forEach((item, idx) => {
        const currentLevel = item.type === 'active'
          ? (this.activeItemInventory[item.id] ? this.activeItemInventory[item.id].level : 0)
          : this.getItemStacks(item.id);
        const nextLevel = currentLevel + 1;

        const card = document.createElement('div');
        card.className = 'item-card';
        card.dataset.index = idx;

        const iconHTML = getItemIconHTML(item);

        card.innerHTML = `
          <div class="item-card-icon-box">
            ${iconHTML}
          </div>
          <div class="item-card-details">
            <div class="item-card-title-row">
              <span class="item-card-name">${item.name}</span>
              <span class="item-card-level">Nv.${nextLevel}</span>
              <span class="item-rarity-tag ${item.tierClass}">${item.tierName}</span>
            </div>
            ${item.quote ? `<div class="item-card-quote">“${item.quote}”</div>` : ''}
            <div class="item-card-desc">${item.desc(nextLevel)}</div>
          </div>
          <div class="item-card-key">
            <kbd>${idx + 1}</kbd>
          </div>
        `;

        card.addEventListener('click', () => this.selectOfferedItem(idx));
        this.itemCardsGridEl.appendChild(card);
      });
    }

    // Ação do Botão D6 (Reroll)
    rerollWithD6() {
      if (this.d6RerollsLeft <= 0) return;
      this.d6RerollsLeft--;
      this.sound.playRotate();
      this.offeredItems = this.drawRandomItems(3);
      this.renderItemChoiceCards();
      this.updateD6Button();
      if (this.d6RerollsLeft <= 0 && this.btnD6RerollEl) {
        this.btnD6RerollEl.classList.add('hidden');
      }
    }

    updateD6Button() {
      if (!this.btnD6RerollEl) return;
      this.btnD6RerollEl.innerHTML = `🎲 TROCAR ITENS (${this.d6RerollsLeft} restante${this.d6RerollsLeft > 1 ? 's' : ''})`;
    }

    selectOfferedItem(idx) {
      if (!this.isChoosingItem || !this.offeredItems[idx]) return;

      const item = this.offeredItems[idx];
      let newLevel = 1;

      // Separação entre Itens Ativos e Passivos
      if (item.type === 'active') {
        if (!this.activeItemInventory[item.id]) {
          this.activeItemInventory[item.id] = {
            id: item.id,
            level: 1,
            cooldownPieces: item.cooldownPieces || null,
            currentPiecesProgress: item.cooldownPieces || 0,
            maxCharges: item.maxCharges || null,
            chargesRemaining: item.maxCharges || null,
            isReady: true
          };
          newLevel = 1;
        } else {
          this.activeItemInventory[item.id].level++;
          if (this.activeItemInventory[item.id].maxCharges) {
            this.activeItemInventory[item.id].chargesRemaining = this.activeItemInventory[item.id].maxCharges;
          }
          this.activeItemInventory[item.id].isReady = true;
          newLevel = this.activeItemInventory[item.id].level;
        }
        this.updateActiveItemsUI();
      } else {
        // Óculos (Tier 1): Duplica seus itens passivos, porém as peças do Tetris ficam 2x mais rápidas
        if (item.id === 'oculos') {
          Object.keys(this.activeItems).forEach(key => {
            if (key !== 'oculos') {
              this.activeItems[key] *= 2;
            }
          });
          this.speedMultiplier *= 2.0;
          this.activeItems['oculos'] = (this.activeItems['oculos'] || 0) + 1;
          newLevel = this.activeItems['oculos'];
        } else {
          this.activeItems[item.id] = (this.activeItems[item.id] || 0) + 1;
          newLevel = this.activeItems[item.id];
        }
      }

      this.sound.playItemPick();
      this.itemChoiceOverlayEl.classList.add('hidden');
      this.isChoosingItem = false;
      this.isPaused = false;

      // Popup flutuante "+ITEM!"
      this.spawnItemPopup(item, newLevel);
      this.updateItemsUI();
      this.updateActiveItemsUI();
      this.updateTrevoPreview();
      this.updateHoldUI();

      // Se ainda tiver marco de 15 linhas pendente
      if (this.lines >= this.nextItemLinesTarget) {
        this.nextItemLinesTarget += 15;
        this.openItemChoiceModal();
      } else {
        this.advanceNextPiece();
      }
    }

    spawnItemPopup(item, nextLevel) {
      const oldPopup = this.floatContainerEl.querySelector('.float-item-popup');
      if (oldPopup) oldPopup.remove();

      const popup = document.createElement('div');
      popup.className = 'float-item-popup';
      popup.innerHTML = `+ITEM! ${getItemIconHTML(item)} ${item.name} (Nv.${nextLevel})`;
      this.floatContainerEl.appendChild(popup);
      setTimeout(() => popup.remove(), 1200);
    }

    // Atualiza o painel lateral de itens passivos acumuláveis
    updateItemsUI() {
      if (!this.itemsListTrayEl) return;
      this.itemsListTrayEl.innerHTML = '';
      const itemKeys = Object.keys(this.activeItems);
      let totalStacks = 0;

      if (itemKeys.length === 0) {
        this.itemsListTrayEl.innerHTML = '<div class="empty-items-text">Nenhum item passivo.<br>A cada 15 linhas escolha 1!</div>';
        if (this.itemCountValEl) this.itemCountValEl.textContent = '0';
      } else {
        itemKeys.forEach(id => {
          const stacks = this.activeItems[id];
          if (stacks <= 0) return;
          totalStacks += stacks;
          const def = ROGUELIKE_ITEMS[id];
          if (!def) return;

          const badge = document.createElement('div');
          badge.className = 'item-tray-badge';
          badge.title = `${def.name} (Nv.${stacks}): ${def.desc(stacks)}`;
          badge.innerHTML = `
            ${getItemIconHTML(def)}
            <span class="item-tray-count">x${stacks}</span>
          `;
          this.itemsListTrayEl.appendChild(badge);
        });
        if (this.itemCountValEl) this.itemCountValEl.textContent = totalStacks.toString();
      }

      // Linhas restantes até o próximo item
      const linesRemaining = Math.max(0, this.nextItemLinesTarget - this.lines);
      if (this.nextItemLinesValEl) {
        this.nextItemLinesValEl.textContent = `${linesRemaining} linha${linesRemaining === 1 ? '' : 's'}`;
      }
    }

    // Atualiza a barra horizontal de itens ativos equipados
    updateActiveItemsUI() {
      if (!this.activeSlotsTrayEl) return;
      this.activeSlotsTrayEl.innerHTML = '';
      const activeIds = Object.keys(this.activeItemInventory);

      if (activeIds.length === 0) {
        this.activeSlotsTrayEl.innerHTML = '<div class="active-empty-text">Nenhum item ativo equipado</div>';
        return;
      }

      const hotkeys = ['Q', 'W', 'E', 'T', 'Y', 'U', 'G'];

      activeIds.forEach((id, idx) => {
        const itemState = this.activeItemInventory[id];
        const def = ROGUELIKE_ITEMS[id];
        if (!def) return;

        const hotkey = hotkeys[idx] || (idx + 1).toString();
        const slot = document.createElement('div');
        slot.className = `active-item-slot ${itemState.isReady ? 'ready-pulse' : 'on-cooldown'}`;
        slot.dataset.id = id;

        let statusText = 'PRONTO!';
        let progressPct = 100;

        if (itemState.maxCharges) {
          statusText = `${itemState.chargesRemaining}/${itemState.maxCharges} usos`;
          progressPct = (itemState.chargesRemaining / itemState.maxCharges) * 100;
        } else if (itemState.cooldownPieces) {
          if (!itemState.isReady) {
            statusText = `${itemState.currentPiecesProgress}/${itemState.cooldownPieces} pcs`;
            progressPct = Math.min(100, (itemState.currentPiecesProgress / itemState.cooldownPieces) * 100);
          }
        }

        slot.innerHTML = `
          <div class="active-slot-header">
            ${getItemIconHTML(def)}
            <span class="active-slot-name">${def.name}</span>
            <span class="active-slot-key">[${hotkey}]</span>
          </div>
          <div class="active-slot-status">${statusText}</div>
          <div class="active-cooldown-bar">
            <div class="active-cooldown-fill" style="width: ${progressPct}%"></div>
          </div>
        `;

        slot.addEventListener('click', () => this.useActiveItem(id));
        this.activeSlotsTrayEl.appendChild(slot);
      });
    }

    // Trevo de 4 folhas (Tier 4): Previsão de itens de Tier 0
    updateTrevoPreview() {
      if (!this.trevoPreviewEl) return;
      if (this.getItemStacks('trevo_4_folhas') > 0) {
        this.trevoPreviewEl.classList.remove('hidden');
        const tier0Names = Object.values(ROGUELIKE_ITEMS)
          .filter(it => it.tier === 0)
          .map(it => it.name)
          .slice(0, 4)
          .join(', ');
        this.trevoPreviewEl.innerHTML = `
          <span class="trevo-title">🍀 PREVISÃO TIER 0:</span>
          <span class="trevo-items">${tier0Names}...</span>
        `;
      } else {
        this.trevoPreviewEl.classList.add('hidden');
      }
    }

    updateHoldUI() {
      if (!this.holdSubtextEl) return;
      this.holdSubtextEl.textContent = this.canHold ? 'Trocar Peça [C]' : 'Bloqueado nesta peça';
    }

    // ============================================================================
    // AÇÕES E MECÂNICAS DOS ITENS ATIVOS
    // ============================================================================
    useActiveItemByIndex(idx) {
      const activeIds = Object.keys(this.activeItemInventory);
      if (activeIds[idx]) {
        this.useActiveItem(activeIds[idx]);
      }
    }

    useActiveItem(id) {
      const itemState = this.activeItemInventory[id];
      if (!itemState || !itemState.isReady || this.isPaused || this.isGameOver || this.isChoosingItem) return;

      this.sound.playActiveItem();

      switch (id) {
        case 'bomba':
          this.targetingMode = 'bomba';
          this.spawnScorePopup('💣 CLIQUE NO TABULEIRO PARA EXPLODIR 3x3!', 50);
          break;

        case 'meteoro':
          this.targetingMode = 'meteoro';
          this.spawnScorePopup('☄️ CLIQUE NO TABULEIRO PARA O IMPACTO (4x4)!', 50);
          break;

        case 'vassoura':
          this.targetingMode = 'vassoura';
          this.vassouraBlocksLeft = 2;
          this.spawnScorePopup('🧹 CLIQUE EM 2 BLOCOS PARA REMOVER!', 50);
          break;

        case 'relogio':
          if (this.historySnapshots.length > 0) {
            const snap = this.historySnapshots[0];
            this.restoreSnapshot(snap);
            this.sound.playRewind();
            itemState.chargesRemaining = (itemState.chargesRemaining || 3) - 1;
            this.spawnScorePopup(`⏪ VOLTA NO TEMPO! (${itemState.chargesRemaining} usos restam)`, 60);
            if (itemState.chargesRemaining <= 0) {
              delete this.activeItemInventory[id];
            }
            this.updateActiveItemsUI();
          }
          break;

        case 'liquido_misterioso':
          this.openLiquidModal();
          break;

        case 'pocao':
          this.triggerPotionEffect();
          itemState.isReady = false;
          itemState.currentPiecesProgress = 0;
          this.updateActiveItemsUI();
          break;

        case 'construtor':
          this.triggerBuilderEffect();
          itemState.isReady = false;
          itemState.currentPiecesProgress = 0;
          this.updateActiveItemsUI();
          break;

        case 'backspace_key':
          // Remove TODAS as peças do tabuleiro (limpa o tabuleiro inteiro)
          this.grid = this.createEmptyGrid();
          // Zera a pontuação do jogador (score total e fichas/mult)
          this.score = 0;
          this.combo = 0;
          if (this.comboCountEl) this.comboCountEl.textContent = '0';
          if (this.chipsValEl) this.chipsValEl.textContent = '0';
          if (this.multValEl) this.multValEl.textContent = 'x1.0';
          this.updateUI();

          // Efeitos visuais e sonoros de limpeza total
          if (this.sound.playGlitch) {
            this.sound.playGlitch();
          } else {
            this.sound.playExplosion();
          }
          for (let r = 0; r < ROWS; r += 2) {
            this.particles.spawnLineClear(r, 12, '#ea3c36');
          }
          this.spawnScorePopup('⌫ BACKSPACE: TABULEIRO E PONTOS ZERADOS!', 70);

          // Consumido e sai do inventário
          delete this.activeItemInventory[id];
          this.updateActiveItemsUI();
          break;

        case 'glitch':
          this.isGlitchActive = true;
          this.glitchTimer = 6000;
          this.sound.playGlitch();
          itemState.isReady = false;
          itemState.currentPiecesProgress = 0;
          this.spawnScorePopup('👾 GLITCH ATIVADO (6s)! REGRAS DE COLISÃO DESLIGADAS!', 60);
          this.updateActiveItemsUI();
          break;
      }
    }

    handleTargetingClick(col, row) {
      if (this.targetingMode === 'bomba') {
        let cleared = 0;
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            const tr = row + dy;
            const tc = col + dx;
            if (tr >= 0 && tr < ROWS && tc >= 0 && tc < COLS && this.grid[tr][tc] !== null) {
              this.grid[tr][tc] = null;
              cleared++;
            }
          }
        }
        this.sound.playExplosion();
        this.particles.spawnExplosion(col, row);
        this.score += cleared * 150 + 300;
        this.scoreValEl.textContent = this.score.toLocaleString();
        this.spawnScorePopup(`💣 EXPLOSÃO 3x3! +${(cleared * 150 + 300).toLocaleString()}`, row * BLOCK_SIZE);
        if (this.activeItemInventory['bomba']) {
          this.activeItemInventory['bomba'].isReady = false;
          this.activeItemInventory['bomba'].currentPiecesProgress = 0;
        }
        this.targetingMode = null;
        this.updateActiveItemsUI();
      } else if (this.targetingMode === 'meteoro') {
        let cleared = 0;
        for (let dy = -1; dy <= 2; dy++) {
          for (let dx = -1; dx <= 2; dx++) {
            const tr = row + dy;
            const tc = col + dx;
            if (tr >= 0 && tr < ROWS && tc >= 0 && tc < COLS && this.grid[tr][tc] !== null) {
              this.grid[tr][tc] = null;
              cleared++;
            }
          }
        }
        this.sound.playExplosion();
        this.particles.spawnExplosion(col, row);
        this.particles.spawnExplosion(col + 1, row + 1);
        this.score += cleared * 200 + 800;
        this.scoreValEl.textContent = this.score.toLocaleString();
        this.spawnScorePopup(`☄️ METEORO 4x4! +${(cleared * 200 + 800).toLocaleString()}`, row * BLOCK_SIZE);
        if (this.activeItemInventory['meteoro']) {
          this.activeItemInventory['meteoro'].isReady = false;
          this.activeItemInventory['meteoro'].currentPiecesProgress = 0;
        }
        this.targetingMode = null;
        this.updateActiveItemsUI();
      } else if (this.targetingMode === 'vassoura') {
        if (row >= 0 && row < ROWS && col >= 0 && col < COLS && this.grid[row][col] !== null) {
          this.grid[row][col] = null;
          this.sound.playSweep();
          this.particles.spawnLineClear(row, 10, '#70fff0');
          this.vassouraBlocksLeft--;
          this.spawnScorePopup(`🧹 BLOCO VARRIDO! (${this.vassouraBlocksLeft} restante${this.vassouraBlocksLeft > 1 ? 's' : ''})`, row * BLOCK_SIZE);
          if (this.vassouraBlocksLeft <= 0) {
            if (this.activeItemInventory['vassoura']) {
              this.activeItemInventory['vassoura'].isReady = false;
              this.activeItemInventory['vassoura'].currentPiecesProgress = 0;
            }
            this.targetingMode = null;
            this.updateActiveItemsUI();
          }
        }
      }
    }

    triggerPotionEffect() {
      this.sound.playPotion();
      const potionRoll = Math.floor(Math.random() * 5);
      switch (potionRoll) {
        case 0:
          const bonusChips = 1200 * this.level;
          this.score += bonusChips;
          this.scoreValEl.textContent = this.score.toLocaleString();
          this.spawnScorePopup(`🧪 POÇÃO MÁGICA: +${bonusChips.toLocaleString()} Fichas!`, 70);
          break;
        case 1:
          // Remove as 2 linhas inferiores
          for (let i = 0; i < 2; i++) {
            this.grid.pop();
            this.grid.unshift(new Array(COLS).fill(null));
          }
          this.particles.spawnLineClear(ROWS - 1, 15, '#ffd700');
          this.spawnScorePopup('🧪 POÇÃO: 2 Linhas inferiores purificadas!', 80);
          break;
        case 2:
          // Transforma peça atual em 1x1
          if (this.currentPiece) {
            this.currentPiece.shape = [[1]];
            this.spawnScorePopup('🧪 POÇÃO: Peça atual virou 1 bloco!', 80);
          }
          break;
        case 3:
          this.smokeTimer = 4000;
          if (this.smokeOverlayEl) this.smokeOverlayEl.classList.remove('hidden');
          this.spawnScorePopup('🧪 POÇÃO: Fumaça doida solta na tela!', 80);
          break;
        case 4:
          this.dropCounter += 500;
          this.spawnScorePopup('🧪 POÇÃO: Queda rápida temporária!', 80);
          break;
      }
    }

    triggerBuilderEffect() {
      let filled = 0;
      for (let r = ROWS - 1; r >= 1 && filled < 2; r--) {
        for (let c = 0; c < COLS && filled < 2; c++) {
          if (this.grid[r][c] === null && this.grid[r - 1][c] !== null) {
            this.grid[r][c] = 'O';
            filled++;
            this.particles.spawnLineClear(r, 8, '#ffd700');
          }
        }
      }
      if (filled < 2) {
        for (let r = ROWS - 1; r >= 0 && filled < 2; r--) {
          for (let c = 0; c < COLS && filled < 2; c++) {
            if (this.grid[r][c] === null) {
              this.grid[r][c] = 'I';
              filled++;
            }
          }
        }
      }
      this.sound.playBuilder();
      this.spawnScorePopup('🔨 CONSTRUTOR: +2 Blocos Estratégicos!', 70);
    }

    // Modal do Líquido Misterioso (Edição de Peça 5x5)
    openLiquidModal() {
      if (!this.currentPiece) return;
      this.isPaused = true;
      this.liquidGridState = Array(5).fill(null).map(() => Array(5).fill(0));

      const shape = this.currentPiece.shape;
      const offR = Math.max(0, Math.floor((5 - shape.length) / 2));
      const offC = Math.max(0, Math.floor((5 - (shape[0] ? shape[0].length : 0)) / 2));

      for (let r = 0; r < shape.length; r++) {
        for (let c = 0; c < shape[r].length; c++) {
          if (shape[r][c] && (offR + r < 5) && (offC + c < 5)) {
            this.liquidGridState[offR + r][offC + c] = 1;
          }
        }
      }

      this.renderLiquidGrid();
      if (this.liquidModalEl) this.liquidModalEl.classList.remove('hidden');
    }

    renderLiquidGrid() {
      if (!this.liquidGrid5x5El) return;
      this.liquidGrid5x5El.innerHTML = '';
      for (let r = 0; r < 5; r++) {
        for (let c = 0; c < 5; c++) {
          const cell = document.createElement('div');
          cell.className = `liquid-cell ${this.liquidGridState[r][c] ? 'active' : ''}`;
          cell.dataset.r = r;
          cell.dataset.c = c;
          cell.addEventListener('click', () => {
            this.liquidGridState[r][c] = this.liquidGridState[r][c] ? 0 : 1;
            cell.classList.toggle('active', Boolean(this.liquidGridState[r][c]));
            this.sound.playRotate();
          });
          this.liquidGrid5x5El.appendChild(cell);
        }
      }
    }

    applyLiquidPiece() {
      if (!this.currentPiece || !this.liquidGridState) return;

      let minR = 5, maxR = -1, minC = 5, maxC = -1;
      for (let r = 0; r < 5; r++) {
        for (let c = 0; c < 5; c++) {
          if (this.liquidGridState[r][c]) {
            if (r < minR) minR = r;
            if (r > maxR) maxR = r;
            if (c < minC) minC = c;
            if (c > maxC) maxC = c;
          }
        }
      }

      if (maxR >= minR && maxC >= minC) {
        const newShape = [];
        for (let r = minR; r <= maxR; r++) {
          const row = [];
          for (let c = minC; c <= maxC; c++) {
            row.push(this.liquidGridState[r][c] ? 1 : 0);
          }
          newShape.push(row);
        }
        this.currentPiece.shape = newShape;
        this.sound.playPotion();
        this.spawnScorePopup('🧪 PEÇA ESCULPIDA COM SUCESSO!', 60);

        if (this.activeItemInventory['liquido_misterioso']) {
          this.activeItemInventory['liquido_misterioso'].isReady = false;
          this.activeItemInventory['liquido_misterioso'].currentPiecesProgress = 0;
          this.updateActiveItemsUI();
        }
      }

      this.closeLiquidModal();
    }

    closeLiquidModal() {
      if (this.liquidModalEl) this.liquidModalEl.classList.add('hidden');
      this.isPaused = false;
    }

    // Histórico de Estados dos últimos 20 segundos (Item Relógio)
    recordSnapshot() {
      if (this.historySnapshots.length >= 50) {
        this.historySnapshots.shift();
      }
      this.historySnapshots.push({
        time: Date.now(),
        grid: this.grid.map(row => [...row]),
        score: this.score,
        lines: this.lines,
        level: this.level,
        combo: this.combo,
        pieceType: this.currentPiece ? this.currentPiece.type : 'T'
      });
    }

    restoreSnapshot(snap) {
      this.grid = snap.grid.map(row => [...row]);
      this.score = snap.score;
      this.lines = snap.lines;
      this.level = snap.level;
      this.combo = snap.combo;
      this.updateUI();
      this.currentPiece = this.spawnPiece(snap.pieceType);
      for (let r = 0; r < ROWS; r++) {
        this.particles.spawnLineClear(r, 6, '#0bd4bd');
      }
    }

    // ============================================================================
    // EFEITOS VISUAIS E INTERFACE (Popups de Pontos, Animações UI)
    // ============================================================================
    triggerShake(magnitude) {
      // Efeitos de tremor desativados: o jogo permanece sempre calmo e estável
    }

    triggerSquash() {
      // Deformações e zoom desativados
    }

    spawnScorePopup(text, topPx) {
      const popup = document.createElement('div');
      popup.className = 'float-score-popup';
      popup.textContent = text;
      popup.style.top = `${Math.max(40, topPx)}px`;
      popup.style.left = '50%';
      this.floatContainerEl.appendChild(popup);
      setTimeout(() => popup.remove(), 1100);
    }

    bumpUIElements(chips, mult, total) {
      this.chipsValEl.textContent = chips.toLocaleString();
      this.multValEl.textContent = `x${mult}`;

      this.chipsBoxEl.classList.remove('mult-bump');
      this.multBoxEl.classList.remove('mult-bump');
      this.scoreValEl.classList.remove('score-bump');

      void this.chipsBoxEl.offsetWidth;

      this.chipsBoxEl.classList.add('mult-bump');
      this.multBoxEl.classList.add('mult-bump');
      this.scoreValEl.classList.add('score-bump');
    }

    updateUI() {
      this.scoreValEl.textContent = this.score.toLocaleString();
      this.levelValEl.textContent = this.level.toString();
      this.linesValEl.textContent = this.lines.toString();
      this.comboCountEl.textContent = this.combo.toString();
    }

    // ============================================================================
    // RENDERIZAÇÃO NO CANVAS (Estilo Balatro: Fichas, Bevels, Gloss)
    // ============================================================================
    drawBlock(ctx, x, y, type, size, isGhost = false, isBomb = false) {
      const colors = isBomb
        ? { base: '#ea3c36', light: '#ffd700', dark: '#8f1b17', shadow: '#590e0b' }
        : (TETROMINO_COLORS[type] || TETROMINO_COLORS.I);
      const px = x * size;
      const py = y * size;

      if (isGhost) {
        // Peça Fantasma: Contorno translúcido com brilho
        ctx.save();
        ctx.fillStyle = colors.base;
        ctx.globalAlpha = isBomb ? 0.38 : 0.18;
        ctx.fillRect(px + 2, py + 2, size - 4, size - 4);

        ctx.strokeStyle = isBomb ? '#ffd700' : colors.light;
        ctx.lineWidth = isBomb ? 3 : 2;
        ctx.globalAlpha = isBomb ? 0.95 : 0.6;
        ctx.strokeRect(px + 2, py + 2, size - 4, size - 4);

        if (isBomb && size >= 20) {
          ctx.font = `${Math.floor(size * 0.45)}px sans-serif`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('💣', px + size / 2, py + size / 2 + 1);
        }
        ctx.restore();
        return;
      }

      ctx.save();
      // 1. Sombra e Borda Externa Escura
      ctx.fillStyle = isBomb ? '#ffd700' : colors.shadow;
      ctx.fillRect(px, py, size, size);

      // 2. Cor Base Interna
      ctx.fillStyle = colors.base;
      ctx.fillRect(px + 2, py + 2, size - 4, size - 4);

      // 3. Bevel Superior / Esquerdo (Luz)
      ctx.fillStyle = colors.light;
      ctx.beginPath();
      ctx.moveTo(px + 2, py + 2);
      ctx.lineTo(px + size - 2, py + 2);
      ctx.lineTo(px + size - 5, py + 5);
      ctx.lineTo(px + 5, py + 5);
      ctx.lineTo(px + 5, py + size - 5);
      ctx.lineTo(px + 2, py + size - 2);
      ctx.closePath();
      ctx.fill();

      // 4. Bevel Inferior / Direito (Sombra)
      ctx.fillStyle = colors.dark;
      ctx.beginPath();
      ctx.moveTo(px + size - 2, py + 2);
      ctx.lineTo(px + size - 2, py + size - 2);
      ctx.lineTo(px + 2, py + size - 2);
      ctx.lineTo(px + 5, py + size - 5);
      ctx.lineTo(px + size - 5, py + size - 5);
      ctx.lineTo(px + size - 5, py + 5);
      ctx.closePath();
      ctx.fill();

      // 5. Brilho Pip Balatro (Gloss no canto superior esquerdo)
      ctx.fillStyle = '#ffffff';
      ctx.globalAlpha = 0.65;
      ctx.fillRect(px + 6, py + 6, 4, 4);

      if (isBomb && size >= 20) {
        ctx.globalAlpha = 1;
        ctx.font = `${Math.floor(size * 0.52)}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('💣', px + size / 2, py + size / 2 + 1);
      }

      ctx.restore();
    }

    renderBoard() {
      // Limpar Canvas Principal
      this.mainCtx.clearRect(0, 0, this.mainCanvas.width, this.mainCanvas.height);

      // Grid sutil no fundo
      this.mainCtx.strokeStyle = 'rgba(255, 255, 255, 0.035)';
      this.mainCtx.lineWidth = 1;
      for (let c = 1; c < COLS; c++) {
        this.mainCtx.beginPath();
        this.mainCtx.moveTo(c * BLOCK_SIZE, 0);
        this.mainCtx.lineTo(c * BLOCK_SIZE, ROWS * BLOCK_SIZE);
        this.mainCtx.stroke();
      }
      for (let r = 1; r < ROWS; r++) {
        this.mainCtx.beginPath();
        this.mainCtx.moveTo(0, r * BLOCK_SIZE);
        this.mainCtx.lineTo(COLS * BLOCK_SIZE, r * BLOCK_SIZE);
        this.mainCtx.stroke();
      }

      // Desenhar Blocos Fixos do Grid
      for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
          if (this.grid[r][c]) {
            this.drawBlock(this.mainCtx, c, r, this.grid[r][c], BLOCK_SIZE);
          }
        }
      }

      // Animação de Flash Branco nas linhas completadas
      if (this.clearingRows.length > 0) {
        const flashProgress = this.clearAnimTimer / this.clearAnimDuration;
        this.mainCtx.save();
        this.mainCtx.fillStyle = '#ffffff';
        this.mainCtx.globalAlpha = Math.max(0, flashProgress * 0.9);
        for (const r of this.clearingRows) {
          this.mainCtx.fillRect(0, r * BLOCK_SIZE, COLS * BLOCK_SIZE, BLOCK_SIZE);
        }
        this.mainCtx.restore();
      }

      // Desenhar Peça Fantasma (Ghost)
      if (this.currentPiece && this.clearingRows.length === 0) {
        const ghostY = this.getGhostY();
        for (let r = 0; r < this.currentPiece.shape.length; r++) {
          for (let c = 0; c < this.currentPiece.shape[r].length; c++) {
            if (this.currentPiece.shape[r][c]) {
              const gy = ghostY + r;
              const gx = this.currentPiece.x + c;
              if (gy >= 0) {
                this.drawBlock(this.mainCtx, gx, gy, this.currentPiece.type, BLOCK_SIZE, true, false);
              }
            }
          }
        }

        // Desenhar Peça Atual Ativa (com suporte ao Fantasma: transparência)
        this.mainCtx.save();
        if (this.currentPiece.isTransparent) {
          this.mainCtx.globalAlpha = 0.08;
        }

        for (let r = 0; r < this.currentPiece.shape.length; r++) {
          for (let c = 0; c < this.currentPiece.shape[r].length; c++) {
            if (this.currentPiece.shape[r][c]) {
              const py = this.currentPiece.y + r;
              const px = this.currentPiece.x + c;
              if (py >= 0) {
                this.drawBlock(this.mainCtx, px, py, this.currentPiece.type, BLOCK_SIZE, false, false);
              }
            }
          }
        }
        this.mainCtx.restore();
      }

      // Efeito Visual de Glitch (quando colisão está desligada)
      if (this.isGlitchActive) {
        this.mainCtx.save();
        this.mainCtx.fillStyle = 'rgba(0, 255, 255, 0.06)';
        this.mainCtx.fillRect(0, 0, this.mainCanvas.width, this.mainCanvas.height);
        this.mainCtx.strokeStyle = 'rgba(255, 0, 128, 0.7)';
        this.mainCtx.lineWidth = 2;
        const glitchScanY = (Date.now() / 3) % (ROWS * BLOCK_SIZE);
        this.mainCtx.beginPath();
        this.mainCtx.moveTo(0, glitchScanY);
        this.mainCtx.lineTo(COLS * BLOCK_SIZE, glitchScanY);
        this.mainCtx.stroke();
        this.mainCtx.restore();
      }

      // Retículo de Mira para itens ativos (Bomba 3x3, Meteoro 4x4, Vassoura 1x1)
      if (this.targetingMode && this.mouseHoverPos) {
        const { col, row } = this.mouseHoverPos;
        this.mainCtx.save();
        if (this.targetingMode === 'bomba') {
          this.mainCtx.fillStyle = 'rgba(234, 60, 54, 0.35)';
          this.mainCtx.strokeStyle = '#ffd700';
          this.mainCtx.lineWidth = 2;
          const startX = Math.max(0, col - 1) * BLOCK_SIZE;
          const startY = Math.max(0, row - 1) * BLOCK_SIZE;
          const w = Math.min(COLS, col + 2) * BLOCK_SIZE - startX;
          const h = Math.min(ROWS, row + 2) * BLOCK_SIZE - startY;
          this.mainCtx.fillRect(startX, startY, w, h);
          this.mainCtx.strokeRect(startX, startY, w, h);
        } else if (this.targetingMode === 'meteoro') {
          this.mainCtx.fillStyle = 'rgba(244, 155, 19, 0.4)';
          this.mainCtx.strokeStyle = '#ff3300';
          this.mainCtx.lineWidth = 2;
          const startX = Math.max(0, col - 1) * BLOCK_SIZE;
          const startY = Math.max(0, row - 1) * BLOCK_SIZE;
          const w = Math.min(COLS, col + 3) * BLOCK_SIZE - startX;
          const h = Math.min(ROWS, row + 3) * BLOCK_SIZE - startY;
          this.mainCtx.fillRect(startX, startY, w, h);
          this.mainCtx.strokeRect(startX, startY, w, h);
        } else if (this.targetingMode === 'vassoura') {
          if (col >= 0 && col < COLS && row >= 0 && row < ROWS) {
            this.mainCtx.fillStyle = 'rgba(11, 212, 189, 0.5)';
            this.mainCtx.strokeStyle = '#70fff0';
            this.mainCtx.lineWidth = 2;
            this.mainCtx.fillRect(col * BLOCK_SIZE, row * BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE);
            this.mainCtx.strokeRect(col * BLOCK_SIZE, row * BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE);
          }
        }
        this.mainCtx.restore();
      }

      // Renderizar Partículas
      this.particles.updateAndDraw();
    }

    // Renderizar Miniatura da Peça no Hold
    renderHold() {
      this.holdCtx.clearRect(0, 0, this.holdCanvas.width, this.holdCanvas.height);
      if (!this.holdPiece) return;

      const shape = SHAPES[this.holdPiece];
      const miniSize = 22;
      const pieceW = shape[0].length * miniSize;
      const pieceH = shape.length * miniSize;
      const startX = Math.floor((this.holdCanvas.width - pieceW) / 2 / miniSize);
      const startY = Math.floor((this.holdCanvas.height - pieceH) / 2 / miniSize);

      for (let r = 0; r < shape.length; r++) {
        for (let c = 0; c < shape[r].length; c++) {
          if (shape[r][c]) {
            this.drawBlock(this.holdCtx, startX + c, startY + r, this.holdPiece, miniSize);
          }
        }
      }
    }

    // Renderizar Miniaturas das Próximas Peças (com suporte a Olho do Futuro: 10 peças)
    renderNextQueue() {
      // Garante que o pool tem peças suficientes
      while (this.nextQueue.length < 10) {
        this.nextQueue.push(this.getNextPieceType());
      }

      for (let i = 0; i < 3; i++) {
        const ctx = this.nextCtxs[i];
        const canvas = this.nextCanvases[i];
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        const type = this.nextQueue[i];
        if (!type) continue;

        const shape = SHAPES[type];
        const miniSize = 19;
        const pieceW = shape[0].length * miniSize;
        const pieceH = shape.length * miniSize;
        const startX = Math.floor((canvas.width - pieceW) / 2 / miniSize);
        const startY = Math.floor((canvas.height - pieceH) / 2 / miniSize);

        for (let r = 0; r < shape.length; r++) {
          for (let c = 0; c < shape[r].length; c++) {
            if (shape[r][c]) {
              this.drawBlock(ctx, startX + c, startY + r, type, miniSize);
            }
          }
        }
      }

      // Olho do Futuro (Tier 4): Mostra as próximas 10 peças na prévia
      const hasOlho = this.getItemStacks('olho_futuro') > 0;
      let extraQueueContainer = document.getElementById('extraNextQueue');
      if (hasOlho) {
        if (!extraQueueContainer) {
          extraQueueContainer = document.createElement('div');
          extraQueueContainer.id = 'extraNextQueue';
          extraQueueContainer.className = 'extra-next-queue';
          const cardNext = document.querySelector('.card-next');
          if (cardNext) cardNext.appendChild(extraQueueContainer);
        }
        extraQueueContainer.innerHTML = '<span class="extra-queue-title">👁️ +7 FUTURAS:</span>';
        const strip = document.createElement('div');
        strip.className = 'extra-queue-strip';
        for (let i = 3; i < 10; i++) {
          const type = this.nextQueue[i];
          if (type) {
            const badge = document.createElement('span');
            badge.className = 'extra-queue-badge';
            badge.textContent = type;
            badge.style.color = (TETROMINO_COLORS[type] && TETROMINO_COLORS[type].base) || '#fff';
            strip.appendChild(badge);
          }
        }
        extraQueueContainer.appendChild(strip);
      } else if (extraQueueContainer) {
        extraQueueContainer.remove();
      }
    }

    // ============================================================================
    // LOOP PRINCIPAL DE ANIMAÇÃO & GRAVIDADE
    // ============================================================================
    startLoop() {
      const step = now => {
        if (!this.lastTime) this.lastTime = now;
        const dt = Math.min(now - this.lastTime, 100);
        this.lastTime = now;

        if (!this.isPaused && !this.isGameOver) {
          this.handleContinuousInput(now);
          this.updateGame(dt);
        }

        this.renderBoard();
        requestAnimationFrame(step);
      };

      requestAnimationFrame(step);
    }

    updateGame(dt) {
      // Se estamos em animação de limpar linha, aguarda finalizar o flash
      if (this.clearingRows.length > 0) {
        this.clearAnimTimer -= dt;
        if (this.clearAnimTimer <= 0) {
          this.collapseClearedRows();
        }
        return;
      }

      // Timer do Glitch
      if (this.isGlitchActive) {
        this.glitchTimer -= dt;
        if (this.glitchTimer <= 0) {
          this.isGlitchActive = false;
          this.sound.playRotate();
          this.spawnScorePopup('👾 GLITCH TERMINADO!', 60);
        }
      }

      // Timer da Fumaça do Extintor
      if (this.smokeTimer > 0) {
        this.smokeTimer -= dt;
        if (this.smokeTimer <= 0 && this.smokeOverlayEl) {
          this.smokeOverlayEl.classList.add('hidden');
        }
      }

      // Gravação periódica de snapshots para o Relógio (a cada 400ms, guarda até 20s)
      this.snapshotTimer = (this.snapshotTimer || 0) + dt;
      if (this.snapshotTimer >= 400) {
        this.snapshotTimer = 0;
        this.recordSnapshot();
      }

      if (!this.currentPiece) return;

      // Movimento oscilatório do Ímã (Tier 0): movimento tipo onda senoidal
      if (this.getItemStacks('ima') > 0) {
        this.imaWaveTimer = (this.imaWaveTimer || 0) + dt;
        if (this.imaWaveTimer >= 550) {
          this.imaWaveTimer = 0;
          const waveShift = Math.sin(Date.now() / 450) > 0 ? 1 : -1;
          if (!this.checkCollision(this.currentPiece, this.currentPiece.x + waveShift, this.currentPiece.y, this.currentPiece.shape)) {
            this.currentPiece.x += waveShift;
          }
        }
      }

      // Relógio Quebrado (Tier 0): A velocidade de queda da peça atual muda aleatoriamente
      if (this.getItemStacks('relogio_quebrado') > 0) {
        this.relogioQuebradoTimer = (this.relogioQuebradoTimer || 0) + dt;
        if (this.relogioQuebradoTimer >= (this.relogioQuebradoNextInterval || 900)) {
          this.relogioQuebradoTimer = 0;
          this.relogioQuebradoNextInterval = 600 + Math.random() * 1000;
          // Velocidade imprevisível: pode acelerar (0.35x, 0.55x, 0.8x) ou desacelerar (1.4x, 2.0x)
          const speeds = [0.35, 0.55, 0.8, 1.0, 1.4, 2.0];
          this.relogioQuebradoSpeedFactor = speeds[Math.floor(Math.random() * speeds.length)];
        }
      } else {
        this.relogioQuebradoSpeedFactor = 1.0;
      }

      // Velocidade de Queda baseada no Nível e nos Itens
      // Pena (Tier 3): 20% mais devagar por stack (* 1.20)
      // Balão (Tier 1): 20% mais devagar (* 1.20)
      // Óculos (Tier 1): 2x mais rápido (/ speedMultiplier)
      // Relógio Quebrado (Tier 0): oscilação imprevisível
      const baseDelay = Math.max(80, Math.floor(780 * Math.pow(0.86, this.level - 1)));
      let slowFactor = 1.0;
      const penaStacks = this.getItemStacks('pena');
      if (penaStacks > 0) {
        slowFactor *= Math.pow(1.20, penaStacks);
      }
      if (this.getItemStacks('balao') > 0) {
        slowFactor *= 1.20;
      }
      const brokenClockFactor = this.relogioQuebradoSpeedFactor || 1.0;
      const gravityDelay = Math.max(30, Math.round((baseDelay * slowFactor * brokenClockFactor) / (this.speedMultiplier || 1.0)));

      this.dropCounter += dt;
      if (this.dropCounter >= gravityDelay) {
        this.dropCounter = 0;
        // Tentativa de queda normal
        if (!this.checkCollision(this.currentPiece, this.currentPiece.x, this.currentPiece.y + 1, this.currentPiece.shape)) {
          this.currentPiece.y++;
          this.isOnFloor = false;
        } else {
          this.isOnFloor = true;
        }
      }

      // Trava no chão com Lock Delay de 500ms
      if (this.isOnFloor) {
        this.lockDelayCounter += dt;
        if (this.lockDelayCounter >= this.lockDelayLimit) {
          this.lockDelayCounter = 0;
          this.isOnFloor = false;
          this.lockPiece();
        }
      } else {
        this.lockDelayCounter = 0;
      }
    }
  }

  // Iniciar quando o DOM estiver pronto e expor instância para testes
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      window.game = new TetrisGame();
    });
  } else {
    window.game = new TetrisGame();
  }

})();
