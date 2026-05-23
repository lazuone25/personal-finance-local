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

@router.post("/extra/transfer")
def add_transfer(transfer: dict):
    data = load_data()
    if "transfers" not in data:
        data["transfers"] = []

    import uuid
    from datetime import datetime
    transfer["id"] = str(uuid.uuid4())
    transfer["date"] = datetime.now().strftime("%Y-%m-%d")

    # Deduct from sub-account
    sub_id = transfer.get("sub_account_id")
    amount = float(transfer.get("amount", 0))
    data["sub_accounts"] = [
        {**s, "amount": round(s["amount"] - amount, 2)} if s["id"] == sub_id else s
        for s in data["sub_accounts"]
    ]

    data["transfers"].insert(0, transfer)  # newest first
    save_data(data)
    return data

@router.delete("/extra/transfer/{transfer_id}")
def delete_transfer(transfer_id: str):
    data = load_data()
    if "transfers" not in data:
        data["transfers"] = []

    # Find transfer to reverse
    tx = next((t for t in data["transfers"] if t["id"] == transfer_id), None)
    if tx:
        # Restore sub-account amount
        sub_id = tx.get("sub_account_id")
        amount = float(tx.get("amount", 0))
        data["sub_accounts"] = [
            {**s, "amount": round(s["amount"] + amount, 2)} if s["id"] == sub_id else s
            for s in data["sub_accounts"]
        ]
        data["transfers"] = [t for t in data["transfers"] if t["id"] != transfer_id]

    save_data(data)
    return data
