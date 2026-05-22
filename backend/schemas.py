from datetime import datetime, date
from decimal import Decimal
from typing import Optional
from pydantic import BaseModel, ConfigDict
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


class ConnectionOut(BaseModel):
    id: int
    bank_id: str
    bank_name: str
    session_id: str
    connected_at: datetime
    is_active: bool

    model_config = ConfigDict(from_attributes=True)


# ── Accounts / Balances ────────────────────────────────────

class BalanceOut(BaseModel):
    amount: Decimal
    currency: str
    last_updated: datetime

    model_config = ConfigDict(from_attributes=True)


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

    model_config = ConfigDict(from_attributes=True)


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

    model_config = ConfigDict(from_attributes=True)


# ── Sync ───────────────────────────────────────────────────

class SyncStatusOut(BaseModel):
    last_sync: Optional[datetime]
    next_sync: Optional[datetime]
    interval_minutes: int
    banks: list[dict]
