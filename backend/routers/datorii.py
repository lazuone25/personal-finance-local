from fastapi import APIRouter, UploadFile, File, HTTPException
import json
import math
import pathlib
import uuid
import re
import io
from datetime import date, datetime

router = APIRouter()

DATORII_FILE = pathlib.Path(__file__).parent.parent / "datorii_data.json"

DEFAULT_DATA = {
    "credit_revolut": {
        "sold_curent": 0.0,
        "limita": 0.0,
        "dobanda": 0.0,
        "zi_scadenta": 1,
        "plata_minima": 0.0,
        "payments": [],
    },
    "card_raiffeisen": {
        "sold_curent": 0.0,
        "limita": 10000.0,
        "dobanda": 0.0,
        "zi_scadenta": 1,
        "plata_minima": 0.0,
        "payments": [],
    },
}


def _recalculate_rata(account: dict) -> dict:
    """Recalculează plata_minima după formula de anuitate dacă există data_expirare și rata_dobanzii."""
    expirare = account.get("data_expirare")
    rata_anuala = account.get("rata_dobanzii", 0)
    sold = account.get("sold_curent", 0)
    zi_scadenta = int(account.get("zi_scadenta", 1))
    if not expirare or not rata_anuala or not sold:
        return account

    today = date.today()
    expiry = date.fromisoformat(expirare)

    # Next scadenta
    try:
        next_scad = today.replace(day=zi_scadenta)
    except ValueError:
        next_scad = today.replace(day=1)
    if next_scad <= today:
        m = next_scad.month + 1 if next_scad.month < 12 else 1
        y = next_scad.year if next_scad.month < 12 else next_scad.year + 1
        try:
            next_scad = next_scad.replace(year=y, month=m)
        except ValueError:
            next_scad = next_scad.replace(year=y, month=m, day=1)

    # Luni rămase de la next_scad până la expiry (inclusiv)
    n = (expiry.year - next_scad.year) * 12 + (expiry.month - next_scad.month) + 1
    if n <= 0:
        return account

    r = rata_anuala / 100 / 12
    factor = (1 + r) ** n
    pmt = round(sold * r * factor / (factor - 1), 2)
    account["plata_minima"] = pmt
    return account


def load_data() -> dict:
    if DATORII_FILE.exists():
        with open(DATORII_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    return {k: dict(v) for k, v in DEFAULT_DATA.items()}


def save_data(data: dict):
    with open(DATORII_FILE, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False)


@router.get("/datorii")
def get_datorii():
    return load_data()


@router.put("/datorii/{account_id}")
def update_datorii(account_id: str, payload: dict):
    data = load_data()
    if account_id not in data:
        data[account_id] = dict(DEFAULT_DATA.get(account_id, {}))
    for key in ("sold_curent", "limita", "dobanda", "rata_dobanzii", "zi_scadenta", "plata_minima", "data_referinta", "data_expirare"):
        if key in payload:
            data[account_id][key] = payload[key]
    if "sold_curent" in payload or "rata_dobanzii" in payload:
        data[account_id] = _recalculate_rata(data[account_id])
    save_data(data)
    return data


@router.post("/datorii/{account_id}/payments")
def add_payment(account_id: str, payment: dict):
    data = load_data()
    if account_id not in data:
        data[account_id] = dict(DEFAULT_DATA.get(account_id, {}))
    if "payments" not in data[account_id]:
        data[account_id]["payments"] = []
    payment["id"] = str(uuid.uuid4())
    payment["date"] = payment.get("date", datetime.now().strftime("%Y-%m-%d"))
    amount = float(payment.get("amount", 0))

    sold = data[account_id]["sold_curent"]

    # Pentru credit_revolut: opțional adaugă dobânda acumulată de la ultima scadență
    if account_id == "credit_revolut" and payment.get("include_dobanda", False):
        rata = data[account_id].get("rata_dobanzii", 0) / 100
        zi_scadenta = int(data[account_id].get("zi_scadenta", 1))
        today = date.today()
        try:
            candidate = today.replace(day=zi_scadenta)
        except ValueError:
            candidate = today.replace(day=1)
        if candidate > today:
            m = today.month - 1 or 12
            y = today.year if today.month > 1 else today.year - 1
            try:
                candidate = candidate.replace(year=y, month=m)
            except ValueError:
                candidate = today
        zile = (today - candidate).days
        dobanda_zilnica = round(sold * rata / 365 * 100) / 100
        dobanda_acumulata = round(dobanda_zilnica * zile, 2)
        payment["dobanda_inclusa"] = dobanda_acumulata
        sold = round(sold + dobanda_acumulata, 2)

    data[account_id]["sold_curent"] = round(sold - amount, 2)
    data[account_id] = _recalculate_rata(data[account_id])
    data[account_id]["payments"].insert(0, payment)
    save_data(data)
    return data


@router.put("/datorii/{account_id}/installments/{installment_id}")
def update_installment(account_id: str, installment_id: str, payload: dict):
    data = load_data()
    installments = data.get(account_id, {}).get("installments", [])
    for inst in installments:
        if inst["id"] == installment_id:
            for key in ("name", "total", "paid", "paid_count", "total_count"):
                if key in payload:
                    inst[key] = payload[key]
    save_data(data)
    return data


@router.post("/datorii/card_raiffeisen/import-pdf")
async def import_pdf(file: UploadFile = File(...)):
    try:
        import pdfplumber
    except ImportError:
        raise HTTPException(status_code=500, detail="pdfplumber not installed")

    content = await file.read()
    text_pages = []
    with pdfplumber.open(io.BytesIO(content)) as pdf:
        for page in pdf.pages:
            t = page.extract_text()
            if t:
                text_pages.append(t)

    # Apply deduplication per-page (not on joined text) to avoid alignment drift
    cleaned_pages = []
    for page_text in text_pages:
        # Try [::2] and [1::2]; pick whichever produces more readable text
        a = page_text[::2]
        b = page_text[1::2]
        # Heuristic: more lowercase letters = better alignment
        score_a = sum(1 for c in a if c.islower())
        score_b = sum(1 for c in b if c.islower())
        cleaned_pages.append(a if score_a >= score_b else b)

    cleaned = "\n".join(cleaned_pages)

    parsed, disponibil = _parse_raiffeisen_installments(cleaned)

    # Fallback: search raw doubled text if nothing found
    if not parsed:
        raw = "\n".join(text_pages)
        parsed, disponibil = _parse_raiffeisen_installments_doubled(raw)

    return {"parsed": parsed, "disponibil": disponibil}


def _parse_raiffeisen_installments_doubled(text: str):
    """
    Parse doubled Raiffeisen PDF text directly.
    In doubled text: 'Plata In Rate' → 'PPllaattaa IInn RRaattee'
                     '10/12'         → '1100//1122'  (slash also doubled)
                     '-63,42'        → '--6633,,4422'
    """
    results = []

    # Disponibil: look for doubled pattern or plain
    # "ă" renders as backtick (`) in this PDF — use \S* to handle any encoding
    m = re.search(
        r'ssuummaa\s+nneeuuttiilliizzaatt\S{0,4}\s+llaa\s+[\d.\s]+\s+([\d.,]+)\s+lleeii',
        text, re.IGNORECASE
    )
    if not m:
        m = re.search(r'suma\s+neutilizat\S{0,2}\s+la\s+[\d.]+\s+([\d.,]+)\s+lei', text, re.IGNORECASE)
    disponibil = _ro_num(m.group(1)) if m else None

    # Match: "PPllaattaa IInn RRaattee // ... 1100//1122 ... --6633,,4422"
    # The "// merchant" separator stays as "//" (not quadrupled), digits are doubled.
    # Note: between the fraction (1100//1122) and the amount (--6633,,4422) there can
    # be ~100+ chars (e.g. ", Bucuresti //rambursare in 12 rate fixe fara dobanda ").
    pattern = re.compile(
        r'PP?ll?aa?tt?aa?\s+II?nn?\s+RR?aa?tt?ee?\s*'
        r'(?://\s*)+'                          # separator (// or ////)
        r'(?P<merchant>[^\n]+?)\s+'
        r'(?P<num>\d{2,4})//(?P<den>\d{2,4})' # e.g. 1100//1122
        r'[^-\n]*?--(?P<amount>[\d]+[.,][\d,]+)',  # e.g. --6633,,4422
        re.IGNORECASE
    )

    seen = set()
    for match in pattern.finditer(text):
        num_raw = match.group("num")       # "1100"
        den_raw = match.group("den")       # "1122"
        amt_raw = match.group("amount")    # "6633,,4422"
        merchant_raw = match.group("merchant").strip()

        current = int(num_raw[::2])
        total_count = int(den_raw[::2])
        monthly = _ro_num(amt_raw[::2])
        merchant = merchant_raw[::2] if len(merchant_raw) > 6 else merchant_raw

        key = (current, total_count, round(monthly, 2))
        if key in seen or monthly < 1:
            continue
        seen.add(key)

        results.append({
            "id": f"rata{len(results)+1}",
            "name": f"Rata {len(results)+1}",
            "desc": merchant,
            "total": round(monthly * total_count, 2),
            "monthly": monthly,
            "paid_count": current,
            "total_count": total_count,
            "paid": round(monthly * current, 2),
        })

    results.sort(key=lambda x: (-x["total"], -x["paid_count"]))
    for i, r in enumerate(results):
        r["id"] = f"rata{i+1}"
        r["name"] = f"Rata {i+1}"

    return results, disponibil


def _ro_num(s: str) -> float:
    """Parse Romanian number format: 1.234,56 → 1234.56"""
    s = s.strip().lstrip('-').replace(".", "").replace(",", ".")
    try:
        return float(s)
    except ValueError:
        return 0.0


def _parse_raiffeisen_installments(text: str):
    """
    Parse Raiffeisen credit card statement (after deduplication).
    Looks for 'Plata In Rate // ... XX/YY, ... -amount' transaction lines.
    Also extracts 'suma neutilizata' (disponibil) from the header.
    """
    results = []

    # Extract disponibil: "suma neutilizata la DD.MM.YYYY X.XXX,XX lei"
    disponibil = None
    m = re.search(r'suma\s+neutilizata\s+la\s+[\d.]+\s+([\d.,]+)\s+lei', text, re.IGNORECASE)
    if m:
        disponibil = _ro_num(m.group(1))

    # Match installment payment lines:
    # "Plata In Rate // www.emag.ro 04/12, Bucuresti //rambursare in 12 rate fixe fara dobanda -189,92"
    pattern = re.compile(
        r'Plata\s+In\s+Rate\s*//\s*(?P<merchant>[^/\n]+?)\s+(?P<current>\d{1,2})/(?P<total_count>\d{1,2})'
        r'[^-\n]*?-(?P<amount>[\d.,]+)',
        re.IGNORECASE
    )

    seen = set()
    for match in pattern.finditer(text):
        current = int(match.group("current"))
        total_count = int(match.group("total_count"))
        monthly = _ro_num(match.group("amount"))
        merchant = match.group("merchant").strip().rstrip(",")

        key = (current, total_count, round(monthly, 2))
        if key in seen:
            continue
        seen.add(key)

        total = round(monthly * total_count, 2)
        paid = round(monthly * current, 2)

        results.append({
            "id": f"rata{len(results)+1}",
            "name": f"Rata {len(results)+1}",
            "desc": merchant,
            "total": total,
            "monthly": monthly,
            "paid_count": current,
            "total_count": total_count,
            "paid": paid,
        })

    # Sort by total_count desc then current desc for consistent ordering
    results.sort(key=lambda x: (-x["total"], -x["paid_count"]))
    for i, r in enumerate(results):
        r["id"] = f"rata{i+1}"
        r["name"] = f"Rata {i+1}"

    return results, disponibil


@router.post("/datorii/card_raiffeisen/import-pdf/apply")
def apply_import(payload: dict):
    data = load_data()
    installments = payload.get("installments", [])
    disponibil = payload.get("disponibil")

    data["card_raiffeisen"]["installments"] = [
        {
            "id": inst.get("id", f"rata{i+1}"),
            "name": inst.get("name", f"Rata {i+1}"),
            "total": inst.get("total", 0),
            "paid": inst.get("paid", 0),
            "paid_count": inst.get("paid_count", 0),
            "total_count": inst.get("total_count", 12),
        }
        for i, inst in enumerate(installments)
    ]
    if disponibil is not None:
        data["card_raiffeisen"]["sold_curent"] = disponibil

    save_data(data)
    return data


@router.delete("/datorii/{account_id}/payments/{payment_id}")
def delete_payment(account_id: str, payment_id: str):
    data = load_data()
    payments = data.get(account_id, {}).get("payments", [])
    p = next((x for x in payments if x["id"] == payment_id), None)
    if p:
        data[account_id]["sold_curent"] = round(data[account_id]["sold_curent"] + float(p["amount"]), 2)
        data[account_id]["payments"] = [x for x in payments if x["id"] != payment_id]
    save_data(data)
    return data
