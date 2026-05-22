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
    transaction_type: Optional[TransactionType] = Query(default=None),
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
        q = q.filter(Transaction.transaction_type == transaction_type)
    txs = q.order_by(Transaction.booking_date.desc()).all()
    result = []
    for t in txs:
        out = TransactionOut.model_validate(t)
        out.bank_name = t.account.bank_connection.bank_name if t.account and t.account.bank_connection else ""
        result.append(out)
    return {"transactions": result}


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
    result = []
    for t in txs:
        out = TransactionOut.model_validate(t)
        out.bank_name = t.account.bank_connection.bank_name if t.account and t.account.bank_connection else ""
        result.append(out)
    return {"transactions": result}
