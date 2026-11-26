# MirSeer Stream Gateway

Piccolo servizio (Node.js + ffmpeg) che affianca TorrServer e fa da "Jellyfin per magnet":
MirSeer apre `http://GATEWAY:8765/player?magnet=…&name=…&index=…`, il gateway aggiunge il torrent a TorrServer,
analizza le tracce con ffprobe e le serve al browser come HLS (hls.js), senza scaricare il file intero.

## Avvio
```
cp .env.example .env      # modifica se serve (TorrServer esterno, utente/password, token)
docker compose up -d --build
curl http://localhost:8765/health
```
In MirSeer: Impostazioni › Player nel browser › indirizzo `http://IP-DEL-SERVER:8765` › "Salva e testa gateway".

## Come decide cosa fare
| Video nel file | Browser lo decodifica? | Azione |
|---|---|---|
| H.264 8-bit | sì | copia (`-c:v copy`), CPU quasi zero |
| HEVC 8/10-bit, AV1, VP9 | secondo `MediaSource.isTypeSupported` | copia se sì, altrimenti x264 |
| H.264 10-bit, MPEG-4, VC-1… | no | x264 (max `TRANSCODE_MAX_HEIGHT`) |
| HDR / Dolby Vision profilo 5 | – | x264 + tonemap (zscale) |

L'audio diventa sempre AAC stereo (copiato se è già AAC stereo). Video e audio escono dallo stesso ffmpeg,
quindi **non si desincronizzano**: cambiando traccia audio il gateway riparte dal punto attuale con l'altra traccia.

## Limiti noti
- Il seek in modalità "copia" riparte dal keyframe precedente (il player recupera il resto, ma con GOP lunghi c'è un attimo di attesa).
- Sottotitoli: solo testuali (SRT/ASS/WebVTT/mov_text). Estrarli legge tutto il file dal torrent, quindi la prima volta è lento.
- Sottotitoli a immagine (PGS/VobSub): non supportati.
- Senza GPU la ricodifica 4K può scattare: usa torrent H.264/HEVC compatibili o un client che decodifica HEVC.
- Accelerazione hardware (VAAPI/NVENC): non ancora implementata.
- Pagina https del forum + gateway http non locale: il browser blocca l'incorporamento, quindi si apre in una scheda. Per l'overlay dai un indirizzo https al gateway (es. `tailscale serve --bg 8765`).

## Variabili
`TORRSERVER_URL`, `TS_USER`, `TS_PASS`, `GATEWAY_TOKEN`, `PORT` (8765), `CACHE_DIR` (/cache), `SEG_SECONDS` (6),
`AHEAD_SEGMENTS` (10, quanti segmenti precalcolare oltre la posizione), `RUN_IDLE_MIN` (5), `TRANSCODE_MAX_HEIGHT`, `X264_PRESET`.
