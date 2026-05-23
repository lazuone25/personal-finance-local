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
    ]
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
