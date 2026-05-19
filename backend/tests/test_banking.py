from unittest.mock import patch, MagicMock
from datetime import datetime, timezone


def test_list_banks():
    from backend.services.banking import list_banks
    mock_response = {
        "aspsps": [
            {"name": "Revolut", "bic": "REVOLT21", "country": "RO"},
            {"name": "ING Bank", "bic": "INGBROBU", "country": "RO"},
        ]
    }
    with patch("backend.services.banking.get", return_value=mock_response):
        banks = list_banks()
    assert len(banks) == 2
    assert banks[0]["bic"] == "REVOLT21"


def test_initiate_consent():
    from backend.services.banking import initiate_consent
    mock_response = {"url": "https://bank.com/auth", "session_id": "sess-abc"}
    with patch("backend.services.banking.post", return_value=mock_response):
        result = initiate_consent("Revolut", "REVOLT21", "http://localhost:8000/api/auth/callback")
    assert result["redirect_url"] == "https://bank.com/auth"
    assert result["session_id"] == "sess-abc"


def test_fetch_accounts():
    from backend.services.banking import fetch_accounts
    mock_response = {
        "accounts": [
            {"uid": "acc-1", "account_type": "CACC", "name": "Current", "currency": "RON"},
            {"uid": "acc-2", "account_type": "SVGS", "name": "Savings", "currency": "RON"},
            {"uid": "acc-3", "account_type": "TERM", "name": "Deposit", "currency": "RON"},
            {"uid": "acc-4", "account_type": "UNKN", "name": "Other", "currency": "EUR"},
        ]
    }
    with patch("backend.services.banking.get", return_value=mock_response):
        accounts = fetch_accounts("sess-abc")
    assert len(accounts) == 4
    assert accounts[0]["internal_type"] == "checking"
    assert accounts[1]["internal_type"] == "savings"
    assert accounts[2]["internal_type"] == "deposit"
    assert accounts[3]["internal_type"] == "other"


def test_fetch_balance():
    from backend.services.banking import fetch_balance
    mock_response = {
        "balances": [
            {"balance_amount": {"amount": "1500.00", "currency": "RON"}, "balance_type": "CLBD"}
        ]
    }
    with patch("backend.services.banking.get", return_value=mock_response):
        balance = fetch_balance("acc-1", "sess-abc")
    assert balance["amount"] == 1500.00
    assert balance["currency"] == "RON"


def test_fetch_transactions():
    from backend.services.banking import fetch_transactions
    mock_response = {
        "transactions": {
            "booked": [
                {
                    "transaction_id": "tx-001",
                    "transaction_amount": {"amount": "-50.00", "currency": "RON"},
                    "remittance_information_unstructured": "Coffee",
                    "booking_date": "2026-05-15",
                    "value_date": "2026-05-15",
                }
            ],
            "pending": []
        }
    }
    with patch("backend.services.banking.get", return_value=mock_response):
        txs = fetch_transactions("acc-1", "sess-abc", "2026-05-01", "2026-05-19")
    assert len(txs) == 1
    assert txs[0]["transaction_id"] == "tx-001"
    assert txs[0]["transaction_type"] == "debit"
    assert txs[0]["amount"] == 50.00
