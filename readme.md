# Turni La Falco 🦅

Un'applicazione web per la gestione, l'organizzazione e la visualizzazione dei turni del personale per l'agenzia La Falco.

## 📋 Descrizione

Questo progetto fornisce un'interfaccia semplice e intuitiva per gestire i turni di lavoro. Grazie all'integrazione di tecnologie web moderne, l'applicazione permette di caricare, leggere e organizzare i dati relativi alle assegnazioni del personale, facilitando la comunicazione e la pianificazione operativa.

## 🚀 Funzionalità Principali

* **Interfaccia Web Intuitiva:** Sviluppata con HTML, CSS e JavaScript puro per garantire velocità e reattività.

* **Supporto PDF:** Integrazione con `pdf.js` per la lettura, il parsing o l'esportazione dei documenti relativi ai turni.

* **Progressive Web App (PWA):** Grazie al `manifest.webmanifest` e al Service Worker (`sw.js`), l'app può essere installata sui dispositivi mobili e supporta funzionalità di caching offline.

* **Parsing dei Dati:** Modulo dedicato (`parser.js`) per l'elaborazione delle informazioni sui turni.

## 🛠️ Tecnologie Utilizzate

* **Frontend:** HTML5, CSS3, JavaScript (Vanilla)

* **Librerie Esterne:** [PDF.js](https://mozilla.github.io/pdf.js/) per la gestione dei file PDF.

* **PWA:** Service Workers, Web Manifest.

## ⚙️ Installazione e Utilizzo

L'applicazione è ospitata online ed è pronta all'uso. Non è necessaria alcuna installazione di codice sul proprio dispositivo.

1. **Accedi all'applicazione:** Apri il seguente link nel tuo browser (da PC o smartphone):
   <https://turni-la-falco.pages.dev/>

2. **Segui le istruzioni:** Una volta aperta la pagina, segui le istruzioni guidate presenti a schermo per utilizzare il sistema e visualizzare o caricare i turni.

## 📁 Struttura del Progetto

* `index.html`: Pagina principale dell'applicazione.

* `style.css`: Fogli di stile per l'interfaccia utente.

* `app.js` / `config.js`: Logica principale dell'applicazione e configurazioni.

* `parser.js`: Script dedicato all'elaborazione e formattazione dei dati dei turni.

* `pdf.min.mjs` / `pdf.worker.min.mjs`: Script della libreria PDF.js.

* `sw.js` / `manifest.webmanifest`: File necessari per la Progressive Web App.

## 🤝 Contribuire

Se desideri contribuire al progetto, sentiti libero di aprire una *Issue* per segnalare bug o proporre nuove funzionalità, oppure crea una *Pull Request* con le tue modifiche.

## 📝 Licenza

**Codice Proprietario - Uso Interno Riservato**

Questo repository e il relativo codice sorgente sono di proprietà esclusiva. Tutti i diritti sono riservati. L'uso, la copia, la modifica, la distribuzione o la condivisione di questo software sono strettamente limitati all'uso interno da parte del personale autorizzato. Nessuna parte di questo codice può essere riprodotta o trasmessa a terzi senza esplicita autorizzazione.