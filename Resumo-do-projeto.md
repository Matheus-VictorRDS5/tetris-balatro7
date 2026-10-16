Com base em tudo que conversamos, aqui está o resumo do que o jogo tem até agora:

Tetris estilo Balatro — jogo de navegador em HTML, CSS e JavaScript puro, feito no AntiGravity IDE.

Jogabilidade (Tetris clássico):

Tabuleiro 10x20, 7 peças com sistema 7-bag, ghost piece, hold, prévia das próximas peças
Controles por teclado (setas, X, espaço, C, P/ESC, R, M)
Sistema de níveis com velocidade crescente e tela de game over

Visual estilo Balatro:

Fundo animado "tinta líquida" feito em CSS (gradientes + keyframes, sem WebGL)
Efeito CRT (scanlines, vinheta), interface em formato de cartas, animações "juicy"

Combo e pontuação:

Overlay de combo (ex: "TETRIS + 4X COMBO!"), com Back-to-Back para Tetris seguidos
Multiplicador de score (x1 a x5) que sobe com combos
Popups de pontos flutuantes

Sistema de itens (roguelike):

A cada 15 linhas, escolha entre 3 cartas de item (raridades: comum, incomum, rara)
8 itens que acumulam em stacks (Ficha Dourada, Relógio de Areia, Ímã de Combo, Bomba Pequena, Cartão Extra, Prisma, Juros, Escudo)

Áudio e extras:

Sons via Web Audio API, música chiptune em loop com mute
High score salvo em localStorage, layout responsivo

Bugs corrigidos:

Tela tremendo/rolando ao usar as setas (corrigido com preventDefault)
Rolagem até o rodapé (footer no fluxo normal e remoção de restrições de height: 100vh com overflow: hidden)
