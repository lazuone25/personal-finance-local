from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException
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
    # Store pending connection (is_active=False until callback confirms)
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
