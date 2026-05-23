from fastapi import APIRouter
import json
import pathlib

router = APIRouter()

EXTRA_DATA_FILE = pathlib.Path(__file__).parent.parent / "extra_data.json"

DEFAULT_DATA = {
    "main_balance": 0.0,
    "currency": "RON",
    "sub_accounts": [
        {"id": "bani_personali", "name": "BANI PERSONALI", "amount": 0.0},
        {"id": "alocatie_ema", "name": "ALOCATIE EMA", "amount": 0.0},
        {"id": "fonduri_nefolosite", "name": "FONDURI NEFOLOSITE", "amount": 0.0},
    ],
    "transfers": []
}

def load_data() -> dict:
    if EXTRA_DATA_FILE.exists():
        with open(EXTRA_DATA_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    return DEFAULT_DATA.copy()

def save_data(data: dict):
    with open(EXTRA_DATA_FILE, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False)

@router.get("/extra")
def get_extra():
    return load_data()

@router.post("/extra")
def update_extra(data: dict):
    save_data(data)
    return data

NAMED_SUBS = {'bani_personali', 'alocatie_ema'}
REVOLUT_ACCOUNTS = {'revolut_personal', 'revolut_comun'}

def apply_transfer(data, source_id, dest_id, amount, reverse=False):
    src_delta = amount if reverse else -amount      # normal: scade sursa; reverse: adauga inapoi
    dst_delta = -amount if reverse else amount      # normal: creste dest; reverse: scade inapoi
    mb_delta  = amount if reverse else -amount      # normal: scade main_balance; reverse: adauga inapoi

    if source_id in NAMED_SUBS:
        data["sub_accounts"] = [
            {**s, "amount": round(s["amount"] + src_delta, 2)} if s["id"] == source_id else s
            for s in data["sub_accounts"]
        ]

    if source_id in REVOLUT_ACCOUNTS:
        # Bani intră în economii → main_balance crește
        data["main_balance"] = round(data["main_balance"] - mb_delta, 2)

    if dest_id in NAMED_SUBS:
        data["sub_accounts"] = [
            {**s, "amount": round(s["amount"] + dst_delta, 2)} if s["id"] == dest_id else s
            for s in data["sub_accounts"]
        ]

    if dest_id in REVOLUT_ACCOUNTS:
        data["main_balance"] = round(data["main_balance"] + mb_delta, 2)

    return data


@router.post("/extra/transfer")
def add_transfer(transfer: dict):
    import uuid
    from datetime import datetime

    data = load_data()
    if "transfers" not in data:
        data["transfers"] = []

    transfer["id"] = str(uuid.uuid4())
    transfer["date"] = datetime.now().strftime("%Y-%m-%d")

    source_id = transfer.get("source_id", "")
    dest_id = transfer.get("dest_id", "")
    amount = float(transfer.get("amount", 0))

    data = apply_transfer(data, source_id, dest_id, amount)
    data["transfers"].insert(0, transfer)
    save_data(data)
    return data


@router.delete("/extra/transfer/{transfer_id}")
def delete_transfer(transfer_id: str):
    data = load_data()
    if "transfers" not in data:
        data["transfers"] = []

    tx = next((t for t in data["transfers"] if t["id"] == transfer_id), None)
    if tx:
        source_id = tx.get("source_id", "")
        dest_id = tx.get("dest_id", "")
        amount = float(tx.get("amount", 0))
        data = apply_transfer(data, source_id, dest_id, amount, reverse=True)
        data["transfers"] = [t for t in data["transfers"] if t["id"] != transfer_id]

    save_data(data)
    return data
