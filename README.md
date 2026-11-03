# Turni La Falco

App web statica installabile (PWA) per visualizzare e modificare i turni importati dai PDF.

## Sviluppo

Non usa un framework, non richiede dipendenze o una fase di compilazione. Aprire `index.html` tramite un server statico locale oppure pubblicare direttamente la cartella.

## Pubblicazione su Cloudflare Pages (Git integration)

Impostazioni del progetto:

- **Production branch:** `main`
- **Framework preset:** `None`
- **Build command:** `exit 0`
- **Build output directory:** `.`
- **Root directory:** `/` (la root del repository)

Il file `index.html` deve restare nella root pubblicata.

Dopo aver collegato il repository da **Workers & Pages → Create application → Pages → Connect to Git**, Cloudflare Pages pubblicherà automaticamente i nuovi commit sul branch di produzione e creerà anteprime per i branch configurati.

> Nota: Cloudflare Pages non consente di convertire un progetto esistente da Direct Upload a Git integration. Se il progetto attuale è Direct Upload, crea un nuovo progetto Pages scegliendo Connect to Git. Potrai poi assegnargli il dominio personalizzato, se ne usi uno.

## Dati e privacy

- L'app legge i PDF nel browser: non li carica su un server.
- Nome, turni importati e modifiche vengono salvati nel `localStorage` del browser/dispositivo.
- Non inserire nel repository PDF dei turni, credenziali, token o altri dati personali.
- È consigliato mantenere privato il repository, anche perché contiene il marchio e le immagini dell'app.
