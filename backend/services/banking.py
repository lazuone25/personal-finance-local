import os
import sys
from pathlib import Path
from datetime import datetime, timezone, timedelta
from dotenv import load_dotenv

load_dotenv(Path(__file__).parent.parent.parent / ".env")

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
    state = str(uuid.uuid4())
    valid_until = (datetime.now(timezone.utc) + timedelta(days=30)).strftime("%Y-%m-%dT%H:%M:%SZ")
    body = {
        "access": {
            "valid_until": valid_until,
            "balances": True,
            "transactions": True,
        },
        "aspsp": {"name": bank_name, "country": "RO"},
        "state": state,
        "redirect_url": redirect_uri,
        "psu_type": "personal",
    }
    response = post("/auth", body)
    return {
        "redirect_url": response["url"],
        "authorization_id": response["authorization_id"],
        "state": state,
    }


def confirm_session(code: str) -> dict:
    """Exchange authorization code for a real session_id + accounts list."""
    response = post("/sessions", {"code": code})
    accounts = []
    for acc in response.get("accounts", []):
        raw_type = acc.get("account_type", "")
        acc["internal_type"] = ACCOUNT_TYPE_MAP.get(raw_type, "other")
        accounts.append(acc)
    return {
        "session_id": response["session_id"],
        "accounts": accounts,
    }


def fetch_balance(account_external_id: str) -> dict:
    data = get(f"/accounts/{account_external_id}/balances")
    balances = data.get("balances", [])
    target = next((b for b in balances if b.get("balance_type") == "CLBD"), balances[0] if balances else None)
    if not target:
        return {"amount": 0.0, "currency": "RON"}
    amount_data = target["balance_amount"]
    raw = amount_data["amount"]
    return {
        "amount": float(raw.lstrip("-")) if raw.startswith("-") else float(raw),
        "currency": amount_data["currency"],
    }


def fetch_transactions(account_external_id: str, date_from: str, date_to: str) -> list[dict]:
    url = f"/accounts/{account_external_id}/transactions?date_from={date_from}&date_to={date_to}"
    all_transactions = []

    while url:
        data = get(url)
        transactions = data.get("transactions", [])
        all_transactions.extend(transactions)

        continuation_key = data.get("continuation_key")
        if continuation_key:
            url = f"/accounts/{account_external_id}/transactions?date_from={date_from}&date_to={date_to}&continuation_key={continuation_key}"
        else:
            url = None

    result = []
    for tx in all_transactions:
        amount_data = tx.get("transaction_amount", {})
        amount_raw = amount_data.get("amount", "0") or "0"
        amount = abs(float(amount_raw))
        indicator = tx.get("credit_debit_indicator", "CRDT")
        tx_type = "debit" if indicator == "DBIT" else "credit"
        remittance = tx.get("remittance_information") or []
        description = (remittance[0] if remittance else None) or (tx.get("creditor") or {}).get("name") or ""
        tx_id = tx.get("transaction_id") or tx.get("entry_reference") or str(__import__("uuid").uuid4())
        result.append({
            "transaction_id": tx_id,
            "amount": amount,
            "currency": amount_data.get("currency", "RON"),
            "description": description,
            "booking_date": tx.get("booking_date", ""),
            "value_date": tx.get("value_date"),
            "transaction_type": tx_type,
        })
    return result
