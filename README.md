<div align="center">



\# 🔮 MirSeer



\### Catalogo Multimediale di Nuova Generazione per MirCrew



\[!\[Version](https://img.shields.io/badge/version-1.0-blueviolet.svg?style=for-the-badge)](https://github.com/amedeeee/MirSeer/releases)

\[!\[License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=for-the-badge)](LICENSE)

\[!\[Tampermonkey Compatible](https://img.shields.io/badge/Tampermonkey-Compatibile-00485B.svg?style=for-the-badge\&logo=tampermonkey)](https://www.tampermonkey.net/)

\[!\[Platform: phpBB](https://img.shields.io/badge/Platform-phpBB-B22222.svg?style=for-the-badge\&logo=phpbb)](https://mircrew-releases.org)



<p align="center">

&#x20; Trasforma l'interfaccia a forum di <b>mircrew-releases.org</b> in un'applicazione moderna a schermo intero in stile Netflix / VOD, con navigazione reattiva, estrazione dati in tempo reale e gestione integrata dei magnet link.

</p>



\---



\### ⚡ INSTALLAZIONE RAPIDA IN 1 CLIC



\[!\[Installa con Tampermonkey](https://img.shields.io/badge/⚡\_INSTALLA\_MIRSEER-CLICK\_QUI-success?style=for-the-badge\&logo=tampermonkey\&logoColor=white)](https://raw.githubusercontent.com/amedeeee/MirSeer/main/mirseer.user.js)



\*(Richiede un userscript manager attivo nel browser)\*



\---



</div>



\## 📸 Anteprima



<div align="center">

&#x20; <img src="assets/preview-home.png" alt="MirSeer UI Showcase" width="92%" style="border-radius: 8px; box-shadow: 0 8px 30px rgba(0,0,0,0.6);" />

</div>



\---



\## ✨ Funzionalità



\- 🎬 \*\*Interfaccia Cinema a Schermo Intero:\*\* Modalità scura moderna basata su Glassmorphism, con navigazione rapida e zero impatto sulle pagine originali del forum.

\- 🗂️ \*\*17 Sezioni Native Mappate:\*\*

&#x20; - Film (`fid: 26`), Serie TV (`fid: 28`), Documentari (`fid: 29`), TV Show (`fid: 30`), Teatro (`fid: 31`), Videocorsi (`fid: 63`)

&#x20; - Anime Movies (`fid: 34`), Anime Series (`fid: 35`), Cartoon Movies (`fid: 36`), Cartoon Series (`fid: 37`)

&#x20; - EBooks (`fid: 40`), ABooks (`fid: 41`), Comics (`fid: 42`), Edicola (`fid: 43`)

&#x20; - Musica Audio (`fid: 46`), Musica Video (`fid: 47`), Games PC (`fid: 66`)

&#x20; - \*Auto-discovery dinamica:\* sezioni e sottoforum vengono indicizzati leggendo l'indice del forum in automatico.

\- 🎠 \*\*Hero Carousel Interattivo:\*\* Banner superiore dinamico con le release più in tendenza, calcolo euristico della popolarità, rotazione automatica e pausa istantanea al passaggio del cursore (`hover` / `focus`).

\- 🖼️ \*\*Algoritmo Scelta Locandine:\*\* Riconoscimento intelligente delle immagini che gestisce copertine verticali (2:3), orizzontali (16:9) e quadrate, scartando rank utente, firme, avatar, gif animate e banner promozionali dei releaser.

\- 🧲 \*\*Gestione Magnet Avanzata (Multi-Episodio):\*\*

&#x20; - Parsing automatico di stagioni ed episodi con copia singola in un clic.

&#x20; - Tasto \*\*"Copia Tutti i Magnet"\*\* formattato riga per riga per l'incollo di massa su client come \*\*qBittorrent\*\*, Transmission o Deluge.

&#x20; - Sblocco automatico del tag protetto `\[hide]` interagendo con il sistema di ringraziamento (Thanks) di phpBB.

\- 🧹 \*\*Pulizia Sinossi:\*\* Rimozione di divisori ASCII decorativi (`-=-=-=-`), firme e blocchi Mediainfo ridondanti per mostrare la trama in formato leggibile.

\- 🔍 \*\*Ricerca Contestuale \& Globale:\*\* Ricerca immediata filtrabile per singola sezione o estesa a tutto il forum con risultati suddivisi e ordinati per categoria.

\- 📊 \*\*Metriche e Ordinamento:\*\* Filtro rapido per più recenti, più visti (con conteggio visite reale del forum `👁️`), ordine alfabetico (A-Z) e numero di risposte.



\---



\## 🚀 Guida all'Installazione



\### 1. Installa un gestore Userscript

Installa Tampermonkey sul tuo browser principale:



| Browser | Estensione Consigliata | Link |

| :--- | :--- | :--- |

| \*\*Google Chrome / Brave\*\* | Tampermonkey | \[Chrome Web Store](https://chromewebstore.google.com/detail/tampermonkey/dhdgffkkebhmkfjojejmpbldmpobfkfo) |

| \*\*Mozilla Firefox\*\* | Tampermonkey | \[Firefox Add-ons](https://addons.mozilla.org/it/firefox/addon/tampermonkey/) |

| \*\*Microsoft Edge\*\* | Tampermonkey | \[Edge Add-ons](https://microsoftedge.microsoft.com/addons/detail/tampermonkey/iikmkjmpaadaobahmlepeloendndfphd) |

| \*\*Android (Kiwi / Firefox)\*\* | Tampermonkey | Disponibile negli addon del rispettivo browser |



\### 2. Installa MirSeer

1\. Fai clic su: \*\*\[INSTALLA IL SCRIPT ORA](https://raw.githubusercontent.com/amedeeee/MirSeer/main/mirseer.user.js)\*\*

2\. Tampermonkey rileverà il file e aprirà una scheda di anteprima.

3\. Clicca su \*\*Installa\*\* (o \*\*Conferma installazione\*\*).



\### 3. Avvio

1\. Vai su \[mircrew-releases.org](https://mircrew-releases.org) ed esegui l'accesso.

2\. In basso a destra comparirà il pulsante galleggiante circolare \*\*🔮 MirSeer\*\*.

3\. Cliccaci sopra per aprire l'interfaccia.



\---



\## ⚙️ Configurazione TMDb (Opzionale)



MirSeer funziona subito senza alcuna configurazione. Se desideri integrare i fondali ad alta risoluzione (Backdrop) e recuperare trame mancanti nei topic più vecchi:



1\. Registra un account gratuito su \[TheMovieDatabase (TMDb)](https://www.themoviedb.org/).

2\. Vai su \*\*Impostazioni > API\*\* e copia la tua \*\*API Key v3\*\*.

3\. Apri la dashboard di Tampermonkey, clicca su \*\*MirSeer\*\* e modifica la riga 20 inserendo la tua chiave:

&#x20;  ```javascript

&#x20;  const TMDB\_API\_KEY = 'la\_tua\_api\_key\_qui';

