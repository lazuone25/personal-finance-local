from datetime import datetime, timezone, date, timedelta
from unittest.mock import patch


def _seed_connection_and_account(db):
    from backend.models import BankConnection, Account, AccountType
    conn = BankConnection(
        bank_id="REVOLT21", bank_name="Revolut",
        session_id="sess-sync", connected_at=datetime.now(timezone.utc), is_active=True
    )
    db.add(conn)
    db.commit()
    acc = Account(
        bank_connection_id=conn.id, external_id="ext-sync-1",
        name="Card", currency="RON", account_type=AccountType.checking
    )
    db.add(acc)
    db.commit()
    return conn, acc


def test_sync_updates_balance(db):
    from backend.services.sync_service import sync_all
    conn, acc = _seed_connection_and_account(db)
    mock_balance = {"amount": 2500.0, "currency": "RON"}
    mock_txs = []
    with patch("backend.services.sync_service.fetch_balance", return_value=mock_balance), \
         patch("backend.services.sync_service.fetch_transactions", return_value=mock_txs):
        sync_all(db)
    db.refresh(acc)
    assert acc.balance is not None
    assert float(acc.balance.amount) == 2500.0


def test_sync_inserts_new_transactions(db):
    from backend.services.sync_service import sync_all
    conn, acc = _seed_connection_and_account(db)
    mock_balance = {"amount": 1000.0, "currency": "RON"}
    mock_txs = [
        {"transaction_id": "new-tx-001", "amount": 75.0, "currency": "RON",
         "description": "Supermarket", "booking_date": "2026-05-18",
         "value_date": "2026-05-18", "transaction_type": "debit"},
    ]
    with patch("backend.services.sync_service.fetch_balance", return_value=mock_balance), \
         patch("backend.services.sync_service.fetch_transactions", return_value=mock_txs):
        sync_all(db)
    from backend.models import Transaction
    tx = db.query(Transaction).filter_by(external_id="new-tx-001").first()
    assert tx is not None
    assert float(tx.amount) == 75.0


def test_sync_skips_duplicate_transactions(db):
    from backend.services.sync_service import sync_all
    from backend.models import Transaction, TransactionType
    conn, acc = _seed_connection_and_account(db)
    existing = Transaction(
        account_id=acc.id, external_id="dup-tx-002",
        amount=30.0, currency="RON", description="Existing",
        booking_date=date(2026, 5, 10), transaction_type=TransactionType.debit
    )
    db.add(existing)
    db.commit()

    mock_balance = {"amount": 500.0, "currency": "RON"}
    mock_txs = [
        {"transaction_id": "dup-tx-002", "amount": 30.0, "currency": "RON",
         "description": "Existing", "booking_date": "2026-05-10",
         "value_date": None, "transaction_type": "debit"},
    ]
    with patch("backend.services.sync_service.fetch_balance", return_value=mock_balance), \
         patch("backend.services.sync_service.fetch_transactions", return_value=mock_txs):
        sync_all(db)

    from sqlalchemy import func
    count = db.query(func.count(Transaction.id)).filter_by(external_id="dup-tx-002").scalar()
    assert count == 1


def test_get_sync_status(client):
    response = client.get("/api/sync/status")
    assert response.status_code == 200
    data = response.json()
    assert "last_sync" in data
    assert "interval_minutes" in data


def test_manual_sync_trigger(client):
    with patch("backend.routers.sync.sync_all", return_value={"synced_at": "2026-05-19T12:00:00", "banks": []}):
        response = client.post("/api/sync")
    assert response.status_code == 200
    assert "synced_at" in response.json()
