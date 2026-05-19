import os
import logging
from datetime import datetime, timezone, timedelta, date
from sqlalchemy.orm import Session

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
