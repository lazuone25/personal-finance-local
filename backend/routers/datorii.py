from fastapi import APIRouter
import json
import pathlib
import uuid
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
        "limita": 0.0,
        "dobanda": 0.0,
        "zi_scadenta": 1,
        "plata_minima": 0.0,
        "payments": [],
    },
}


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
    for key in ("sold_curent", "limita", "dobanda", "zi_scadenta", "plata_minima"):
        if key in payload:
            data[account_id][key] = payload[key]
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
    data[account_id]["sold_curent"] = round(data[account_id]["sold_curent"] - amount, 2)
    data[account_id]["payments"].insert(0, payment)
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
