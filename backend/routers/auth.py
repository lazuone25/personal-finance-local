from datetime import datetime, timezone
from fastapi import APIRouter, Body, Depends, HTTPException
from sqlalchemy.orm import Session

from backend.database import get_db
from backend.models import BankConnection, Account, AccountType
from backend.schemas import ConnectResponse, ConnectionOut
from backend.services.banking import initiate_consent, confirm_session
import os

router = APIRouter()

REDIRECT_URI = os.getenv("REDIRECT_URI", "http://localhost:8000/api/auth/callback")


@router.post("/auth/connect/{bank_id}", response_model=ConnectResponse)
def connect_bank(bank_id: str, body: dict = Body(...), db: Session = Depends(get_db)):
    bank_name = body.get("bank_name", bank_id)
    country = body.get("country", "RO")
    owner = body.get("owner", "andrei")
    result = initiate_consent(bank_name, bank_id, REDIRECT_URI, country)
    # Reuse pending (not yet confirmed) connection for same bank + owner
    existing = db.query(BankConnection).filter_by(bank_id=bank_id, owner=owner, is_active=False).first()
    if existing:
        existing.session_id = result["authorization_id"]
        existing.state = result["state"]
        existing.connected_at = datetime.now(timezone.utc)
    else:
        conn = BankConnection(
            bank_id=bank_id,
            bank_name=bank_name,
            session_id=result["authorization_id"],
            state=result["state"],
            connected_at=datetime.now(timezone.utc),
            is_active=False,
            owner=owner,
        )
        db.add(conn)
    db.commit()
    return {"redirect_url": result["redirect_url"]}


@router.get("/auth/callback")
def auth_callback(state: str, code: str, db: Session = Depends(get_db)):
    conn = db.query(BankConnection).filter_by(state=state).first()
    if not conn:
        raise HTTPException(status_code=404, detail="Session not found")

    session_data = confirm_session(code)
    conn.session_id = session_data["session_id"]
    conn.is_active = True

    # Deactivate only previous connections for the same bank + same owner (reconnect)
    old_conns = db.query(BankConnection).filter(
        BankConnection.bank_id == conn.bank_id,
        BankConnection.owner == conn.owner,
        BankConnection.id != conn.id,
        BankConnection.is_active == True,
    ).all()
    for old in old_conns:
        old.is_active = False

    db.commit()

    for acc_data in session_data["accounts"]:
        uid = acc_data["uid"]
        # Primary dedup: exact external_id match
        existing = db.query(Account).filter_by(external_id=uid).first()
        if existing:
            continue
        # Secondary dedup: same bank + currency + name — handles banks that rotate UIDs on reconnect
        existing_by_attrs = db.query(Account).filter_by(
            bank_connection_id=conn.id,
            currency=acc_data.get("currency", "RON"),
            name=acc_data.get("name", "Account"),
        ).first()
        if existing_by_attrs:
            # Update UID so future syncs use the new one
            existing_by_attrs.external_id = uid
            continue
        acc = Account(
            bank_connection_id=conn.id,
            external_id=uid,
            iban=acc_data.get("iban"),
            name=acc_data.get("name", "Account"),
            currency=acc_data.get("currency", "RON"),
            account_type=AccountType(acc_data["internal_type"]),
        )
        db.add(acc)
    db.commit()

    return {"status": "connected", "bank": conn.bank_name, "accounts_found": len(session_data["accounts"])}


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
