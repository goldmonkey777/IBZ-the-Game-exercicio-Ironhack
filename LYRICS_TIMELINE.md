# Benediction (Hot Natured) — Lyrics timeline

Tempos em **segundos** (ataque do vocal). A letra aparece no jogo em `time - LYRICS_LEAD` (LEAD = 0.32s).

Formato no código (`js/flappy.js`): `{ time: <segundos>, text: "…" }`

## Timeline atual (sincronizada)

| Time (s) | Text |
|---------|------|
| 12.20 | Hey! |
| 13.90 | Hey! |
| 19.00 | When I give you my love… |
| 22.45 | I want you to want me… |
| 27.10 | You know I got it… |
| 30.45 | I want you to want me… |
| 35.55 | Benediction… |
| 38.95 | Benediction… |
| 45.25 | When I give you my love… |
| 48.65 | I want you to want me… |
| 53.45 | You know I got it… |
| 56.75 | I want you to want me… |
| 61.95 | Benediction… |
| 65.35 | Benediction… |

## Ajuste fino

- **Offset global:** no jogo, tecla `[` (letra mais cedo) / `]` (letra mais tarde). Salvo em `localStorage`.
- **Por linha:** com overlay de debug (tecla **D**), use `,` e `.` para mover a linha atual ±0.05s.
- **LEAD:** em `js/flappy.js`, constante `LYRICS_LEAD` (0.32 = letra 0.32s antes do vocal).

Se a sua versão do Benediction.mp3 for diferente, edite os valores `time` em `lyricsLines` em `js/flappy.js` ou use o offset global no jogo.
