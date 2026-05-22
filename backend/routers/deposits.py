from datetime import date, datetime, timezone
from decimal import Decimal
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from backend.database import get_db
from backend.models import Deposit
from backend.schemas import DepositIn, DepositOut

router = APIRouter()


def _compute_fields(deposit: Deposit, today: date) -> dict:
    start = deposit.start_date
    maturity = deposit.maturity_date
    rate = float(deposit.interest_rate)
    principal = float(deposit.amount)

    term_days = (maturity - start).days
    days_elapsed = max(0, (today - start).days)
    days_remaining = max(0, (maturity - today).days)

    interest_earned = Decimal(str(principal * (rate / 100) * (days_elapsed / 365)))
    total_at_maturity = Decimal(str(principal * (1 + (rate / 100) * (term_days / 365))))

    return {
        "interest_earned": round(interest_earned, 2),
        "total_at_maturity": round(total_at_maturity, 2),
        "days_remaining": days_remaining,
    }


def _to_out(deposit: Deposit) -> DepositOut:
    today = datetime.now(timezone.utc).date()
    fields = _compute_fields(deposit, today)
    return DepositOut(
        id=deposit.id,
        name=deposit.name,
        bank_name=deposit.bank_name,
        amount=deposit.amount,
        currency=deposit.currency,
        interest_rate=deposit.interest_rate,
        start_date=deposit.start_date,
        maturity_date=deposit.maturity_date,
        created_at=deposit.created_at,
        **fields,
    )


@router.get("/deposits", response_model=list[DepositOut])
def get_deposits(db: Session = Depends(get_db)):
    deposits = db.query(Deposit).order_by(Deposit.maturity_date.asc()).all()
    return [_to_out(d) for d in deposits]


@router.post("/deposits", response_model=DepositOut)
def create_deposit(data: DepositIn, db: Session = Depends(get_db)):
    deposit = Deposit(**data.model_dump())
    db.add(deposit)
    db.commit()
    db.refresh(deposit)
    return _to_out(deposit)


@router.put("/deposits/{deposit_id}", response_model=DepositOut)
def update_deposit(deposit_id: int, data: DepositIn, db: Session = Depends(get_db)):
    deposit = db.query(Deposit).filter_by(id=deposit_id).first()
    if not deposit:
        raise HTTPException(status_code=404, detail="Deposit not found")
    for key, value in data.model_dump().items():
        setattr(deposit, key, value)
    db.commit()
    db.refresh(deposit)
    return _to_out(deposit)


@router.delete("/deposits/{deposit_id}")
def delete_deposit(deposit_id: int, db: Session = Depends(get_db)):
    deposit = db.query(Deposit).filter_by(id=deposit_id).first()
    if not deposit:
        raise HTTPException(status_code=404, detail="Deposit not found")
    db.delete(deposit)
    db.commit()
    return {"ok": True}
