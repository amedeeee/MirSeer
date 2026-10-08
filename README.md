<div align="center">
<img width="120" height="120" alt="Generated Image October 06, 2026 - 9_21PM (1)" src="https://github.com/user-attachments/assets/83a21e1f-a7ed-444d-afe1-e6ac8c9799ef" />

### Catalogo Multimediale di Nuova Generazione per MirCrew Releases

[![Version](https://img.shields.io/badge/version-1.3-blueviolet.svg?style=for-the-badge)](https://github.com/amedeeee/MirSeer/releases)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=for-the-badge)](https://opensource.org/licenses/MIT)
[![Tampermonkey Compatible](https://img.shields.io/badge/Tampermonkey-Compatibile-00485B.svg?style=for-the-badge&logo=tampermonkey)](https://www.tampermonkey.net/)
[![Platform: phpBB](https://img.shields.io/badge/Platform-phpBB-B22222.svg?style=for-the-badge&logo=phpbb)](https://mircrew-releases.org)

<p align="center">
  Trasforma l'esperienza di navigazione forum in un'interfaccia VOD fluida, elegante e reattiva in stile Netflix/Prime Video, integrata direttamente nel tuo browser.
</p>

---

### ⚡ INSTALLAZIONE RAPIDA IN 1 CLIC

[![Installa con Tampermonkey](https://img.shields.io/badge/⚡_INSTALLA_MIRSEER-CLICK_QUI-success?style=for-the-badge&logo=tampermonkey&logoColor=white)](https://raw.githubusercontent.com/amedeeee/MirSeer/main/mirseer.user.js)

*(Richiede un userscript manager attivo: Tampermonkey, Violentmonkey)*

---

</div>

## 🖼️ Anteprima Interfaccia

<div align="center">
  <img src="assets/preview-home.png" alt="MirSeer UI Showcase" width="90%" style="border-radius: 8px; box-shadow: 0 4px 20px rgba(0,0,0,0.5);" />
  <img src="assets/preview-modal.png" alt="MirSeer UI Showcase" width="90%" style="border-radius: 8px; box-shadow: 0 4px 20px rgba(0,0,0,0.5);" />
</div>

---

## ✨ Funzionalità Principali
- 🎬 Interfaccia Cinema (Lista & Griglia)
Trasforma il forum in un vero e proprio catalogo in stile Netflix/Plex. Layout immersivo in modalità Dark (Glassmorphism), Hero Carousel per i titoli in tendenza e libertà di scegliere tra la visualizzazione a lista classica o la nuova Vista a Griglia per le sole locandine.
- 🍿 Metadati Avanzati, Voti & Trailer (Integrazione TMDb/IMDb)
Algoritmo intelligente che bypassa banner, userbar e firme dei releaser per estrarre i dati reali. Arricchisce i post con locandine in HD, trame ripulite, valutazioni medie, generi e ti permette di riprodurre i Trailer YouTube in un player a comparsa senza mai uscire dalla pagina.
- ⬇️ Automazione Torrent & WebUI Integrata
Gestione granulare dei Magnet link (episodio per episodio o intere stagioni). Oltre alla "Copia Rapida", ora puoi inviare i download direttamente a qBittorrent o Transmission con un clic, smistandoli automaticamente nelle tue cartelle di destinazione (es. /Media/Film o /Media/SerieTV).
- ⭐ Libreria Personale (Preferiti & Scaricati)
Tieni traccia delle tue preferenze senza limiti. Salva le release nella tua lista Preferiti per un accesso rapido e usa il marcatore visivo "Scaricato" (✓) per ricordarti cosa hai già inviato al tuo client torrent. Database locale ultra-veloce basato su IndexedDB.
- 🔍 Ricerca Universale & Filtri Rapidi
Motore di ricerca istantaneo (globale o per singola sezione) attivabile con scorciatoie da tastiera. Trova esattamente ciò che vuoi grazie ai Filtri Rapidi (facets) per isolare con un clic contenuti 4K UHD, HDR/Dolby Vision, Audio ITA o Stagioni Complete.

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
1. Clicca sul pulsante verde: **[INSTALLA MIRSEER ORA](https://raw.githubusercontent.com/amedeeee/MirSeer/main/mirseer.user.js)**
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

## 📄 Licenza

Distribuito sotto licenza **MIT**. Consulta il file [`LICENSE`](LICENSE) per ulteriori dettagli.

<div align="center">
  <sub>Realizzato per la community con dedizione e codice pulito. MirSeer non ospita file protetti da copyright: si limita a organizzare i metadati pubblici del forum.</sub>
</div>
