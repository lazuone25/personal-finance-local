from fastapi import APIRouter
import json
import pathlib
from datetime import date

router = APIRouter()

EXTRA_DATA_FILE = pathlib.Path(__file__).parent.parent / "extra_data.json"

DEFAULT_DATA = {
    "main_balance": 0.0,
    "currency": "RON",
    "interest_start_date": date.today().strftime("%Y-%m-%d"),
    "sub_accounts": [
        {"id": "bani_personali", "name": "BANI PERSONALI", "amount": 0.0},
        {"id": "alocatie_ema", "name": "ALOCATIE EMA", "amount": 0.0},
        {"id": "fonduri_nefolosite", "name": "FONDURI NEFOLOSITE", "amount": 0.0},
    ],
    "de_primit": [],
    "fond_urgenta": {
        "amount": 0.0,
        "interest_rate": 0.025,
        "interest_start_date": date.today().strftime("%Y-%m-%d"),
    },
    "transfers": []
}

def load_data() -> dict:
    if EXTRA_DATA_FILE.exists():
        with open(EXTRA_DATA_FILE, "r", encoding="utf-8") as f:
            data = json.load(f)
        # Ensure new fields exist if loading older data
        if "de_primit" not in data:
            data["de_primit"] = []
        if "interest_start_date" not in data:
            data["interest_start_date"] = date.today().strftime("%Y-%m-%d")
        if "fond_urgenta" not in data:
            data["fond_urgenta"] = {
                "amount": 0.0,
                "interest_rate": 0.025,
                "interest_start_date": date.today().strftime("%Y-%m-%d"),
            }
        return data
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


@router.put("/extra/transfer/{transfer_id}")
def update_transfer(transfer_id: str, transfer: dict):
    data = load_data()
    if "transfers" not in data:
        data["transfers"] = []

    old_tx = next((t for t in data["transfers"] if t["id"] == transfer_id), None)
    if not old_tx:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Transfer not found")

    # Reverseaza efectul vechi
    data = apply_transfer(data, old_tx["source_id"], old_tx["dest_id"], float(old_tx["amount"]), reverse=True)

    # Aplica efectul nou
    new_source = transfer.get("source_id", old_tx["source_id"])
    new_dest = transfer.get("dest_id", old_tx["dest_id"])
    new_amount = float(transfer.get("amount", old_tx["amount"]))
    data = apply_transfer(data, new_source, new_dest, new_amount)

    updated = {**old_tx, "source_id": new_source, "dest_id": new_dest,
               "amount": new_amount, "note": transfer.get("note", old_tx.get("note", ""))}
    data["transfers"] = [updated if t["id"] == transfer_id else t for t in data["transfers"]]
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


@router.post("/extra/de-primit")
def add_de_primit(entry: dict):
    import uuid
    from datetime import datetime

    data = load_data()
    if "de_primit" not in data:
        data["de_primit"] = []

    entry["id"] = str(uuid.uuid4())
    entry["date"] = datetime.now().strftime("%Y-%m-%d")
    data["de_primit"].append(entry)
    save_data(data)
    return data


@router.delete("/extra/de-primit/{entry_id}")
def delete_de_primit(entry_id: str):
    data = load_data()
    if "de_primit" not in data:
        data["de_primit"] = []

    data["de_primit"] = [e for e in data["de_primit"] if e["id"] != entry_id]
    save_data(data)
    return data
