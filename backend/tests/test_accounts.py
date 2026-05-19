from datetime import datetime, timezone
from unittest.mock import patch


def _seed_account(db):
    from backend.models import BankConnection, Account, Balance, AccountType
    conn = BankConnection(
        bank_id="REVOLT21", bank_name="Revolut",
        session_id="sess-acc", connected_at=datetime.now(timezone.utc), is_active=True
    )
    db.add(conn)
    db.commit()
    acc = Account(
        bank_connection_id=conn.id, external_id="ext-a1",
        name="Card RON", currency="RON", account_type=AccountType.checking
    )
    db.add(acc)
    db.commit()
    bal = Balance(account_id=acc.id, amount=999.99, currency="RON",
                  last_updated=datetime.now(timezone.utc))
    db.add(bal)
    db.commit()
    return acc


def test_get_accounts_empty(client):
    response = client.get("/api/accounts")
    assert response.status_code == 200
    data = response.json()
    assert "checking" in data
    assert "savings" in data
    assert "deposit" in data


def test_get_accounts_with_data(client, db):
    acc = _seed_account(db)
    response = client.get("/api/accounts")
    assert response.status_code == 200
    data = response.json()
    assert len(data["checking"]) >= 1


def test_get_live_balance(client, db):
    acc = _seed_account(db)
    mock_balance = {"amount": 1500.0, "currency": "RON"}
    with patch("backend.routers.accounts.fetch_balance", return_value=mock_balance):
        response = client.get(f"/api/accounts/{acc.id}/balance")
    assert response.status_code == 200
    data = response.json()
    assert data["amount"] == 1500.0
    assert data["currency"] == "RON"
