import os
import sys
from pathlib import Path
from datetime import datetime, timezone, timedelta
from dotenv import load_dotenv

load_dotenv(Path(__file__).parent.parent.parent / ".env")

# Add project root to path so we can import src/client.py
sys.path.insert(0, str(Path(__file__).parent.parent.parent))
from src.client import get, post

REDIRECT_URI = os.getenv("REDIRECT_URI", "http://localhost:8000/api/auth/callback")

ACCOUNT_TYPE_MAP = {
    "CACC": "checking",
    "SVGS": "savings",
    "TERM": "deposit",
    "CARD": "card",
}


def list_banks() -> list[dict]:
    data = get("/aspsps?country=RO")
    return data.get("aspsps", [])


def initiate_consent(bank_name: str, bank_id: str, redirect_uri: str) -> dict:
    import uuid
    valid_until = (datetime.now(timezone.utc) + timedelta(days=30)).strftime("%Y-%m-%dT%H:%M:%SZ")
    body = {
        "access": {
            "valid_until": valid_until,
            "balances": [],
            "transactions": [],
        },
        "aspsp": {"name": bank_name, "country": "RO"},
        "state": str(uuid.uuid4()),
        "redirect_uri": redirect_uri,
        "psu_type": "personal",
    }
    response = post("/auth", body)
    return {
        "redirect_url": response["url"],
        "session_id": response["session_id"],
    }


def fetch_accounts(session_id: str) -> list[dict]:
    data = get(f"/accounts?session_id={session_id}")
    accounts = data.get("accounts", [])
    for acc in accounts:
        raw_type = acc.get("account_type", "")
        acc["internal_type"] = ACCOUNT_TYPE_MAP.get(raw_type, "other")
    return accounts


def fetch_balance(account_external_id: str, session_id: str) -> dict:
    data = get(f"/accounts/{account_external_id}/balances?session_id={session_id}")
    balances = data.get("balances", [])
    # Prefer CLBD (closing booked), fall back to first available
    target = next((b for b in balances if b.get("balance_type") == "CLBD"), balances[0] if balances else None)
    if not target:
        return {"amount": 0.0, "currency": "RON"}
    amount_data = target["balance_amount"]
    raw = amount_data["amount"]
    return {
        "amount": float(raw.lstrip("-")) if raw.startswith("-") else float(raw),
        "currency": amount_data["currency"],
    }


def fetch_transactions(account_external_id: str, session_id: str, date_from: str, date_to: str) -> list[dict]:
    url = f"/accounts/{account_external_id}/transactions?session_id={session_id}&date_from={date_from}&date_to={date_to}"
    data = get(url)
    booked = data.get("transactions", {}).get("booked", [])
    result = []
    for tx in booked:
        amount_raw = tx.get("transaction_amount", {}).get("amount", "0")
        amount = float(amount_raw.lstrip("-")) if amount_raw else 0.0
        tx_type = "debit" if amount_raw.startswith("-") else "credit"
        result.append({
            "transaction_id": tx.get("transaction_id", ""),
            "amount": amount,
            "currency": tx.get("transaction_amount", {}).get("currency", "RON"),
            "description": tx.get("remittance_information_unstructured") or tx.get("creditor_name") or "",
            "booking_date": tx.get("booking_date", ""),
            "value_date": tx.get("value_date"),
            "transaction_type": tx_type,
        })
    return result
