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
    state = Column(String, nullable=True)
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


class Deposit(Base):
    __tablename__ = "deposits"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=True)
    bank_name = Column(String, nullable=False)
    amount = Column(Numeric(15, 2), nullable=False)
    currency = Column(String, nullable=False, default="RON")
    interest_rate = Column(Numeric(6, 4), nullable=False)
    start_date = Column(Date, nullable=False)
    maturity_date = Column(Date, nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
