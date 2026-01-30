# 🎵 Benediction - Lyrics Timeline

Documento de referência para sincronização das letras com o jogo.

## Pontos de Referência Verificados ✓
| Tempo | Texto |
|-------|-------|
| 0:40 | Hey! |
| 0:51 | Feeling, come on... |
| 0:56 | Wait for so long! |

---

## Timeline Extrapolada @ 120 BPM

### Intro/Verse 1 (0:40 - 1:10)
| Tempo (s) | Texto |
|-----------|-------|
| 40 | Hey! |
| 44 | Feel it coming on... |
| 48 | I waited for so long |
| 51 | Feeling, come on... |
| 56 | Wait for so long! |
| 60 | Feel it come my way |
| 64 | Each and every day |

### Build 1 (1:10 - 1:20)
| Tempo (s) | Texto |
|-----------|-------|
| 70 | By the time I put on my shoes |
| 76 | Already have the groove |

### Drop/Chorus (1:20 - 1:40)
| Tempo (s) | Texto |
|-----------|-------|
| 82 | Benediction... |
| 88 | In the morning time |
| 94 | Everybody riding on |
| 100 | And on, and on... |

### Verse 2 (2:00)
| Tempo (s) | Texto |
|-----------|-------|
| 120 | Hey! |
| 124 | Feel it coming on... |
| 130 | Wait for so long! |

### Build 2 (2:30)
| Tempo (s) | Texto |
|-----------|-------|
| 150 | Nothing that I can do |
| 156 | Feeling true! |

### Drop 2 (3:00)
| Tempo (s) | Texto |
|-----------|-------|
| 180 | Benediction... |
| 186 | In my mind |
| 192 | Benediction... |
| 198 | In my heart and soul |

### Breakdown/Verse 3 (3:30)
| Tempo (s) | Texto |
|-----------|-------|
| 210 | Our love has found a home |
| 218 | I know that I belong |

### Final Build (4:00)
| Tempo (s) | Texto |
|-----------|-------|
| 240 | Hey! |
| 246 | Feel it coming on... |

### Final Drop (4:30)
| Tempo (s) | Texto |
|-----------|-------|
| 270 | Benediction... |
| 280 | And on, and on... |

### Outro (5:00+)
| Tempo (s) | Texto |
|-----------|-------|
| 300 | Riding on... |
| 330 | Benediction... |
| 360 | ... |

---

## Como Editar

As letras estão definidas em `js/flappy.js` no array `lyricsLines`:

```javascript
lyricsLines: [
    { time: 40, text: "Hey!" },
    { time: 51, text: "Feeling, come on..." },
    // ... etc
],
```

### Para Ajustar:
1. Ouça a música
2. Pause no momento exato
3. Anote `audio.currentTime` no console
4. Atualize o valor `time` correspondente

### Dica Pro:
Use lead time de ~0.1s para antecipação psicológica (o cérebro processa melhor).
