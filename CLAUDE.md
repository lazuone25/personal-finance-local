# MoneyTracking — Note pentru Claude

## Stack
- **Backend**: FastAPI + SQLAlchemy (SQLite) + APScheduler
- **Frontend**: React + Vite + TanStack Query + Recharts
- **Date manuale**: JSON files în `backend/` (extra_data.json, datorii_data.json, categories_data.json)
- **API bancară**: Enable Banking PSD2 (Revolut, ING, Raiffeisen)

## Structură fișiere cheie
```
backend/
  main.py                  — FastAPI app + routers
  routers/
    datorii.py             — datorii credit/card, rate, import PDF
    categories.py          — categorii tranzacții + owners + settled
    extra.py               — economii, fond urgență, transferuri
  services/
    sync_service.py        — sync bănci + job dobândă zilnică (00:01)
  extra_data.json          — solduri economii, fond urgență, cash
  datorii_data.json        — card credit Raiffeisen + credit Revolut
  categories_data.json     — categorii, reguli, overrides, owners, settled

frontend/src/
  pages/
    Dashboard.jsx          — sumar total + card Datorii
    Extra.jsx              — economii Revolut + fond urgență
    Datorii.jsx            — card credit + credit Revolut + rate
    Transactions.jsx       — tranzacții cu categorii + owner badge
    Statistici.jsx         — grafice + tab Categorii cu 3 pie charts
  api/hooks.js             — toate hook-urile TanStack Query
```

## Sesiunea 03.06.2026 — ce s-a implementat

### Pagina Datorii (completă)
- Stilul cardurilor: ca Extra (border stânga colorat, nu header colorat)
- **Card de credit Raiffeisen**: disponibil/limită cu bară de progres (verde→roșu), sub-cadrane pentru 3 rate (Rata 1/2/3) cu progress bar individual
- **Credit Revolut**: sold editabil, buton "+ Plată rată" cu istoric, dobândă acumulată calculată corect (rotunjire zilnică bancară cu `Math.round`), câmpuri DAE + rată dobândă separată
- **Import PDF raport Raiffeisen**: parser text dublat (artifact PDF), extrage rate și disponibil automat, preview înainte de aplicare
- Zi scadentă afișată ca "07 a lunii" (fără zecimale, cu padding 0)
- Dobânda acumulată la credit: calculată de la ultima zi scadentă, rotunjire zilnică bancară (`Math.round(sold * rata / 365 * 100) / 100 * zile`)

### Dashboard
- Cardul TBD → **Datorii** (roșu): credit Revolut sold + card Raiffeisen cheltuit + dobândă acumulată

### Extra — dobânzi
- Scăzut **10% impozit reținere la sursă** din dobânzile calculate
- Folosit **`Math.ceil`** (rotunjire în sus ca Revolut) pentru dobânda zilnică
- Display "Dobândă de la {data}: {sumă} RON" — data stocată în `interest_start_date`
- Counting inclusiv: ziua de start = zi 1
- **Job automat 00:01**: APScheduler adaugă dobânda zilnică în ambele solduri (extra_data.json)
- Butoanele "Adaugă la sold" eliminate — totul automat

### Categorii tranzacții (nou)
- **10 categorii**: Alimente, Transport, Utilități, Sănătate, Divertisment, Cumpărături, Restaurant & Cafenele, Rate & Datorii, Venituri, Facultate, Împrumuturi, Necategorizat
- Stocare în `categories_data.json`: `overrides` (manual per tx), `rules` (pattern auto), `owners`, `settled`
- **Tranzacții**: badge colorat categorie + badge owner (Andrei/Anca/Comun) per rând, dropdown `position: fixed` (nu e tăiat de tabel), se închide la scroll
- **Tranzacții Împrumuturi**: buton "Achitat" care exclude tranzacția din graficele de cheltuieli
- **Statistici → tab Categorii**: 3 pie charts separate (Andrei / Anca / Comun), selector de lună (default luna curentă), procente în interiorul feliilor (alb, nu se taie)

### Fixes diverse
- `maximumFractionDigits: 2` peste tot (niciodată 3 zecimale)
- Server backend restartat corect (2 instanțe duplicate eliminate)
- GitHub Pages dezactivat (nu e nevoie pentru app locală)
- Raiffeisen rate limit rezolvat prin reconectare OAuth

## Pattern-uri importante

### Calcul dobândă corect (ca banca)
Revolut rotunjește dobânda zilnică **în sus** (`ceil`) — observat 10.06.2026: Revolut
arăta 29542.54, app-ul nostru 29542.53 (app-ul rămăsese SUB Revolut). `ceil` e mai
aproape de comportamentul Revolut. NU folosi `round`/`floor` (ies prea mici). Frontend
și backend folosesc același `ceil`.
```js
// Frontend (Revolut folosește ceil)
const dailyNet = Math.ceil(sold * rata / 365 * 0.9 * 100) / 100
const total = dailyNet * zile

// Backend job (sync_service.py)
daily = math.ceil(balance * 0.03 / 365 * 0.9 * 100) / 100
```

### Dropdown peste tabel (nu tăiat de overflow)
```jsx
// position: fixed calculat din getBoundingClientRect()
// NU adăuga window.scrollY — fixed e relativ la viewport
const rect = ref.current.getBoundingClientRect()
setDropPos({ top: rect.bottom + 4, left: rect.left })
// + închide la scroll cu window.addEventListener('scroll', close, true)
```

### Filtrare transferuri interne
- Pattern-uri în `INTERNAL_PATTERNS` (Transactions.jsx + Statistici.jsx)
- Cross-account matching: același sumă ± 0.01, aceeași valută, ±3 zile, bănci diferite

### Per-bank sync interval
- Revolut/ING: 30 min
- Raiffeisen: 720 min (12h) — rate limit PSD2 strict
- Force sync: `POST /api/sync/{bank_name}`

## Bănci conectate
- **Revolut** (bank_connection_id=1): conturi RON, EUR, USD, comun
- **ING** (bank_connection_id=2): cont RON
- **Raiffeisen** (bank_connection_id=3): cont curent RON + EUR

## TODO / În așteptare
- Tradeville API — contract semnat 30.05.2026, credențiale în așteptare
- Import PDF Raiffeisen: parser calibrat pe formatul actual (text dublat, `text[::2]`)
- VPS deployment: nginx + systemd (când e nevoie)
