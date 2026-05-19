from datetime import datetime, timezone, date


def _seed_transactions(db):
    from backend.models import BankConnection, Account, Transaction, AccountType, TransactionType
    conn = BankConnection(
        bank_id="ING", bank_name="ING",
        session_id="sess-tx", connected_at=datetime.now(timezone.utc), is_active=True
    )
    db.add(conn)
    db.commit()
    acc = Account(
        bank_connection_id=conn.id, external_id="ext-tx-1",
        name="ING Card", currency="RON", account_type=AccountType.checking
    )
    db.add(acc)
    db.commit()
    txs = [
        Transaction(account_id=acc.id, external_id="tx-d-1", amount=50.0,
                    currency="RON", description="Coffee", booking_date=date(2026, 5, 15),
                    transaction_type=TransactionType.debit),
        Transaction(account_id=acc.id, external_id="tx-c-1", amount=1000.0,
                    currency="RON", description="Salary", booking_date=date(2026, 5, 1),
                    transaction_type=TransactionType.credit),
    ]
    db.add_all(txs)
    db.commit()
    return acc


def test_get_all_transactions(client, db):
    _seed_transactions(db)
    response = client.get("/api/transactions")
    assert response.status_code == 200
    data = response.json()
    assert "transactions" in data
    assert len(data["transactions"]) >= 2


def test_filter_by_type(client, db):
    _seed_transactions(db)
    response = client.get("/api/transactions?transaction_type=debit")
    assert response.status_code == 200
    txs = response.json()["transactions"]
    assert all(t["transaction_type"] == "debit" for t in txs)


def test_filter_by_date(client, db):
    _seed_transactions(db)
    response = client.get("/api/transactions?date_from=2026-05-10&date_to=2026-05-19")
    assert response.status_code == 200
    txs = response.json()["transactions"]
    assert all(t["booking_date"] >= "2026-05-10" for t in txs)


def test_get_account_transactions(client, db):
    acc = _seed_transactions(db)
    response = client.get(f"/api/accounts/{acc.id}/transactions")
    assert response.status_code == 200
    assert len(response.json()["transactions"]) >= 2
