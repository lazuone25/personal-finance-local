# MoneyTracking Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a FastAPI backend + React frontend that connects to Romanian bank accounts via Enable Banking API, showing live balances, deposits, savings, and transaction history.

**Architecture:** FastAPI backend with SQLAlchemy (SQLite locally, PostgreSQL in cloud) serves a React+Vite SPA. APScheduler syncs transactions every N minutes. Enable Banking OAuth consent flow handles per-bank authorization. `src/client.py` remains unchanged — `backend/services/banking.py` wraps it.

**Tech Stack:** Python 3.11+, FastAPI, SQLAlchemy 2.x, APScheduler 3.x, Pydantic 2.x, pytest, React 18, Vite, TanStack Query v5, Recharts, React Router v6, axios

---

## File Map

```
backend/
  __init__.py
  main.py               — FastAPI app, CORS, lifespan, router registration
  database.py           — engine, SessionLocal, Base, get_db dependency
  models.py             — BankConnection, Account, Balance, Transaction
  schemas.py            — Pydantic request/response schemas
  routers/
    __init__.py
    banks.py            — GET /api/banks
    auth.py             — connect, callback, connections CRUD
    accounts.py         — accounts list, live balance
    transactions.py     — transactions with filters
    sync.py             — manual sync trigger + status
  services/
    __init__.py
    banking.py          — Enable Banking API calls, wraps src/client.py
    sync_service.py     — APScheduler setup + sync logic
  tests/
    __init__.py
    conftest.py         — test DB fixture, TestClient fixture
    test_models.py
    test_banking.py     — mocked Enable Banking calls
    test_auth.py
    test_accounts.py
    test_transactions.py
    test_sync.py

frontend/
  package.json
  vite.config.js
  index.html
  src/
    main.jsx
    App.jsx
    api/
      client.js         — axios instance
      hooks.js          — all TanStack Query hooks
    pages/
      Dashboard.jsx
      Accounts.jsx
      Transactions.jsx
      Settings.jsx
    components/
      Layout.jsx        — nav + page wrapper
      SummaryCard.jsx   — total balance card
      AccountCard.jsx   — per-account display
      TransactionRow.jsx
      BankConnectButton.jsx

src/client.py           — UNCHANGED
requirements.txt        — add backend deps
.env                    — add DATABASE_URL, SYNC_INTERVAL_MINUTES, REDIRECT_URI
```

---

## ─── BACKEND ───────────────────────────────────────────────

## Task 1: Dependencies & Project Setup

**Files:**
- Modify: `requirements.txt`
- Modify: `.env`
- Create: `backend/__init__.py`, `backend/routers/__init__.py`, `backend/services/__init__.py`, `backend/tests/__init__.py`

- [ ] **Step 1: Update requirements.txt**

Replace contents with:
```
PyJWT[crypto]==2.9.0
cryptography==43.0.3
requests==2.32.3
python-dotenv==1.0.1
fastapi==0.115.5
uvicorn[standard]==0.32.1
sqlalchemy==2.0.36
apscheduler==3.10.4
pydantic-settings==2.6.1
pytest==8.3.3
httpx==0.27.2
pytest-mock==3.14.0
```

- [ ] **Step 2: Install dependencies**

```bash
cd C:\projects\moneytracking
.venv\Scripts\activate
pip install -r requirements.txt
```

Expected: all packages install without errors.

- [ ] **Step 3: Add vars to .env**

Append to `.env`:
```
DATABASE_URL=sqlite:///./moneytracking.db
SYNC_INTERVAL_MINUTES=5
REDIRECT_URI=http://localhost:8000/api/auth/callback
```

- [ ] **Step 4: Create empty `__init__.py` files**

Create these files (all empty):
- `backend/__init__.py`
- `backend/routers/__init__.py`
- `backend/services/__init__.py`
- `backend/tests/__init__.py`

- [ ] **Step 5: Commit**

```bash
git add requirements.txt .env backend/
git commit -m "chore: backend project setup and dependencies"
```

---

## Task 2: Database Module

**Files:**
- Create: `backend/database.py`
- Create: `backend/tests/conftest.py`

- [ ] **Step 1: Write failing test**

Create `backend/tests/conftest.py`:
```python
import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from fastapi.testclient import TestClient

TEST_DATABASE_URL = "sqlite:///:memory:"

@pytest.fixture(scope="session")
def engine():
    from backend.database import Base
    eng = create_engine(TEST_DATABASE_URL, connect_args={"check_same_thread": False})
    Base.metadata.create_all(bind=eng)
    yield eng
    Base.metadata.drop_all(bind=eng)

@pytest.fixture
def db(engine):
    TestingSessionLocal = sessionmaker(bind=engine)
    session = TestingSessionLocal()
    yield session
    session.rollback()
    session.close()

@pytest.fixture
def client(engine):
    from backend.main import app
    from backend.database import get_db
    TestingSessionLocal = sessionmaker(bind=engine)
    def override_get_db():
        session = TestingSessionLocal()
        try:
            yield session
        finally:
            session.close()
    app.dependency_overrides[get_db] = override_get_db
    return TestClient(app)
```

Create `backend/tests/test_models.py`:
```python
def test_db_session_works(db):
    assert db is not None
```

- [ ] **Step 2: Run test — expect FAIL**

```bash
cd C:\projects\moneytracking
.venv\Scripts\activate
python -m pytest backend/tests/test_models.py -v
```

Expected: `ModuleNotFoundError: No module named 'backend.database'`

- [ ] **Step 3: Create `backend/database.py`**

```python
import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from dotenv import load_dotenv
from pathlib import Path

load_dotenv(Path(__file__).parent.parent / ".env")

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./moneytracking.db")

connect_args = {"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}
engine = create_engine(DATABASE_URL, connect_args=connect_args)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db():
    Base.metadata.create_all(bind=engine)
```

- [ ] **Step 4: Run test — expect PASS**

```bash
python -m pytest backend/tests/test_models.py -v
```

Expected: `PASSED`

- [ ] **Step 5: Commit**

```bash
git add backend/database.py backend/tests/
git commit -m "feat: database module with SQLAlchemy engine and session"
```

---

## Task 3: SQLAlchemy Models

**Files:**
- Create: `backend/models.py`
- Modify: `backend/tests/test_models.py`

- [ ] **Step 1: Write failing tests**

Replace `backend/tests/test_models.py`:
```python
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
```

- [ ] **Step 2: Run tests — expect FAIL**

```bash
python -m pytest backend/tests/test_models.py -v
```

Expected: `ImportError: cannot import name 'BankConnection'`

- [ ] **Step 3: Create `backend/models.py`**

```python
from datetime import datetime, timezone
from sqlalchemy import (
    Column, Integer, String, Boolean, DateTime,
    Numeric, Date, ForeignKey, Enum as SAEnum
)
from sqlalchemy.orm import relationship
from backend.database import Base

import enum


class AccountType(str, enum.Enum):
    checking = "checking"
    savings = "savings"
    deposit = "deposit"
    card = "card"
    other = "other"


class TransactionType(str, enum.Enum):
    debit = "debit"
    credit = "credit"


class BankConnection(Base):
    __tablename__ = "bank_connections"

    id = Column(Integer, primary_key=True, index=True)
    bank_id = Column(String, nullable=False)
    bank_name = Column(String, nullable=False)
    session_id = Column(String, nullable=False)
    connected_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    is_active = Column(Boolean, default=True)

    accounts = relationship("Account", back_populates="bank_connection")


class Account(Base):
    __tablename__ = "accounts"

    id = Column(Integer, primary_key=True, index=True)
    bank_connection_id = Column(Integer, ForeignKey("bank_connections.id"), nullable=False)
    external_id = Column(String, nullable=False)
    iban = Column(String, nullable=True)
    name = Column(String, nullable=False)
    currency = Column(String, nullable=False)
    account_type = Column(SAEnum(AccountType), nullable=False)

    bank_connection = relationship("BankConnection", back_populates="accounts")
    balance = relationship("Balance", back_populates="account", uselist=False)
    transactions = relationship("Transaction", back_populates="account")


class Balance(Base):
    __tablename__ = "balances"

    id = Column(Integer, primary_key=True, index=True)
    account_id = Column(Integer, ForeignKey("accounts.id"), nullable=False)
    amount = Column(Numeric(15, 2), nullable=False)
    currency = Column(String, nullable=False)
    last_updated = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    account = relationship("Account", back_populates="balance")


class Transaction(Base):
    __tablename__ = "transactions"

    id = Column(Integer, primary_key=True, index=True)
    account_id = Column(Integer, ForeignKey("accounts.id"), nullable=False)
    external_id = Column(String, unique=True, nullable=False)
    amount = Column(Numeric(15, 2), nullable=False)
    currency = Column(String, nullable=False)
    description = Column(String, nullable=True)
    booking_date = Column(Date, nullable=False)
    value_date = Column(Date, nullable=True)
    transaction_type = Column(SAEnum(TransactionType), nullable=False)

    account = relationship("Account", back_populates="transactions")
```

- [ ] **Step 4: Run tests — expect PASS**

```bash
python -m pytest backend/tests/test_models.py -v
```

Expected: all 5 tests `PASSED`

- [ ] **Step 5: Commit**

```bash
git add backend/models.py backend/tests/test_models.py
git commit -m "feat: SQLAlchemy models for bank connections, accounts, balances, transactions"
```

---

## Task 4: Pydantic Schemas

**Files:**
- Create: `backend/schemas.py`

- [ ] **Step 1: Create `backend/schemas.py`**

```python
from datetime import datetime, date
from decimal import Decimal
from typing import Optional
from pydantic import BaseModel
from backend.models import AccountType, TransactionType


# ── Bank / Connection ──────────────────────────────────────

class BankOut(BaseModel):
    name: str
    bic: str
    country: str = "RO"


class ConnectRequest(BaseModel):
    bank_name: str
    bank_id: str  # BIC


class ConnectResponse(BaseModel):
    redirect_url: str
    session_id: str


class ConnectionOut(BaseModel):
    id: int
    bank_id: str
    bank_name: str
    session_id: str
    connected_at: datetime
    is_active: bool

    class Config:
        from_attributes = True


# ── Accounts / Balances ────────────────────────────────────

class BalanceOut(BaseModel):
    amount: Decimal
    currency: str
    last_updated: datetime

    class Config:
        from_attributes = True


class AccountOut(BaseModel):
    id: int
    bank_connection_id: int
    bank_name: str
    external_id: str
    iban: Optional[str]
    name: str
    currency: str
    account_type: AccountType
    balance: Optional[BalanceOut]

    class Config:
        from_attributes = True


class AccountsGrouped(BaseModel):
    checking: list[AccountOut] = []
    savings: list[AccountOut] = []
    deposit: list[AccountOut] = []
    card: list[AccountOut] = []
    other: list[AccountOut] = []


# ── Transactions ───────────────────────────────────────────

class TransactionOut(BaseModel):
    id: int
    account_id: int
    external_id: str
    amount: Decimal
    currency: str
    description: Optional[str]
    booking_date: date
    value_date: Optional[date]
    transaction_type: TransactionType

    class Config:
        from_attributes = True


# ── Sync ───────────────────────────────────────────────────

class SyncStatusOut(BaseModel):
    last_sync: Optional[datetime]
    next_sync: Optional[datetime]
    interval_minutes: int
    banks: list[dict]
```

- [ ] **Step 2: Verify import**

```bash
python -c "from backend.schemas import AccountOut, TransactionOut, SyncStatusOut; print('OK')"
```

Expected: `OK`

- [ ] **Step 3: Commit**

```bash
git add backend/schemas.py
git commit -m "feat: Pydantic schemas for all API responses"
```

---

## Task 5: Banking Service

**Files:**
- Create: `backend/services/banking.py`
- Create: `backend/tests/test_banking.py`

- [ ] **Step 1: Write failing tests**

Create `backend/tests/test_banking.py`:
```python
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
```

- [ ] **Step 2: Run tests — expect FAIL**

```bash
python -m pytest backend/tests/test_banking.py -v
```

Expected: `ImportError: cannot import name 'list_banks'`

- [ ] **Step 3: Create `backend/services/banking.py`**

```python
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
    return {
        "amount": float(amount_data["amount"].lstrip("-")) if amount_data["amount"].startswith("-") else float(amount_data["amount"]),
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
```

- [ ] **Step 4: Run tests — expect PASS**

```bash
python -m pytest backend/tests/test_banking.py -v
```

Expected: all 5 tests `PASSED`

- [ ] **Step 5: Commit**

```bash
git add backend/services/banking.py backend/tests/test_banking.py
git commit -m "feat: banking service wrapping Enable Banking API"
```

---

## Task 6: Banks Router

**Files:**
- Create: `backend/routers/banks.py`
- Create: `backend/tests/test_auth.py` (partial — banks endpoint)

- [ ] **Step 1: Create `backend/main.py`** (stub, will expand in Task 12)

```python
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="MoneyTracking API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

from backend.routers import banks, auth, accounts, transactions, sync
app.include_router(banks.router, prefix="/api")
app.include_router(auth.router, prefix="/api")
app.include_router(accounts.router, prefix="/api")
app.include_router(transactions.router, prefix="/api")
app.include_router(sync.router, prefix="/api")
```

- [ ] **Step 2: Create stub routers** for imports to not fail — create these files with just a router object:

`backend/routers/auth.py`:
```python
from fastapi import APIRouter
router = APIRouter()
```

`backend/routers/accounts.py`:
```python
from fastapi import APIRouter
router = APIRouter()
```

`backend/routers/transactions.py`:
```python
from fastapi import APIRouter
router = APIRouter()
```

`backend/routers/sync.py`:
```python
from fastapi import APIRouter
router = APIRouter()
```

- [ ] **Step 3: Write failing test**

Create `backend/tests/test_auth.py`:
```python
from unittest.mock import patch


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
```

- [ ] **Step 4: Run test — expect FAIL**

```bash
python -m pytest backend/tests/test_auth.py::test_get_banks -v
```

Expected: `404` or import error

- [ ] **Step 5: Create `backend/routers/banks.py`**

```python
from fastapi import APIRouter
from backend.services.banking import list_banks

router = APIRouter()


@router.get("/banks")
def get_banks():
    banks = list_banks()
    return {"banks": [{"name": b["name"], "bic": b.get("bic", ""), "country": "RO"} for b in banks]}
```

- [ ] **Step 6: Run test — expect PASS**

```bash
python -m pytest backend/tests/test_auth.py::test_get_banks -v
```

Expected: `PASSED`

- [ ] **Step 7: Commit**

```bash
git add backend/main.py backend/routers/ backend/tests/test_auth.py
git commit -m "feat: GET /api/banks endpoint"
```

---

## Task 7: Auth Router (Connect + Callback + Connections)

**Files:**
- Modify: `backend/routers/auth.py`
- Modify: `backend/tests/test_auth.py`

- [ ] **Step 1: Write failing tests** — append to `backend/tests/test_auth.py`:

```python
from datetime import datetime, timezone


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
```

- [ ] **Step 2: Run tests — expect FAIL**

```bash
python -m pytest backend/tests/test_auth.py -v
```

Expected: failures on the new tests

- [ ] **Step 3: Replace `backend/routers/auth.py`**

```python
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import HTMLResponse
from sqlalchemy.orm import Session

from backend.database import get_db
from backend.models import BankConnection, Account, AccountType
from backend.schemas import ConnectResponse, ConnectionOut
from backend.services.banking import initiate_consent, fetch_accounts
import os

router = APIRouter()

REDIRECT_URI = os.getenv("REDIRECT_URI", "http://localhost:8000/api/auth/callback")


@router.post("/auth/connect/{bank_id}", response_model=ConnectResponse)
def connect_bank(bank_id: str, body: dict, db: Session = Depends(get_db)):
    bank_name = body.get("bank_name", bank_id)
    result = initiate_consent(bank_name, bank_id, REDIRECT_URI)
    # Store pending connection (session_id known, not yet confirmed)
    existing = db.query(BankConnection).filter_by(bank_id=bank_id, is_active=False).first()
    if existing:
        existing.session_id = result["session_id"]
        existing.connected_at = datetime.now(timezone.utc)
    else:
        conn = BankConnection(
            bank_id=bank_id,
            bank_name=bank_name,
            session_id=result["session_id"],
            connected_at=datetime.now(timezone.utc),
            is_active=False,
        )
        db.add(conn)
    db.commit()
    return result


@router.get("/auth/callback")
def auth_callback(session_id: str, state: str = None, db: Session = Depends(get_db)):
    conn = db.query(BankConnection).filter_by(session_id=session_id).first()
    if not conn:
        raise HTTPException(status_code=404, detail="Session not found")

    conn.is_active = True
    db.commit()

    accounts_data = fetch_accounts(session_id)
    for acc_data in accounts_data:
        existing = db.query(Account).filter_by(external_id=acc_data["uid"]).first()
        if not existing:
            acc = Account(
                bank_connection_id=conn.id,
                external_id=acc_data["uid"],
                iban=acc_data.get("iban"),
                name=acc_data.get("name", "Account"),
                currency=acc_data.get("currency", "RON"),
                account_type=AccountType(acc_data["internal_type"]),
            )
            db.add(acc)
    db.commit()

    return {"status": "connected", "bank": conn.bank_name, "accounts_found": len(accounts_data)}


@router.get("/connections")
def get_connections(db: Session = Depends(get_db)):
    conns = db.query(BankConnection).filter_by(is_active=True).all()
    return {"connections": [ConnectionOut.model_validate(c) for c in conns]}


@router.delete("/connections/{connection_id}")
def delete_connection(connection_id: int, db: Session = Depends(get_db)):
    conn = db.query(BankConnection).filter_by(id=connection_id).first()
    if not conn:
        raise HTTPException(status_code=404, detail="Connection not found")
    conn.is_active = False
    db.commit()
    return {"status": "disconnected"}
```

- [ ] **Step 4: Run tests — expect PASS**

```bash
python -m pytest backend/tests/test_auth.py -v
```

Expected: all tests `PASSED`

- [ ] **Step 5: Commit**

```bash
git add backend/routers/auth.py backend/tests/test_auth.py
git commit -m "feat: auth router — bank connect, OAuth callback, connections CRUD"
```

---

## Task 8: Accounts Router

**Files:**
- Modify: `backend/routers/accounts.py`
- Create: `backend/tests/test_accounts.py`

- [ ] **Step 1: Write failing tests**

Create `backend/tests/test_accounts.py`:
```python
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
```

- [ ] **Step 2: Run tests — expect FAIL**

```bash
python -m pytest backend/tests/test_accounts.py -v
```

Expected: failures

- [ ] **Step 3: Replace `backend/routers/accounts.py`**

```python
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from backend.database import get_db
from backend.models import Account, Balance, BankConnection, AccountType
from backend.schemas import AccountOut, BalanceOut, AccountsGrouped
from backend.services.banking import fetch_balance as _fetch_balance

router = APIRouter()


@router.get("/accounts", response_model=AccountsGrouped)
def get_accounts(db: Session = Depends(get_db)):
    accounts = (
        db.query(Account)
        .join(BankConnection)
        .filter(BankConnection.is_active == True)
        .all()
    )
    grouped = {t.value: [] for t in AccountType}
    for acc in accounts:
        acc_out = AccountOut(
            id=acc.id,
            bank_connection_id=acc.bank_connection_id,
            bank_name=acc.bank_connection.bank_name,
            external_id=acc.external_id,
            iban=acc.iban,
            name=acc.name,
            currency=acc.currency,
            account_type=acc.account_type,
            balance=BalanceOut.model_validate(acc.balance) if acc.balance else None,
        )
        grouped[acc.account_type.value].append(acc_out)
    return grouped


@router.get("/accounts/{account_id}/balance")
def get_live_balance(account_id: int, db: Session = Depends(get_db)):
    acc = db.query(Account).filter_by(id=account_id).first()
    if not acc:
        raise HTTPException(status_code=404, detail="Account not found")
    session_id = acc.bank_connection.session_id
    balance = _fetch_balance(acc.external_id, session_id)
    # Update stored balance
    if acc.balance:
        acc.balance.amount = balance["amount"]
        acc.balance.currency = balance["currency"]
        acc.balance.last_updated = datetime.now(timezone.utc)
    else:
        from backend.models import Balance
        db.add(Balance(account_id=acc.id, amount=balance["amount"],
                       currency=balance["currency"],
                       last_updated=datetime.now(timezone.utc)))
    db.commit()
    return balance
```

- [ ] **Step 4: Run tests — expect PASS**

```bash
python -m pytest backend/tests/test_accounts.py -v
```

Expected: all `PASSED`

- [ ] **Step 5: Commit**

```bash
git add backend/routers/accounts.py backend/tests/test_accounts.py
git commit -m "feat: accounts router — grouped accounts list and live balance"
```

---

## Task 9: Transactions Router

**Files:**
- Modify: `backend/routers/transactions.py`
- Create: `backend/tests/test_transactions.py`

- [ ] **Step 1: Write failing tests**

Create `backend/tests/test_transactions.py`:
```python
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
```

- [ ] **Step 2: Run tests — expect FAIL**

```bash
python -m pytest backend/tests/test_transactions.py -v
```

- [ ] **Step 3: Replace `backend/routers/transactions.py`**

```python
from datetime import date
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from backend.database import get_db
from backend.models import Transaction, Account, BankConnection, TransactionType
from backend.schemas import TransactionOut

router = APIRouter()


@router.get("/transactions")
def get_transactions(
    db: Session = Depends(get_db),
    bank_id: Optional[str] = Query(None),
    account_id: Optional[int] = Query(None),
    date_from: Optional[date] = Query(None),
    date_to: Optional[date] = Query(None),
    transaction_type: Optional[str] = Query(None),
):
    q = (
        db.query(Transaction)
        .join(Account)
        .join(BankConnection)
        .filter(BankConnection.is_active == True)
    )
    if bank_id:
        q = q.filter(BankConnection.bank_id == bank_id)
    if account_id:
        q = q.filter(Transaction.account_id == account_id)
    if date_from:
        q = q.filter(Transaction.booking_date >= date_from)
    if date_to:
        q = q.filter(Transaction.booking_date <= date_to)
    if transaction_type:
        q = q.filter(Transaction.transaction_type == TransactionType(transaction_type))
    txs = q.order_by(Transaction.booking_date.desc()).all()
    return {"transactions": [TransactionOut.model_validate(t) for t in txs]}


@router.get("/accounts/{account_id}/transactions")
def get_account_transactions(
    account_id: int,
    db: Session = Depends(get_db),
    date_from: Optional[date] = Query(None),
    date_to: Optional[date] = Query(None),
):
    acc = db.query(Account).filter_by(id=account_id).first()
    if not acc:
        raise HTTPException(status_code=404, detail="Account not found")
    q = db.query(Transaction).filter_by(account_id=account_id)
    if date_from:
        q = q.filter(Transaction.booking_date >= date_from)
    if date_to:
        q = q.filter(Transaction.booking_date <= date_to)
    txs = q.order_by(Transaction.booking_date.desc()).all()
    return {"transactions": [TransactionOut.model_validate(t) for t in txs]}
```

- [ ] **Step 4: Run tests — expect PASS**

```bash
python -m pytest backend/tests/test_transactions.py -v
```

- [ ] **Step 5: Commit**

```bash
git add backend/routers/transactions.py backend/tests/test_transactions.py
git commit -m "feat: transactions router with date/type/bank filters"
```

---

## Task 10: Sync Service (APScheduler)

**Files:**
- Create: `backend/services/sync_service.py`
- Create: `backend/tests/test_sync.py`

- [ ] **Step 1: Write failing tests**

Create `backend/tests/test_sync.py`:
```python
from datetime import datetime, timezone, date, timedelta
from unittest.mock import patch, MagicMock


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
```

- [ ] **Step 2: Run tests — expect FAIL**

```bash
python -m pytest backend/tests/test_sync.py -v
```

- [ ] **Step 3: Create `backend/services/sync_service.py`**

```python
import os
import logging
from datetime import datetime, timezone, timedelta, date
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError

from backend.models import BankConnection, Account, Balance, Transaction, TransactionType
from backend.services.banking import fetch_balance, fetch_transactions

logger = logging.getLogger(__name__)

_last_sync: datetime | None = None
_scheduler = None


def sync_all(db: Session) -> dict:
    global _last_sync
    connections = db.query(BankConnection).filter_by(is_active=True).all()
    results = []
    date_from = (datetime.now(timezone.utc) - timedelta(days=30)).strftime("%Y-%m-%d")
    date_to = datetime.now(timezone.utc).strftime("%Y-%m-%d")

    for conn in connections:
        try:
            for acc in conn.accounts:
                # Update balance
                balance_data = fetch_balance(acc.external_id, conn.session_id)
                if acc.balance:
                    acc.balance.amount = balance_data["amount"]
                    acc.balance.currency = balance_data["currency"]
                    acc.balance.last_updated = datetime.now(timezone.utc)
                else:
                    db.add(Balance(
                        account_id=acc.id,
                        amount=balance_data["amount"],
                        currency=balance_data["currency"],
                        last_updated=datetime.now(timezone.utc),
                    ))

                # Fetch and insert new transactions
                txs = fetch_transactions(acc.external_id, conn.session_id, date_from, date_to)
                new_count = 0
                for tx in txs:
                    exists = db.query(Transaction).filter_by(external_id=tx["transaction_id"]).first()
                    if exists:
                        continue
                    new_tx = Transaction(
                        account_id=acc.id,
                        external_id=tx["transaction_id"],
                        amount=tx["amount"],
                        currency=tx["currency"],
                        description=tx.get("description", ""),
                        booking_date=date.fromisoformat(tx["booking_date"]),
                        value_date=date.fromisoformat(tx["value_date"]) if tx.get("value_date") else None,
                        transaction_type=TransactionType(tx["transaction_type"]),
                    )
                    db.add(new_tx)
                    new_count += 1

            db.commit()
            results.append({"bank": conn.bank_name, "status": "ok"})
        except Exception as e:
            db.rollback()
            logger.error(f"Sync failed for {conn.bank_name}: {e}")
            results.append({"bank": conn.bank_name, "status": "error", "detail": str(e)})

    _last_sync = datetime.now(timezone.utc)
    return {"synced_at": _last_sync.isoformat(), "banks": results}


def get_last_sync() -> datetime | None:
    return _last_sync


def start_scheduler(interval_minutes: int, db_factory):
    global _scheduler
    from apscheduler.schedulers.background import BackgroundScheduler

    def job():
        db = db_factory()
        try:
            sync_all(db)
        finally:
            db.close()

    _scheduler = BackgroundScheduler()
    _scheduler.add_job(job, "interval", minutes=interval_minutes)
    _scheduler.start()
    logger.info(f"Sync scheduler started — every {interval_minutes} minutes")
    return _scheduler


def stop_scheduler():
    global _scheduler
    if _scheduler and _scheduler.running:
        _scheduler.shutdown()
```

- [ ] **Step 4: Run tests — expect PASS**

```bash
python -m pytest backend/tests/test_sync.py -v
```

- [ ] **Step 5: Commit**

```bash
git add backend/services/sync_service.py backend/tests/test_sync.py
git commit -m "feat: sync service with APScheduler — balance update and transaction dedup"
```

---

## Task 11: Sync Router + Final Main App

**Files:**
- Modify: `backend/routers/sync.py`
- Modify: `backend/main.py`
- Create: `backend/tests/test_sync.py` (append)

- [ ] **Step 1: Write failing tests** — append to `backend/tests/test_sync.py`:

```python
def test_get_sync_status(client):
    response = client.get("/api/sync/status")
    assert response.status_code == 200
    data = response.json()
    assert "last_sync" in data
    assert "interval_minutes" in data


def test_manual_sync_trigger(client, db):
    _seed_connection_and_account(db)
    mock_balance = {"amount": 100.0, "currency": "RON"}
    with patch("backend.routers.sync.sync_all", return_value={"synced_at": "2026-05-19T12:00:00", "banks": []}):
        response = client.post("/api/sync")
    assert response.status_code == 200
    assert "synced_at" in response.json()
```

- [ ] **Step 2: Replace `backend/routers/sync.py`**

```python
import os
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from datetime import datetime, timezone, timedelta

from backend.database import get_db
from backend.services.sync_service import sync_all, get_last_sync

router = APIRouter()

SYNC_INTERVAL = int(os.getenv("SYNC_INTERVAL_MINUTES", "5"))


@router.post("/sync")
def trigger_sync(db: Session = Depends(get_db)):
    result = sync_all(db)
    return result


@router.get("/sync/status")
def get_sync_status(db: Session = Depends(get_db)):
    from backend.models import BankConnection
    last = get_last_sync()
    next_sync = (last + timedelta(minutes=SYNC_INTERVAL)) if last else None
    connections = db.query(BankConnection).filter_by(is_active=True).all()
    return {
        "last_sync": last.isoformat() if last else None,
        "next_sync": next_sync.isoformat() if next_sync else None,
        "interval_minutes": SYNC_INTERVAL,
        "banks": [{"bank_id": c.bank_id, "bank_name": c.bank_name} for c in connections],
    }
```

- [ ] **Step 3: Replace `backend/main.py`** with full version including lifespan:

```python
import os
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from pathlib import Path

load_dotenv(Path(__file__).parent.parent / ".env")

SYNC_INTERVAL = int(os.getenv("SYNC_INTERVAL_MINUTES", "5"))


@asynccontextmanager
async def lifespan(app: FastAPI):
    from backend.database import init_db, SessionLocal
    from backend.services.sync_service import start_scheduler, stop_scheduler
    init_db()
    start_scheduler(SYNC_INTERVAL, SessionLocal)
    yield
    stop_scheduler()


app = FastAPI(title="MoneyTracking API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

from backend.routers import banks, auth, accounts, transactions, sync
app.include_router(banks.router, prefix="/api")
app.include_router(auth.router, prefix="/api")
app.include_router(accounts.router, prefix="/api")
app.include_router(transactions.router, prefix="/api")
app.include_router(sync.router, prefix="/api")
```

- [ ] **Step 4: Run all backend tests**

```bash
python -m pytest backend/tests/ -v
```

Expected: all tests `PASSED`

- [ ] **Step 5: Start server and verify**

```bash
python -m uvicorn backend.main:app --reload
```

Open `http://localhost:8000/docs` — FastAPI Swagger UI should load with all endpoints visible.

- [ ] **Step 6: Commit**

```bash
git add backend/routers/sync.py backend/main.py backend/tests/test_sync.py
git commit -m "feat: sync router, full main app with lifespan scheduler"
```

---

## ─── FRONTEND ──────────────────────────────────────────────

## Task 12: Frontend Setup (Vite + React)

**Files:**
- Create: `frontend/` (full Vite scaffold)

- [ ] **Step 1: Scaffold Vite React project**

```bash
cd C:\projects\moneytracking
npm create vite@latest frontend -- --template react
cd frontend
npm install
```

- [ ] **Step 2: Install dependencies**

```bash
npm install @tanstack/react-query axios react-router-dom recharts
npm install -D @tanstack/react-query-devtools
```

- [ ] **Step 3: Update `frontend/vite.config.js`** to proxy API calls:

```js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': 'http://localhost:8000',
    },
  },
})
```

- [ ] **Step 4: Verify dev server starts**

```bash
npm run dev
```

Expected: `http://localhost:5173` loads React default page.

- [ ] **Step 5: Commit**

```bash
cd C:\projects\moneytracking
git add frontend/
git commit -m "chore: Vite + React frontend scaffold with TanStack Query and React Router"
```

---

## Task 13: API Hooks

**Files:**
- Create: `frontend/src/api/client.js`
- Create: `frontend/src/api/hooks.js`

- [ ] **Step 1: Create `frontend/src/api/client.js`**

```js
import axios from 'axios'

const api = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
})

export default api
```

- [ ] **Step 2: Create `frontend/src/api/hooks.js`**

```js
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from './client'

export function useBanks() {
  return useQuery({
    queryKey: ['banks'],
    queryFn: () => api.get('/banks').then(r => r.data.banks),
  })
}

export function useConnections() {
  return useQuery({
    queryKey: ['connections'],
    queryFn: () => api.get('/connections').then(r => r.data.connections),
    refetchInterval: 3000,
  })
}

export function useConnectBank() {
  return useMutation({
    mutationFn: ({ bank_id, bank_name }) =>
      api.post(`/auth/connect/${bank_id}`, { bank_id, bank_name }).then(r => r.data),
  })
}

export function useDisconnectBank() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id) => api.delete(`/connections/${id}`).then(r => r.data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['connections'] }),
  })
}

export function useAccounts() {
  return useQuery({
    queryKey: ['accounts'],
    queryFn: () => api.get('/accounts').then(r => r.data),
  })
}

export function useLiveBalance(accountId) {
  return useQuery({
    queryKey: ['balance', accountId],
    queryFn: () => api.get(`/accounts/${accountId}/balance`).then(r => r.data),
    enabled: !!accountId,
  })
}

export function useTransactions(filters = {}) {
  const params = new URLSearchParams()
  if (filters.bank_id) params.set('bank_id', filters.bank_id)
  if (filters.account_id) params.set('account_id', filters.account_id)
  if (filters.date_from) params.set('date_from', filters.date_from)
  if (filters.date_to) params.set('date_to', filters.date_to)
  if (filters.transaction_type) params.set('transaction_type', filters.transaction_type)

  return useQuery({
    queryKey: ['transactions', filters],
    queryFn: () => api.get(`/transactions?${params}`).then(r => r.data.transactions),
  })
}

export function useSyncStatus() {
  return useQuery({
    queryKey: ['sync-status'],
    queryFn: () => api.get('/sync/status').then(r => r.data),
    refetchInterval: 30000,
  })
}

export function useManualSync() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => api.post('/sync').then(r => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounts'] })
      queryClient.invalidateQueries({ queryKey: ['transactions'] })
      queryClient.invalidateQueries({ queryKey: ['sync-status'] })
    },
  })
}
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/api/
git commit -m "feat: API client and TanStack Query hooks"
```

---

## Task 14: App Shell (Routing + Layout)

**Files:**
- Modify: `frontend/src/main.jsx`
- Modify: `frontend/src/App.jsx`
- Create: `frontend/src/components/Layout.jsx`

- [ ] **Step 1: Update `frontend/src/main.jsx`**

```jsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import App from './App'
import './index.css'

const queryClient = new QueryClient()

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </QueryClientProvider>
  </React.StrictMode>
)
```

- [ ] **Step 2: Update `frontend/src/App.jsx`**

```jsx
import { Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import Accounts from './pages/Accounts'
import Transactions from './pages/Transactions'
import Settings from './pages/Settings'

export default function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/accounts" element={<Accounts />} />
        <Route path="/transactions" element={<Transactions />} />
        <Route path="/settings" element={<Settings />} />
      </Routes>
    </Layout>
  )
}
```

- [ ] **Step 3: Create `frontend/src/components/Layout.jsx`**

```jsx
import { NavLink } from 'react-router-dom'

const navItems = [
  { to: '/', label: 'Dashboard' },
  { to: '/accounts', label: 'Conturi' },
  { to: '/transactions', label: 'Tranzacții' },
  { to: '/settings', label: 'Setări' },
]

export default function Layout({ children }) {
  return (
    <div style={{ display: 'flex', minHeight: '100vh', fontFamily: 'sans-serif' }}>
      <nav style={{ width: 200, background: '#1a1a2e', padding: '2rem 1rem' }}>
        <h2 style={{ color: '#fff', marginBottom: '2rem', fontSize: '1rem' }}>💰 MoneyTrack</h2>
        {navItems.map(({ to, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            style={({ isActive }) => ({
              display: 'block',
              padding: '0.75rem 1rem',
              marginBottom: '0.5rem',
              borderRadius: 6,
              color: isActive ? '#fff' : '#aaa',
              background: isActive ? '#16213e' : 'transparent',
              textDecoration: 'none',
            })}
          >
            {label}
          </NavLink>
        ))}
      </nav>
      <main style={{ flex: 1, padding: '2rem', background: '#f5f5f5' }}>
        {children}
      </main>
    </div>
  )
}
```

- [ ] **Step 4: Create stub pages** so routing doesn't break:

`frontend/src/pages/Dashboard.jsx`: `export default function Dashboard() { return <h1>Dashboard</h1> }`
`frontend/src/pages/Accounts.jsx`: `export default function Accounts() { return <h1>Conturi</h1> }`
`frontend/src/pages/Transactions.jsx`: `export default function Transactions() { return <h1>Tranzacții</h1> }`
`frontend/src/pages/Settings.jsx`: `export default function Settings() { return <h1>Setări</h1> }`

- [ ] **Step 5: Verify routing works**

```bash
cd frontend && npm run dev
```

Open `http://localhost:5173` — nav should appear and all 4 links should route correctly.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/
git commit -m "feat: app shell with React Router and sidebar navigation"
```

---

## Task 15: Settings Page (Bank Connect Flow)

**Files:**
- Modify: `frontend/src/pages/Settings.jsx`

- [ ] **Step 1: Replace `frontend/src/pages/Settings.jsx`**

```jsx
import { useState } from 'react'
import { useBanks, useConnections, useConnectBank, useDisconnectBank, useSyncStatus, useManualSync } from '../api/hooks'

export default function Settings() {
  const { data: banks = [] } = useBanks()
  const { data: connections = [] } = useConnections()
  const { data: syncStatus } = useSyncStatus()
  const connectBank = useConnectBank()
  const disconnectBank = useDisconnectBank()
  const manualSync = useManualSync()
  const [selectedBank, setSelectedBank] = useState(null)
  const [connecting, setConnecting] = useState(false)

  const handleConnect = async () => {
    if (!selectedBank) return
    setConnecting(true)
    try {
      const result = await connectBank.mutateAsync({
        bank_id: selectedBank.bic,
        bank_name: selectedBank.name,
      })
      window.open(result.redirect_url, '_blank')
    } finally {
      setConnecting(false)
    }
  }

  const connectedIds = new Set(connections.map(c => c.bank_id))

  return (
    <div>
      <h1>Setări</h1>

      <section style={{ marginBottom: '2rem' }}>
        <h2>Conectează o bancă</h2>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <select
            onChange={e => setSelectedBank(banks.find(b => b.bic === e.target.value) || null)}
            defaultValue=""
            style={{ padding: '0.5rem', minWidth: 200 }}
          >
            <option value="" disabled>Alege banca...</option>
            {banks
              .filter(b => !connectedIds.has(b.bic))
              .map(b => (
                <option key={b.bic} value={b.bic}>{b.name}</option>
              ))}
          </select>
          <button
            onClick={handleConnect}
            disabled={!selectedBank || connecting}
            style={{ padding: '0.5rem 1rem', cursor: 'pointer' }}
          >
            {connecting ? 'Se conectează...' : 'Conectează'}
          </button>
        </div>
        {connecting && (
          <p style={{ color: '#666', marginTop: '0.5rem' }}>
            Autorizează accesul în tab-ul deschis, apoi revino aici.
          </p>
        )}
      </section>

      <section style={{ marginBottom: '2rem' }}>
        <h2>Bănci conectate</h2>
        {connections.length === 0 ? (
          <p style={{ color: '#666' }}>Nicio bancă conectată.</p>
        ) : (
          <ul style={{ listStyle: 'none', padding: 0 }}>
            {connections.map(c => (
              <li key={c.id} style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.5rem' }}>
                <span style={{ color: '#2ecc71' }}>✓</span>
                <span>{c.bank_name}</span>
                <button
                  onClick={() => disconnectBank.mutate(c.id)}
                  style={{ marginLeft: 'auto', color: '#e74c3c', background: 'none', border: 'none', cursor: 'pointer' }}
                >
                  Deconectează
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2>Sincronizare</h2>
        {syncStatus && (
          <div>
            <p>Ultima sincronizare: {syncStatus.last_sync ? new Date(syncStatus.last_sync).toLocaleString('ro-RO') : 'Niciodată'}</p>
            <p>Interval: la {syncStatus.interval_minutes} minute</p>
          </div>
        )}
        <button
          onClick={() => manualSync.mutate()}
          disabled={manualSync.isPending}
          style={{ padding: '0.5rem 1rem', cursor: 'pointer' }}
        >
          {manualSync.isPending ? 'Se sincronizează...' : 'Sincronizează acum'}
        </button>
      </section>
    </div>
  )
}
```

- [ ] **Step 2: Test in browser**

With backend running (`python -m uvicorn backend.main:app --reload`) and frontend running (`npm run dev`):
- Navigate to `http://localhost:5173/settings`
- Banca dropdown should load bănci from `/api/banks`
- Butonul "Conectează" să deschidă tab nou cu URL-ul băncii

- [ ] **Step 3: Commit**

```bash
git add frontend/src/pages/Settings.jsx
git commit -m "feat: Settings page with bank connect flow and sync controls"
```

---

## Task 16: Dashboard Page

**Files:**
- Modify: `frontend/src/pages/Dashboard.jsx`
- Create: `frontend/src/components/SummaryCard.jsx`

- [ ] **Step 1: Create `frontend/src/components/SummaryCard.jsx`**

```jsx
export default function SummaryCard({ title, amount, currency = 'RON', color = '#3498db' }) {
  return (
    <div style={{
      background: '#fff', borderRadius: 8, padding: '1.5rem',
      boxShadow: '0 2px 4px rgba(0,0,0,0.1)', borderTop: `4px solid ${color}`,
    }}>
      <p style={{ color: '#666', marginBottom: '0.5rem', fontSize: '0.9rem' }}>{title}</p>
      <p style={{ fontSize: '1.8rem', fontWeight: 'bold', color }}>
        {amount.toLocaleString('ro-RO', { minimumFractionDigits: 2 })} {currency}
      </p>
    </div>
  )
}
```

- [ ] **Step 2: Replace `frontend/src/pages/Dashboard.jsx`**

```jsx
import { useAccounts, useTransactions, useSyncStatus } from '../api/hooks'
import SummaryCard from '../components/SummaryCard'

function sumByType(accounts, type) {
  return (accounts[type] || []).reduce((sum, a) => sum + parseFloat(a.balance?.amount || 0), 0)
}

export default function Dashboard() {
  const { data: accounts, isLoading } = useAccounts()
  const { data: transactions = [] } = useTransactions()
  const { data: syncStatus } = useSyncStatus()

  if (isLoading) return <p>Se încarcă...</p>

  const checking = sumByType(accounts, 'checking')
  const card = sumByType(accounts, 'card')
  const savings = sumByType(accounts, 'savings')
  const deposit = sumByType(accounts, 'deposit')

  const recent = transactions.slice(0, 10)

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h1>Dashboard</h1>
        {syncStatus?.last_sync && (
          <span style={{ color: '#888', fontSize: '0.85rem' }}>
            Sync: {new Date(syncStatus.last_sync).toLocaleString('ro-RO')}
          </span>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
        <SummaryCard title="Card / Cont curent" amount={checking + card} color="#3498db" />
        <SummaryCard title="Economii (Savings)" amount={savings} color="#2ecc71" />
        <SummaryCard title="Depozite" amount={deposit} color="#f39c12" />
        <SummaryCard title="Total" amount={checking + card + savings + deposit} color="#9b59b6" />
      </div>

      <section>
        <h2>Tranzacții recente</h2>
        {recent.length === 0 ? (
          <p style={{ color: '#666' }}>Nicio tranzacție. Conectează o bancă din Setări.</p>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', background: '#fff', borderRadius: 8, overflow: 'hidden' }}>
            <thead style={{ background: '#f8f8f8' }}>
              <tr>
                {['Data', 'Descriere', 'Sumă', 'Tip'].map(h => (
                  <th key={h} style={{ padding: '0.75rem', textAlign: 'left', fontWeight: 600, fontSize: '0.85rem', color: '#555' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {recent.map(tx => (
                <tr key={tx.id} style={{ borderTop: '1px solid #eee' }}>
                  <td style={{ padding: '0.75rem', fontSize: '0.9rem' }}>{tx.booking_date}</td>
                  <td style={{ padding: '0.75rem', fontSize: '0.9rem' }}>{tx.description || '—'}</td>
                  <td style={{ padding: '0.75rem', fontWeight: 600, color: tx.transaction_type === 'credit' ? '#2ecc71' : '#e74c3c' }}>
                    {tx.transaction_type === 'debit' ? '-' : '+'}{parseFloat(tx.amount).toLocaleString('ro-RO', { minimumFractionDigits: 2 })} {tx.currency}
                  </td>
                  <td style={{ padding: '0.75rem', fontSize: '0.85rem', color: '#888' }}>{tx.transaction_type}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/pages/Dashboard.jsx frontend/src/components/SummaryCard.jsx
git commit -m "feat: Dashboard with balance summaries and recent transactions"
```

---

## Task 17: Accounts Page

**Files:**
- Modify: `frontend/src/pages/Accounts.jsx`
- Create: `frontend/src/components/AccountCard.jsx`

- [ ] **Step 1: Create `frontend/src/components/AccountCard.jsx`**

```jsx
export default function AccountCard({ account }) {
  const balance = account.balance
  return (
    <div style={{
      background: '#fff', borderRadius: 8, padding: '1.25rem',
      boxShadow: '0 1px 3px rgba(0,0,0,0.1)', marginBottom: '0.75rem',
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    }}>
      <div>
        <p style={{ fontWeight: 600, marginBottom: '0.25rem' }}>{account.name}</p>
        <p style={{ color: '#888', fontSize: '0.85rem' }}>{account.bank_name} {account.iban ? `· ${account.iban}` : ''}</p>
      </div>
      <div style={{ textAlign: 'right' }}>
        {balance ? (
          <>
            <p style={{ fontWeight: 700, fontSize: '1.1rem' }}>
              {parseFloat(balance.amount).toLocaleString('ro-RO', { minimumFractionDigits: 2 })} {balance.currency}
            </p>
            <p style={{ color: '#aaa', fontSize: '0.75rem' }}>
              {new Date(balance.last_updated).toLocaleString('ro-RO')}
            </p>
          </>
        ) : (
          <p style={{ color: '#aaa' }}>—</p>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Replace `frontend/src/pages/Accounts.jsx`**

```jsx
import { useAccounts } from '../api/hooks'
import AccountCard from '../components/AccountCard'

const SECTIONS = [
  { key: 'checking', label: 'Cont curent / Card' },
  { key: 'card', label: 'Card' },
  { key: 'savings', label: 'Economii' },
  { key: 'deposit', label: 'Depozite' },
  { key: 'other', label: 'Altele' },
]

export default function Accounts() {
  const { data: accounts, isLoading } = useAccounts()

  if (isLoading) return <p>Se încarcă...</p>

  return (
    <div>
      <h1>Conturi</h1>
      {SECTIONS.map(({ key, label }) => {
        const list = accounts?.[key] || []
        if (list.length === 0) return null
        return (
          <section key={key} style={{ marginBottom: '2rem' }}>
            <h2 style={{ fontSize: '1rem', color: '#555', marginBottom: '0.75rem', textTransform: 'uppercase', letterSpacing: 1 }}>
              {label}
            </h2>
            {list.map(acc => <AccountCard key={acc.id} account={acc} />)}
          </section>
        )
      })}
      {!accounts || Object.values(accounts).every(l => l.length === 0) && (
        <p style={{ color: '#666' }}>Nicio bancă conectată. Mergi la Setări.</p>
      )}
    </div>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/pages/Accounts.jsx frontend/src/components/AccountCard.jsx
git commit -m "feat: Accounts page grouped by type"
```

---

## Task 18: Transactions Page

**Files:**
- Modify: `frontend/src/pages/Transactions.jsx`

- [ ] **Step 1: Replace `frontend/src/pages/Transactions.jsx`**

```jsx
import { useState } from 'react'
import { useTransactions, useConnections } from '../api/hooks'

export default function Transactions() {
  const { data: connections = [] } = useConnections()
  const [filters, setFilters] = useState({})
  const { data: transactions = [], isLoading } = useTransactions(filters)

  const setFilter = (key, value) =>
    setFilters(prev => ({ ...prev, [key]: value || undefined }))

  return (
    <div>
      <h1>Tranzacții</h1>

      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        <select onChange={e => setFilter('bank_id', e.target.value)} style={{ padding: '0.5rem' }}>
          <option value="">Toate băncile</option>
          {connections.map(c => <option key={c.bank_id} value={c.bank_id}>{c.bank_name}</option>)}
        </select>
        <select onChange={e => setFilter('transaction_type', e.target.value)} style={{ padding: '0.5rem' }}>
          <option value="">Toate tipurile</option>
          <option value="debit">Debit</option>
          <option value="credit">Credit</option>
        </select>
        <input type="date" placeholder="De la" onChange={e => setFilter('date_from', e.target.value)} style={{ padding: '0.5rem' }} />
        <input type="date" placeholder="Până la" onChange={e => setFilter('date_to', e.target.value)} style={{ padding: '0.5rem' }} />
      </div>

      {isLoading ? <p>Se încarcă...</p> : (
        <table style={{ width: '100%', borderCollapse: 'collapse', background: '#fff', borderRadius: 8, overflow: 'hidden' }}>
          <thead style={{ background: '#f8f8f8' }}>
            <tr>
              {['Data', 'Descriere', 'Sumă', 'Valută', 'Tip'].map(h => (
                <th key={h} style={{ padding: '0.75rem', textAlign: 'left', fontWeight: 600, fontSize: '0.85rem', color: '#555' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {transactions.length === 0 ? (
              <tr><td colSpan={5} style={{ padding: '2rem', textAlign: 'center', color: '#888' }}>Nicio tranzacție găsită.</td></tr>
            ) : transactions.map(tx => (
              <tr key={tx.id} style={{ borderTop: '1px solid #eee' }}>
                <td style={{ padding: '0.75rem', fontSize: '0.9rem' }}>{tx.booking_date}</td>
                <td style={{ padding: '0.75rem', fontSize: '0.9rem' }}>{tx.description || '—'}</td>
                <td style={{ padding: '0.75rem', fontWeight: 600, color: tx.transaction_type === 'credit' ? '#2ecc71' : '#e74c3c' }}>
                  {tx.transaction_type === 'debit' ? '-' : '+'}{parseFloat(tx.amount).toLocaleString('ro-RO', { minimumFractionDigits: 2 })}
                </td>
                <td style={{ padding: '0.75rem', fontSize: '0.9rem' }}>{tx.currency}</td>
                <td style={{ padding: '0.75rem', fontSize: '0.85rem', color: '#888' }}>{tx.transaction_type}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/pages/Transactions.jsx
git commit -m "feat: Transactions page with bank/type/date filters"
```

---

## Task 19: End-to-End Verification

- [ ] **Step 1: Start backend**

```bash
cd C:\projects\moneytracking
.venv\Scripts\activate
python -m uvicorn backend.main:app --reload
```

- [ ] **Step 2: Start frontend**

```bash
cd C:\projects\moneytracking\frontend
npm run dev
```

- [ ] **Step 3: Run all backend tests**

```bash
cd C:\projects\moneytracking
python -m pytest backend/tests/ -v
```

Expected: all tests green.

- [ ] **Step 4: Verify all pages load**

- `http://localhost:5173/` → Dashboard cu card-uri de sold
- `http://localhost:5173/accounts` → Pagina conturi
- `http://localhost:5173/transactions` → Tabel tranzacții cu filtre
- `http://localhost:5173/settings` → Dropdown bănci, buton conectare, status sync

- [ ] **Step 5: Test flow complet în Enable Banking sandbox**

1. Mergi la `/settings`
2. Selectează "Revolut" din dropdown
3. Click "Conectează" → verifică că se deschide tab nou cu URL Enable Banking
4. Autorizează în sandbox
5. Verifică că banca apare în lista "Bănci conectate"
6. Dashboard-ul afișează solduri

- [ ] **Step 6: Final commit**

```bash
git add .
git commit -m "feat: complete MoneyTracking v1 — FastAPI backend + React frontend"
```

---

## Note importante

- **REDIRECT_URI** trebuie înregistrat în Enable Banking dashboard înainte de testul real
- `backend/services/banking.py` folosește Enable Banking API — dacă parametrii endpoints-urilor sunt diferiți față de documentație, ajustează în acel fișier
- Toate testele mockuiesc Enable Banking API — nu necesită conexiune reală
