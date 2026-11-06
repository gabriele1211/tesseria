# Tesseria 1.0 — PWA portatessere

PWA statica per iPhone e Android. Le tessere sono salvate **solo nel localStorage del browser**. Non ci sono account, server applicativi, analytics o invii di tessere a GitHub.

## Funzioni
- Aggiungi, modifica, elimina e cerca tessere
- EAN-13, EAN-8, Code 39, ITF con verifica di formato e checksum EAN
- Fotocamera con BarcodeDetector dove disponibile; inserimento manuale altrove
- Backup JSON esportabile/importabile
- Cache offline tramite Service Worker
- Privacy, termini e note legali in app (bozze da completare)

## Pubblicazione GitHub Pages
1. Crea un repository pubblico `tesseria`.
2. Carica tutti i file **nella radice** del repository.
3. In Settings → Pages → Build and deployment scegli Deploy from a branch, branch `main`, folder `/ (root)`.
4. Apri `https://NOMEUTENTE.github.io/tesseria/` e installa dalla schermata del browser.

## Limiti importanti
- BarcodeDetector non è supportato da tutti i browser iOS/Android; su alcuni dispositivi la scansione da fotocamera non è disponibile. La lettura da schermo dipende dal lettore della cassa; laser tradizionali spesso non leggono display.
- Code 128 e QR non sono ancora implementati in questa versione: **non convertire** questi formati in altri senza verifica.
- Il controllo automatico della luminosità non è disponibile nelle comuni PWA.
- Il browser può eliminare i dati locali: esporta periodicamente il backup.
- GitHub Pages può trattare log tecnici e indirizzi IP; completare informativa privacy e dati del responsabile prima del lancio pubblico.
- Nome e marchio Tesseria da verificare prima di una distribuzione pubblica.

## Test suggeriti
Aprire da HTTPS, provare aggiunta tessera EAN-13 valida, lettura con imager della cassa, import/export, offline, installazione su iPhone e Android. La scansione con fotocamera va provata su dispositivi reali.
