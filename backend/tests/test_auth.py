from unittest.mock import patch
from datetime import datetime, timezone


def test_get_banks(client):
    mock_banks = [
        {"name": "Revolut", "bic": "REVOLT21", "country": "RO"},
        {"name": "ING Bank", "bic": "INGBROBU", "country": "RO"},
    ]
    with patch("backend.routers.banks.list_banks", return_value=mock_banks):
        response = client.get("/api/banks")
    assert response.status_code == 200
    data = response.json()
    assert "banks" in data
    assert len(data["banks"]) == 2
    assert data["banks"][0]["bic"] == "REVOLT21"


def test_connect_bank(client):
    mock_consent = {"redirect_url": "https://revolut.com/auth", "session_id": "sess-001"}
    with patch("backend.routers.auth.initiate_consent", return_value=mock_consent):
        response = client.post("/api/auth/connect/REVOLT21", json={"bank_name": "Revolut", "bank_id": "REVOLT21"})
    assert response.status_code == 200
    data = response.json()
    assert data["redirect_url"] == "https://revolut.com/auth"
    assert data["session_id"] == "sess-001"


def test_auth_callback_creates_connection(client, db):
    from backend.models import BankConnection
    # Seed a pending connection (is_active=False) as connect endpoint would create
    conn = BankConnection(
        bank_id="REVOLT21", bank_name="Revolut",
        session_id="sess-001", connected_at=datetime.now(timezone.utc), is_active=False
    )
    db.add(conn)
    db.commit()

    mock_accounts = [
        {"uid": "acc-ext-1", "account_type": "CACC", "name": "Card RON",
         "currency": "RON", "internal_type": "checking", "iban": None}
    ]
    with patch("backend.routers.auth.fetch_accounts", return_value=mock_accounts):
        response = client.get("/api/auth/callback?session_id=sess-001&state=xyz")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "connected"
    assert data["accounts_found"] == 1


def test_get_connections(client):
    response = client.get("/api/connections")
    assert response.status_code == 200
    assert "connections" in response.json()


def test_delete_connection(client, db):
    from backend.models import BankConnection
    conn = BankConnection(
        bank_id="TEST", bank_name="Test Bank",
        session_id="sess-del", connected_at=datetime.now(timezone.utc), is_active=True
    )
    db.add(conn)
    db.commit()
    response = client.delete(f"/api/connections/{conn.id}")
    assert response.status_code == 200
    db.refresh(conn)
    assert conn.is_active is False
