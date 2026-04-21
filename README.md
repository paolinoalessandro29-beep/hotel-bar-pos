# Bar POS — Hotel

POS web app per bar alberghiero. Nessun backend, dati salvati nel browser (localStorage). Deployabile su GitHub Pages.

## Funzionalità

**Cassa**
- Griglia articoli con categorie colorate (auto-rilevate dal nome categoria)
- Ricerca e filtro per categoria
- Carrello con quantità ± e rimozione
- Checkout con selezione camera (64 camere preconfigurate) e metodo di pagamento (22 metodi preconfigurati)

**Report**
- KPI: Incasso, Ordini, Scontrino medio, Camere addebitate / Omaggi
- Confronto con periodo precedente (oggi vs ieri)
- Grafico per fascia oraria (oggi/ieri) o per giorno (7 giorni / mese)
- Top articoli venduti
- Distribuzione metodi di pagamento
- Ultimi ordini (tappabili per aprire il dettaglio)
- Filtri periodo: Oggi / Ieri / 7 giorni / Mese
- Esportazione CSV compatibile Excel italiano (separatore `;`, BOM UTF-8)

**Omaggio**
- Metodo di pagamento speciale "Omaggio" già presente di default
- Gli ordini Omaggio **non contribuiscono all'incasso** ma vengono tracciati separatamente
- Il report mostra una KPI dedicata "Omaggi" con numero e valore totale offerto
- Il metodo Omaggio non può essere eliminato dalle impostazioni

**Storico ordini**
- Lista completa con filtro (camera, metodo, articolo, data)
- Dettaglio ordine completo
- **Eliminazione ordine** con conferma (per correggere errori di battitura o ordini inseriti per sbaglio)

**Gestione articoli**
- Aggiungi / modifica / elimina voci di listino
- Categoria libera (auto-suggerita da articoli esistenti)

**Impostazioni**
- Aggiungi / rimuovi camere
- Aggiungi / rimuovi metodi di pagamento
- Export / Import backup completo (JSON)
- Reset storico o reset totale

## Usage su iPad / iPhone

1. Apri il sito in Safari
2. Tocca il pulsante Condividi
3. "Aggiungi alla schermata Home"

L'app apparirà come una normale app (senza barra Safari), a schermo intero.

**Importante:** i dati sono salvati nello `localStorage` del browser. Se cancelli la cronologia di Safari, **cancellerai anche i dati dell'app**. Fai backup regolari da `Impostazioni → Esporta backup`.

## Deploy su GitHub Pages (3 minuti)

```bash
# Nella cartella del progetto
cd hotel-bar-pos
git init
git add .
git commit -m "Initial commit"
git branch -M main

# Crea un repo vuoto su github.com (senza README), poi:
git remote add origin https://github.com/TUO-USERNAME/hotel-bar-pos.git
git push -u origin main
```

Poi su GitHub:

1. Vai su **Settings → Pages**
2. Sotto "Source" seleziona **Deploy from a branch**
3. Branch: `main`, cartella: `/ (root)` → **Save**
4. Dopo 1-2 minuti il sito sarà online su:
   `https://TUO-USERNAME.github.io/hotel-bar-pos/`

## Struttura file

```
hotel-bar-pos/
├── index.html      # Struttura pagina, modali, SVG icone
├── styles.css      # Stile completo
├── app.js          # Logica applicazione
├── README.md       # Questo file
└── .gitignore
```

Nessuna dipendenza esterna (solo Google Fonts da CDN). Nessun build step. Modifica i file direttamente e il push aggiorna il sito.

## Dati di default

- **64 camere:** 101–112, 113–116, 118–121, 201–212, 214–216, 218–246
- **22 metodi di pagamento:** Contanti, POS INTESA, POS BCC, POS 3–5, Nexi, Paypal, Stripe (4 varianti), Intesa Sanpaolo Booking/Bonifico, BCC bonifico, Banca 3, Assegno, Vaglia Postale, Bonus Vacanze, Commissione OTA, Compensato con Nota di Credito, **Omaggio**
- **21 articoli di esempio** (caffetteria, cocktail, vini, birre, bibite, snack)

Tutti modificabili da `Impostazioni` e `Articoli`.

## Backup consigliato

Fai export del backup settimanalmente da **Impostazioni → Esporta backup**. Il file JSON contiene articoli, camere, metodi e tutto lo storico ordini. Puoi importarlo su un altro dispositivo per avere i dati sincronizzati.

## Sincronizzazione cloud (opzionale)

L'app supporta sincronizzazione automatica tra device tramite **Supabase** (gratis). Se configurata, ogni modifica fatta su un device compare sugli altri entro ~1-2 secondi (cassa, articoli, camere, metodi di pagamento, storico ordini).

Vedi **`SETUP-SUPABASE.md`** per la guida passo-passo (~10 minuti).

Se non la configuri, l'app funziona come prima (dati solo nel browser del device corrente).
