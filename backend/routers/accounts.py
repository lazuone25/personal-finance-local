from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from backend.database import get_db
from backend.models import Account, Balance, BankConnection, AccountType
from backend.schemas import AccountOut, BalanceOut, AccountsGrouped
from backend.services.banking import fetch_balance

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
    balance = fetch_balance(acc.external_id, session_id)
    # Update stored balance
    if acc.balance:
        acc.balance.amount = balance["amount"]
        acc.balance.currency = balance["currency"]
        acc.balance.last_updated = datetime.now(timezone.utc)
    else:
        db.add(Balance(
            account_id=acc.id,
            amount=balance["amount"],
            currency=balance["currency"],
            last_updated=datetime.now(timezone.utc),
        ))
    db.commit()
    return balance
