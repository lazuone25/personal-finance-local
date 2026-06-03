from fastapi import APIRouter
import json
import pathlib
import uuid
import re

router = APIRouter()

CATEGORIES_FILE = pathlib.Path(__file__).parent.parent / "categories_data.json"

DEFAULT_CATEGORIES = [
    {"id": "alimente", "name": "Alimente", "color": "#10B981"},
    {"id": "transport", "name": "Transport", "color": "#3B82F6"},
    {"id": "utilitati", "name": "Utilități", "color": "#F59E0B"},
    {"id": "sanatate", "name": "Sănătate", "color": "#EF4444"},
    {"id": "divertisment", "name": "Divertisment", "color": "#8B5CF6"},
    {"id": "cumparaturi", "name": "Cumpărături", "color": "#EC4899"},
    {"id": "restaurant", "name": "Restaurant & Cafenele", "color": "#F97316"},
    {"id": "rate", "name": "Rate & Datorii", "color": "#64748B"},
    {"id": "venituri", "name": "Venituri", "color": "#06B6D4"},
    {"id": "facultate", "name": "Facultate", "color": "#0EA5E9"},
    {"id": "imprumuturi", "name": "Împrumuturi", "color": "#A855F7"},
    {"id": "necategorizat", "name": "Necategorizat", "color": "#CBD5E1"},
]

DEFAULT_DATA = {
    "categories": DEFAULT_CATEGORIES,
    "rules": [],
    "overrides": {},
    "settled": [],
    "owners": {},
}


def load_data() -> dict:
    if CATEGORIES_FILE.exists():
        with open(CATEGORIES_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    return {k: (v.copy() if isinstance(v, list) else dict(v)) for k, v in DEFAULT_DATA.items()}


def save_data(data: dict):
    with open(CATEGORIES_FILE, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)


def classify(description: str, rules: list, overrides: dict, tx_id: str = None) -> str:
    if tx_id and tx_id in overrides:
        return overrides[tx_id]
    desc_lower = (description or "").lower()
    for rule in rules:
        if re.search(rule["pattern"], desc_lower, re.IGNORECASE):
            return rule["category_id"]
    return "necategorizat"


@router.get("/categories")
def get_categories():
    return load_data()


@router.put("/categories/transaction/{tx_id}")
def set_transaction_category(tx_id: str, payload: dict):
    data = load_data()
    category_id = payload.get("category_id", "necategorizat")
    if category_id == "necategorizat":
        data["overrides"].pop(str(tx_id), None)
    else:
        data["overrides"][str(tx_id)] = category_id
    save_data(data)
    return data


@router.post("/categories/rules")
def add_rule(payload: dict):
    data = load_data()
    rule = {
        "id": str(uuid.uuid4()),
        "pattern": payload["pattern"],
        "category_id": payload["category_id"],
    }
    data["rules"].append(rule)
    save_data(data)
    return data


@router.delete("/categories/rules/{rule_id}")
def delete_rule(rule_id: str):
    data = load_data()
    data["rules"] = [r for r in data["rules"] if r["id"] != rule_id]
    save_data(data)
    return data


@router.put("/categories/owner/{tx_id}")
def set_owner(tx_id: str, payload: dict):
    data = load_data()
    if "owners" not in data:
        data["owners"] = {}
    owner = payload.get("owner")
    if owner:
        data["owners"][str(tx_id)] = owner
    else:
        data["owners"].pop(str(tx_id), None)
    save_data(data)
    return data


@router.post("/categories/settle/{tx_id}")
def settle_transaction(tx_id: str):
    data = load_data()
    if "settled" not in data:
        data["settled"] = []
    if tx_id not in data["settled"]:
        data["settled"].append(tx_id)
    save_data(data)
    return data


@router.delete("/categories/settle/{tx_id}")
def unsettle_transaction(tx_id: str):
    data = load_data()
    data["settled"] = [s for s in data.get("settled", []) if s != tx_id]
    save_data(data)
    return data


@router.post("/categories/classify")
def classify_transactions(payload: dict):
    """Classify a list of transactions. Returns {tx_id: category_id}."""
    transactions = payload.get("transactions", [])
    data = load_data()
    result = {}
    for tx in transactions:
        tx_id = str(tx.get("id", ""))
        result[tx_id] = classify(tx.get("description", ""), data["rules"], data["overrides"], tx_id)
    return {"classifications": result, "categories": data["categories"]}
