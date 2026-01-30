# Debug & Calibration — Benediction lyrics sync

## Overlay de debug (tecla **D**)

- **Tecla:** `D` (toggle em qualquer estado: menu, jogo, game over).
- **Conteúdo:** painel no canto superior direito com:
  - `time` — `audio.currentTime` (relógio da música)
  - `adj` — tempo ajustado (time + offset)
  - `lyric #N @ Xs` — índice da próxima linha e timestamp
  - `active` — texto atual da letra
  - `vocal` — energia na faixa vocal (bins 1–5 ≈ 300Hz–3kHz); `thresh` — limiar; `[V]` on/off
  - `LEAD` — valor de antecipação; `[ / ]` offset; `[ , . ]` nudge da linha atual ±0.05s
  - `zone`, `BPM`
  - `[D] toggle debug`
- **Uso:** conferir se a letra muda no instante em que o vocal entra; ajustar offset com `[` / `]`, linha com `,` / `.`, threshold com `-` / `+`.

---

## Teclas de calibração (com overlay ligado)

| Tecla | Ação |
|-------|------|
| **D** | Liga/desliga overlay de debug |
| **V** | Liga/desliga filtro por espectro vocal (só mostrar balão quando vocal > threshold) |
| **[** / **]** | Ajusta offset global das letras (±0.05s; salvo em `localStorage`) |
| **,** / **.** | Nudge da linha atual: `lyricsLines[index].time` ±0.05s (em memória; copie para o código) |
| **-** / **+** | Ajusta `vocalThreshold` (±2) para calibrar o auto-sync vocal |

---

## Auto-sync por espectro vocal (implementado)

- **Função:** `getVocalEnergy()` — média dos bins 1–5 do `AnalyserNode` (faixa ~300Hz–3kHz com fftSize 64).
- **Comportamento:** o balão de letra só é desenhado quando:
  1. Há texto ativo (`LyricsController.activeText`) **e**
  2. Filtro vocal desligado **ou** energia vocal ≥ `vocalThreshold` (default 22).
- **Objetivo:** evitar texto “atrasado” em trechos sem vocal; o balão some quando a energia vocal cai.
- **Ajuste:** com overlay ligado, use `[V]` para ligar/desligar e `-` / `+` para subir/descer o threshold até o valor que soa certo na Benediction.

---

## Calibração linha a linha (Benediction)

- **Lead base:** 0.28s (entrada de texto = ataque do vocal − 0.28s). House/disco vocal: 0.26–0.32s.
- **Micro-ajuste:** ±0.03s por linha; nunca mais que isso. Atrasada → diminui `time` 0.03–0.05; adiantada → aumenta 0.03.
- **Dicas:** "Hey!" pode entrar até 0.35s antes; frases longas 0.25–0.28; refrão repetido pode ser ligeiramente mais cedo.

1. **Global:** use `[` e `]` durante o jogo para ajustar `lyricsOffsetSeconds` (offset salvo em `localStorage`). O overlay mostra `adj` e `active` em tempo real.
2. **Por linha (em tempo real):** com overlay ligado, use `,` (linha mais cedo) e `.` (linha mais tarde) para mover o `time` da linha atual em ±0.05s. Prefira ±0.03s no código depois. As mudanças são em memória; para fixar, copie os valores e atualize `lyricsLines` em `js/flappy.js`.
3. **Por linha (no código):** edite `lyricsLines` em `js/flappy.js`. Cada entrada é `{ time: <segundos>, text: "…" }`. O tempo é de **entrada do texto** (já antecipado para leitura); o vocal “confirma” depois.
4. **Timeline v1:** já calibrada no jogo (primeira parte da música); use overlay + `,` `.` para lapidação fina.

---

## Checklist rápido

- **[D]** Ativa/desativa overlay de debug.
- **[V]** Liga/desliga filtro por espectro vocal.
- **[ / ]** Ajusta offset global das letras.
- **[ , . ]** Nudge da linha atual ±0.05s (em memória).
- **[ - + ]** Ajusta threshold do filtro vocal.
- Música = único relógio; overlay exibe `time`, `adj`, `vocal` e `thresh` para validar.
