# MoneyTracking — Design Spec
**Data:** 2026-05-19

## Scop

Aplicație personală de tracking financiar care accesează conturi bancare reale (Revolut, ING, Raiffeisen) prin Enable Banking API (open banking). Afișează sold disponibil pe card, depozite, savings și tranzacții în timp real.

**Faza 1:** Server local (localhost)
**Faza 2:** Cloud-hosted, accesibil de oriunde

---

## Arhitectura generală

```
┌─────────────────┐         ┌──────────────────────┐         ┌─────────────────────┐
│  React Frontend  │ ──API── │   FastAPI Backend     │ ──JWT── │  Enable Banking API │
│  (localhost:5173)│         │   (localhost:8000)    │         │  (api.enablebanking │
└─────────────────┘         │                       │         │   .com)             │
                             │  SQLAlchemy ORM       │         └─────────────────────┘
                             │  SQLite (local)       │
                             │  PostgreSQL (cloud)   │
                             │  APScheduler (sync)   │
                             └──────────────────────┘
```

### Structura proiectului

```
moneytracking/
  backend/
    main.py
    database.py          # engine SQLAlchemy, SESSION, DB_URL din env
    models.py            # toate modelele SQLAlchemy
    routers/
      auth.py            # consent flow OAuth per bancă
      accounts.py        # solduri + conturi
      transactions.py    # tranzacții cu filtre
      sync.py            # trigger manual + status
    services/
      banking.py         # wrapper peste src/client.py
      sync.py            # APScheduler jobs
  frontend/
    src/
      pages/             # Dashboard, Accounts, Transactions, Settings
      components/
    package.json
  src/
    client.py            # existent — rămâne neschimbat
  docs/
  requirements.txt
  .env
```

---

## Modele de date (SQLAlchemy)

### `bank_connections`
| Coloană | Tip | Detalii |
|---------|-----|---------|
| id | Integer PK | |
| bank_id | String | ex. "REVOLT21" (BIC) |
| bank_name | String | ex. "Revolut" |
| session_id | String | ID sesiune Enable Banking — folosit la toate request-urile per user |
| connected_at | DateTime | |
| is_active | Boolean | false = deconectat |

> **Notă auth:** Enable Banking nu returnează un OAuth access_token separat. App-ul se autentifică cu JWT (în `src/client.py`), iar sesiunea utilizatorului e identificată exclusiv prin `session_id`.

### `accounts`
| Coloană | Tip | Detalii |
|---------|-----|---------|
| id | Integer PK | |
| bank_connection_id | FK → bank_connections | |
| external_id | String | ID din Enable Banking |
| iban | String | nullable |
| name | String | numele contului |
| currency | String | ex. "RON", "EUR" |
| type | Enum | `checking`, `savings`, `deposit`, `card` |

**Mapare tip cont Enable Banking → intern:**
- `CACC` → `checking`
- `SVGS` → `savings`
- `TERM` → `deposit`
- orice altceva → `other`

### `balances`
| Coloană | Tip | Detalii |
|---------|-----|---------|
| id | Integer PK | |
| account_id | FK → accounts | |
| amount | Numeric(15,2) | |
| currency | String | |
| last_updated | DateTime | overwrite la fiecare sync |

### `transactions`
| Coloană | Tip | Detalii |
|---------|-----|---------|
| id | Integer PK | |
| account_id | FK → accounts | |
| external_id | String UNIQUE | previne duplicate |
| amount | Numeric(15,2) | |
| currency | String | |
| description | String | |
| booking_date | Date | |
| value_date | Date | nullable |
| type | Enum | `debit`, `credit` |

---

## API Endpoints (FastAPI)

### Auth / Conectare bănci
```
GET    /api/banks                     → lista bănci disponibile RO
POST   /api/auth/connect/{bank_id}    → inițiază consent OAuth, returnează {redirect_url}
GET    /api/auth/callback             → callback de la bancă, salvează sesiunea + fetch conturi
GET    /api/connections               → bănci conectate + status
DELETE /api/connections/{id}          → deconectează bancă
```

### Conturi și solduri
```
GET    /api/accounts                  → toate conturile, grouped by bank + type
GET    /api/accounts/{id}/balance     → sold live fetchuit de la API
```

### Tranzacții
```
GET    /api/transactions              → toate tranzacțiile (filtre: bank_id, account_id, date_from, date_to, type)
GET    /api/accounts/{id}/transactions → tranzacții per cont
```

### Sync
```
POST   /api/sync                      → declanșează sync manual
GET    /api/sync/status               → {last_sync, next_sync, status per bancă}
```

---

## Fluxul OAuth (conectare bancă)

1. Frontend → `POST /api/auth/connect/REVOLT21`
2. Backend → Enable Banking `POST /auth` → primește `redirect_url`
3. Backend → returnează `{redirect_url}` frontend-ului
4. Frontend → deschide `redirect_url` în tab nou
5. Utilizatorul → se autentifică la bancă + aprobă accesul
6. Banca → redirectează la `http://localhost:8000/api/auth/callback?session_id=...`
7. Backend → salvează sesiunea în DB + fetchuiește conturile imediat
8. Frontend → polling pe `/api/connections` (la 3s) până apare banca → confirmă cu verde

---

## Sincronizare (APScheduler)

- **Interval:** configurabil prin `SYNC_INTERVAL_MINUTES` în `.env` (default: 5)
- **La fiecare sync:**
  1. Pentru fiecare `BankConnection` activă: fetch tranzacții noi + update balance
  2. Tranzacții: insert only dacă `external_id` nu există deja (fără duplicate)
  3. Balance: overwrite `balances` cu valoarea curentă
- **Sold curent:** fetchuit live la fiecare `GET /api/accounts/{id}/balance` (nu din cache)

---

## Frontend React

### Stack
- React + Vite
- TanStack Query (data fetching + cache)
- Recharts (grafice)

### Pagini
| Rută | Conținut |
|------|----------|
| `/` | Dashboard: total pe card, total depozite, total savings, ultimele 10 tranzacții, status sync |
| `/accounts` | Conturi grupate: Card / Savings / Depozite, sold per cont |
| `/transactions` | Tabel cu filtre: bancă, cont, perioadă, tip (debit/credit) |
| `/settings` | Bănci conectate, buton conectare bancă nouă, interval sync |

### Conectare bancă (din `/settings`)
1. Dropdown cu băncile disponibile
2. Click "Conectează" → tab nou cu URL bancă
3. Polling automat → confirmă când banca apare conectată

---

## Configurare `.env`

```
# Existent
ENABLE_BANKING_APP_ID=...
ENABLE_BANKING_PRIVATE_KEY_PATH=keys/...

# Nou
DATABASE_URL=sqlite:///./moneytracking.db   # local
# DATABASE_URL=postgresql://...             # cloud
SYNC_INTERVAL_MINUTES=5
REDIRECT_URI=http://localhost:8000/api/auth/callback
```

---

## Out of scope (Faza 1)

- Autentificare / login în aplicație
- Multi-user
- Notificări push
- Export CSV
- Deploy cloud (Faza 2)
