<div align="center">

# 🔮 MirSeer

### Catalogo Multimediale di Nuova Generazione per MirCrew Releases

[![Version](https://img.shields.io/badge/version-20.0-blueviolet.svg?style=for-the-badge)](https://github.com/lorenzomattei/MirSeer/releases)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=for-the-badge)](https://opensource.org/licenses/MIT)
[![Tampermonkey Compatible](https://img.shields.io/badge/Tampermonkey-Compatibile-00485B.svg?style=for-the-badge&logo=tampermonkey)](https://www.tampermonkey.net/)
[![Platform: phpBB](https://img.shields.io/badge/Platform-phpBB-B22222.svg?style=for-the-badge&logo=phpbb)](https://mircrew-releases.org)

<p align="center">
  Trasforma l'esperienza di navigazione forum in un'interfaccia VOD fluida, elegante e reattiva in stile Netflix/Prime Video, integrata direttamente nel tuo browser.
</p>

---

### ⚡ INSTALLAZIONE RAPIDA IN 1 CLIC

[![Installa con Tampermonkey](https://img.shields.io/badge/⚡_INSTALLA_MIRSEER-CLICK_QUI-success?style=for-the-badge&logo=tampermonkey&logoColor=white)](https://raw.githubusercontent.com/lorenzomattei/MirSeer/main/mirseer.user.js)

*(Richiede un userscript manager attivo: Tampermonkey, Violentmonkey)*

---

</div>

## 🖼️ Anteprima Interfaccia

<div align="center">
  <img src="assets/preview-home.png" alt="MirSeer UI Showcase" width="90%" style="border-radius: 8px; box-shadow: 0 4px 20px rgba(0,0,0,0.5);" />
  <img src="assets/preview-modal.png" alt="MirSeer UI Showcase" width="90%" style="border-radius: 8px; box-shadow: 0 4px 20px rgba(0,0,0,0.5);" />
  <video src="assets/demo.mp4" controls width="92%" style="border-radius: 8px; box-shadow: 0 8px 30px rgba(0,0,0,0.6);"></video>
</div>

---

## ✨ Funzionalità Principali

- 🎬 **Interfaccia Cinema a Schermo Intero:** Modalità Dark immersiva con componenti moderni basati su *Glassmorphism*, transizioni GPU-accelerated e zero interferenze col layout originale del forum.
- 🗂️ **17 Sezioni Indicizzate Automaticamente:** Supporto a tutte le sezioni Cine, Serie TV, Documentari e Animazione, con auto-discovery dinamica di thread e subforum.
- 🖼️ **Rilevamento Intelligente delle Locandine:** Algoritmo *Aspect-Ratio Agnostic* capace di identificare e centrare cover verticali (2:3), orizzontali (16:9), quadrate (1:1) o banner personalizzati.
- 🛡️ **Anti-Banner del Releaser:** Esclusione euristica intelligente dei loghi del team, gif animate decorative, userbar e firme in testa ai post.
- 🧲 **Gestione Magnet Episodio per Episodio:**
  - Parsing granulare per stagioni ed episodi singoli.
  - Copia in 1-clic con feedback visivo.
  - Tasto **"Copia Tutti i Magnet"** ottimizzato per l'incollo di massa su qBittorrent, Transmission e Deluge.
- 🧹 **Ripulitura Sinossi Naturale:** Eliminazione di separatori ASCII artistici (es. `-=-=-=-`, `★`, `■`), metadati ridondanti e crediti tecnici per mostrare una trama pulita e leggibile.
- 🔍 **Ricerca Universale & Contestuale:** Ricerca istantanea nella sezione corrente o ricerca globale su tutto il forum con risultati raggruppati per categoria.
- 📊 **Filtri e Ordinamento Dinamico:** Ordina al volo le release per:
  - Più Visti (con estrazione del counter visualizzazioni reale `👁️` del forum).
  - Ultimi Usciti (data del topic).
  - Titolo Alfabetico (A-Z).
  - Numero di Risposte/Interazioni.
- 🎠 **Hero Carousel Interattivo:** Banner in evidenza nella parte superiore con rotazione automatica e pausa intelligente al passaggio del mouse (`hover`).

---

## 🚀 Guida all'Installazione

### Passo 1: Installa un Gestore Userscript
Scegli e installa l'estensione browser supportata in base al tuo sistema:

| Browser | Estensione Consigliata | Link Download |
| :--- | :--- | :--- |
| **Google Chrome / Brave** | Tampermonkey | [Chrome Web Store](https://chromewebstore.google.com/detail/tampermonkey/dhdgffkkebhmkfjojejmpbldmpobfkfo) |
| **Mozilla Firefox** | Tampermonkey | [Firefox Add-ons](https://addons.mozilla.org/it/firefox/addon/tampermonkey/) |
| **Microsoft Edge** | Tampermonkey | [Microsoft Edge Add-ons](https://microsoftedge.microsoft.com/addons/detail/tampermonkey/iikmkjmpaadaobahmlepeloendndfphd) |
| **Android (Kiwi / Firefox)** | Tampermonkey | Installabile dallo store del rispettivo browser |

### Passo 2: Installa lo Script
1. Clicca sul pulsante verde: **[INSTALLA MIRSEER ORA](https://raw.githubusercontent.com/lorenzomattei/MirSeer/main/mirseer.user.js)**
2. L'estensione aprirà automaticamente la schermata di verifica.
3. Clicca sul tasto **Installa** (o **Conferma installazione**).

### Passo 3: Utilizzo
1. Vai su [mircrew-releases.org](https://mircrew-releases.org) ed effettua l'accesso col tuo account.
2. In basso a destra comparirà il pulsante galleggiante circolare **🔮 MirSeer**.
3. Cliccaci sopra per aprire l'interfaccia catalogo.

---

## ⚙️ Configurazione TMDb (Opzionale)

MirSeer funziona nativamente senza chiavi esterne. Tuttavia, per abilitare i fondali ad alta risoluzione (Backdrop) e il recupero automatico della trama originale nei topic più datati, puoi inserire una API Key gratuita di TheMovieDatabase (TMDb):

1. Registra un account gratuito su [TheMovieDatabase (TMDb)](https://www.themoviedb.org/).
2. Vai su **Impostazioni > API** e genera una chiave personale (*API v3 auth*).
3. Apri la schermata impostazioni di MirSeer cliccando sull'icona ingranaggio ⚙️ dentro il catalogo.
4. Incolla la tua chiave nel campo **TMDb API Key** e clicca **Salva**.

---

## ❓ Domande Frequenti (FAQ) & Risoluzione Problemi

<details>
<summary><b>Non vedo i link Magnet o i bottoni di download in alcuni topic. Perché?</b></summary>
MirCrew Releases richiede di ringraziare nel topic (pulsante "Grazie" / pollice in su di phpBB) per sbloccare i contenuti protetti da tag <code>[hide]</code>. Se non hai ringraziato, lo script non può recuperare il magnet. Apri il topic, clicca "Grazie", torna nel catalogo e aggiorna la cache della scheda.
</details>

<details>
<summary><b>Lo script rallenta o non estrae le copertine.</b></summary>
Verifica che le estensioni AdBlocker (uBlock Origin, AdGuard) o firewall DNS (Pi-hole) non stiano bloccando host di immagini esterni (es. Postimages, ImgBB, TurboImageHost) spesso usati dai releaser.
</details>

<details>
<summary><b>MirSeer funziona da smartphone?</b></summary>
Sì! È sufficiente usare un browser mobile con supporto alle estensioni Chrome/Firefox come <b>Kiwi Browser</b> o <b>Firefox Mobile Nightly</b> con Tampermonkey installato.
</details>

<details>
<summary><b>Come aggiorno lo script?</b></summary>
Lo script si aggiorna in automatico in background ogni 24 ore. Per forzare l'aggiornamento immediato, apri la dashboard di Tampermonkey, individua "MirSeer" e seleziona <i>Operazioni > Verifica aggiornamenti</i>.
</details>

---

## 📝 Changelog

### Versione 20.0
- **New:** Architettura unificata per il caricamento asincrono parallelo dei subforum.
- **New:** Selettore multi-magnet con supporto per copia batch su qBittorrent.
- **Improvement:** Riconoscimento avanzato dei banner per releaser con bypass dei pattern grafici di gruppo.
- **Improvement:** Gestione del layout responsive ottimizzata per schermi ultrawide e display mobile.
- **Fix:** Risolto bug sul parsing dei titoli contententi parentesi quadre e risoluzioni multiple.

---

## 📄 Licenza

Distribuito sotto licenza **MIT**. Consulta il file [`LICENSE`](LICENSE) per ulteriori dettagli.

<div align="center">
  <sub>Realizzato per la community con dedizione e codice pulito. MirSeer non ospita file protetti da copyright: si limita a organizzare i metadati pubblici del forum.</sub>
</div>