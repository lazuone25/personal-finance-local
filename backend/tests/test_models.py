from datetime import datetime, timezone


def test_create_bank_connection(db):
    from backend.models import BankConnection
    conn = BankConnection(
        bank_id="REVOLT21",
        bank_name="Revolut",
        session_id="test-session-123",
        connected_at=datetime.now(timezone.utc),
        is_active=True,
    )
    db.add(conn)
    db.commit()
    db.refresh(conn)
    assert conn.id is not None
    assert conn.bank_id == "REVOLT21"


def test_create_account(db):
    from backend.models import BankConnection, Account
    conn = BankConnection(
        bank_id="REVOLT21", bank_name="Revolut",
        session_id="s1", connected_at=datetime.now(timezone.utc), is_active=True
    )
    db.add(conn)
    db.commit()

    acc = Account(
        bank_connection_id=conn.id,
        external_id="ext-acc-1",
        iban="RO49AAAA1B31007593840000",
        name="Current Account",
        currency="RON",
        account_type="checking",
    )
    db.add(acc)
    db.commit()
    db.refresh(acc)
    assert acc.id is not None
    assert acc.account_type == "checking"


def test_create_balance(db):
    from backend.models import BankConnection, Account, Balance
    conn = BankConnection(
        bank_id="ING", bank_name="ING",
        session_id="s2", connected_at=datetime.now(timezone.utc), is_active=True
    )
    db.add(conn)
    db.commit()
    acc = Account(
        bank_connection_id=conn.id, external_id="ext-acc-2",
        name="ING Card", currency="RON", account_type="checking"
    )
    db.add(acc)
    db.commit()

    bal = Balance(account_id=acc.id, amount=1234.56, currency="RON",
                  last_updated=datetime.now(timezone.utc))
    db.add(bal)
    db.commit()
    db.refresh(bal)
    assert float(bal.amount) == 1234.56


def test_create_transaction(db):
    from backend.models import BankConnection, Account, Transaction
    conn = BankConnection(
        bank_id="RZBR", bank_name="Raiffeisen",
        session_id="s3", connected_at=datetime.now(timezone.utc), is_active=True
    )
    db.add(conn)
    db.commit()
    acc = Account(
        bank_connection_id=conn.id, external_id="ext-acc-3",
        name="Card RON", currency="RON", account_type="card"
    )
    db.add(acc)
    db.commit()

    tx = Transaction(
        account_id=acc.id,
        external_id="tx-unique-001",
        amount=50.00,
        currency="RON",
        description="Coffee",
        booking_date="2026-05-15",
        transaction_type="debit",
    )
    db.add(tx)
    db.commit()
    db.refresh(tx)
    assert tx.id is not None
    assert tx.external_id == "tx-unique-001"


def test_transaction_external_id_unique(db):
    from backend.models import BankConnection, Account, Transaction
    import pytest
    from sqlalchemy.exc import IntegrityError

    conn = BankConnection(
        bank_id="DUP", bank_name="Dup Bank",
        session_id="s4", connected_at=datetime.now(timezone.utc), is_active=True
    )
    db.add(conn)
    db.commit()
    acc = Account(
        bank_connection_id=conn.id, external_id="ext-acc-4",
        name="Card", currency="RON", account_type="checking"
    )
    db.add(acc)
    db.commit()

    tx1 = Transaction(account_id=acc.id, external_id="dup-tx-1",
                      amount=10.0, currency="RON", description="A",
                      booking_date="2026-05-01", transaction_type="debit")
    tx2 = Transaction(account_id=acc.id, external_id="dup-tx-1",
                      amount=20.0, currency="RON", description="B",
                      booking_date="2026-05-02", transaction_type="credit")
    db.add(tx1)
    db.commit()
    db.add(tx2)
    with pytest.raises(IntegrityError):
        db.commit()
