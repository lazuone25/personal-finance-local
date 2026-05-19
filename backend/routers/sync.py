import os
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from datetime import timedelta

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
