# Setup Sincronizzazione Cloud (Supabase)

Guida per attivare la sincronizzazione tra computer, iPad, iPhone. ~10 minuti.

> **Facoltativo:** se non fai questo setup l'app funziona come prima (dati solo nel browser del device corrente). Nessuna regressione.

---

## Passo 1 — Account Supabase (gratis)

1. Vai su **https://supabase.com** → **Start your project**
2. Accedi con **GitHub** (consigliato) o email
3. Nessuna carta di credito richiesta

## Passo 2 — Nuovo progetto

1. Dashboard → **New Project**
2. Campi:
   - **Name:** `hotel-bar-pos`
   - **Database Password:** generane una sicura (Supabase la gestisce per te, ma salvala)
   - **Region:** `Central EU (Frankfurt)` (più vicina all'Italia)
   - **Plan:** Free
3. **Create new project** → aspetta ~2 minuti

## Passo 3 — Crea la tabella

1. Menu a sinistra → **SQL Editor** → **New query**
2. Incolla:

```sql
create table if not exists public.pos_state (
  id         text primary key,
  data       jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.pos_state disable row level security;

alter publication supabase_realtime add table public.pos_state;
```

3. **Run** (`Ctrl`/`Cmd` + `Enter`)
4. Risultato atteso: `Success. No rows returned`

## Passo 4 — Copia le due credenziali

1. Menu a sinistra (in basso) → **Project Settings** (ingranaggio) → **API**
2. Ti servono due valori:
   - **Project URL** — es. `https://abcdefghij.supabase.co`
   - **Project API Keys → anon public** — stringa lunga che inizia con `eyJ...`

## Passo 5 — Crea `supabase-config.js`

Nella cartella del progetto:

1. Apri `supabase-config.example.js`
2. **Salva con nome** → `supabase-config.js` (togli `.example`)
3. Apri il nuovo file e incolla i due valori:

```js
window.SUPABASE_CONFIG = {
  url:     'https://abcdefghij.supabase.co',
  anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6...'
};
```

4. Salva

## Passo 6 — Pubblica su GitHub

**Importante: devi committare `supabase-config.js` nel repo**, altrimenti il telefono non lo riceverà quando apre il sito da GitHub Pages.

Apri `.gitignore` e **cancella** (o commenta con `#`) questa riga:

```
supabase-config.js
```

Poi:

```bash
git add .
git commit -m "Aggiunta sincronizzazione cloud Supabase"
git push
```

Dopo 1-2 minuti GitHub Pages aggiorna il sito su tutti i device.

### "Ma così la anon key diventa pubblica sul repo!"

Sì, ed è **voluto**:

- La **anon key** di Supabase è progettata per stare nel JS del browser — è la stessa cosa che fa qualsiasi app web che usa Supabase. Non è una "password segreta".
- Chi apre il tuo sito e ispeziona il codice può comunque vederla — che sia su repo o meno. Serve solo perché il browser possa parlare col tuo DB specifico.
- Sul tuo caso: l'URL del sito non è indicizzato da Google (GitHub Pages mette `noindex` per default), e i dati sono prezzi/stanze/ordini — niente di sensibile (niente carte di credito).
- Peggior caso realistico: qualcuno trova l'URL del tuo sito e modifica prezzi. Tu ripristini dal backup JSON (funzione già presente: **Impostazioni → Esporta backup**) e rigeneri una nuova anon key su Supabase.

**Se vuoi più sicurezza** hai due strade:
- **GitHub Pro** (~$4/mese) — repo privato ma Pages resta accessibile
- **Login utente** — aggiungo una password all'app. Dimmi se lo vuoi.

Per un bar alberghiero gestito internamente, la configurazione semplice va bene.

---

## Verifica

1. Apri l'app sul computer (dopo che GitHub Pages ha aggiornato)
2. Vai in **Impostazioni** — dovresti vedere il toast **"Sincronizzazione cloud attiva ☁️"**
3. Aggiungi una stanza di prova (es. `999`)
4. Apri l'app sul telefono → la stanza `999` compare entro 1-2 secondi ✓

### Diagnostica

Apri la console del browser (F12 → Console) e cerca i messaggi `[POSSync]`:

| Messaggio | Cosa significa |
|---|---|
| `Supabase non configurato — app in modalità locale` | `supabase-config.js` non caricato o con placeholder |
| `Libreria @supabase/supabase-js non caricata` | Problema CDN — ricarica la pagina |
| `pull error` / `push error` | URL o anon key sbagliati, oppure tabella non creata |
| `realtime connesso ☁️` | Tutto ok ✓ |

---

## Comportamento offline

- L'app continua a funzionare con `localStorage` come cache locale
- Appena torna la rete, la prossima modifica si sincronizza automaticamente
- ⚠️ Se **due device** modificano cose offline in contemporanea, vince l'ultimo che torna online (ultimo-ad-arrivare). Per un bar con una sola postazione attiva non è un problema — se prevedi uso simultaneo su più device offline, fammelo sapere e implemento un merge più intelligente.

## Costi

Piano gratuito Supabase:
- 500 MB DB (userai <5 MB anche in anni)
- 5 GB traffico/mese
- Realtime incluso

Starai nel free tier senza sforzi.
