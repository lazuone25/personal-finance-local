import os
import logging
from datetime import datetime, timezone, timedelta, date
from sqlalchemy.orm import Session

from backend.models import BankConnection, Account, Balance, Transaction, TransactionType
from backend.services.banking import fetch_balance, fetch_transactions

logger = logging.getLogger(__name__)

_last_sync: datetime | None = None
_scheduler = None

# Per-bank last sync times to enforce different intervals per bank
_bank_last_sync: dict[str, datetime] = {}

# Banks that need a longer sync interval (minutes) due to strict rate limits
SLOW_BANK_INTERVALS: dict[str, int] = {
    "Raiffeisen": int(os.getenv("RAIFFEISEN_SYNC_INTERVAL_MINUTES", "720")),  # 12h default
}


def _should_sync_bank(conn_id: int, bank_name: str, default_interval_minutes: int) -> bool:
    interval = SLOW_BANK_INTERVALS.get(bank_name, default_interval_minutes)
    last = _bank_last_sync.get(conn_id)
    if last is None:
        return True
    return (datetime.now(timezone.utc) - last).total_seconds() >= interval * 60


def sync_all(db: Session, force_bank: str | None = None) -> dict:
    global _last_sync
    connections = db.query(BankConnection).filter_by(is_active=True).all()
    results = []
    date_from = (datetime.now(timezone.utc) - timedelta(days=30)).strftime("%Y-%m-%d")
    date_to = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    default_interval = int(os.getenv("SYNC_INTERVAL_MINUTES", "30"))

    for conn in connections:
        if force_bank and conn.bank_name != force_bank:
            continue
        if not force_bank and not _should_sync_bank(conn.id, conn.bank_name, default_interval):
            logger.info(f"Skipping {conn.bank_name} (id={conn.id}) — synced recently (interval: {SLOW_BANK_INTERVALS.get(conn.bank_name, default_interval)} min)")
            results.append({"bank": conn.bank_name, "status": "skipped"})
            continue

        conn_ok = True
        for acc in conn.accounts:
            try:
                # Update balance
                balance_data = fetch_balance(acc.external_id)
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
                txs = fetch_transactions(acc.external_id, date_from, date_to)
                for tx in txs:
                    if not tx.get("booking_date"):
                        continue
                    exists = db.query(Transaction).filter_by(external_id=tx["transaction_id"]).first()
                    if exists:
                        continue
                    new_tx = Transaction(
                        account_id=acc.id,
                        external_id=tx["transaction_id"],
                        amount=tx["amount"],
                        currency=tx["currency"],
                        description=tx.get("description") or None,
                        booking_date=date.fromisoformat(tx["booking_date"]),
                        value_date=date.fromisoformat(tx["value_date"]) if tx.get("value_date") else None,
                        transaction_type=TransactionType(tx["transaction_type"]),
                    )
                    db.add(new_tx)

                db.commit()  # commit per account — rollback affects only this account
            except Exception as e:
                db.rollback()
                conn_ok = False
                logger.error(f"Sync failed for account {acc.external_id}: {e}")

        if conn_ok:
            _bank_last_sync[conn.id] = datetime.now(timezone.utc)
            results.append({"bank": conn.bank_name, "status": "ok"})
        else:
            results.append({"bank": conn.bank_name, "status": "partial_error"})

    _last_sync = datetime.now(timezone.utc)
    return {"synced_at": _last_sync.isoformat(), "banks": results}


def get_last_sync() -> datetime | None:
    return _last_sync


def _add_daily_interest():
    """Adaugă dobânda zilnică (net după 10% impozit) la soldurile din extra_data.json."""
    import json
    import pathlib
    import math
    extra_file = pathlib.Path(__file__).parent.parent / "extra_data.json"
    if not extra_file.exists():
        return
    with open(extra_file, "r", encoding="utf-8") as f:
        data = json.load(f)

    # Economii Revolut 3%/an net 90%
    balance = data.get("main_balance", 0)
    daily_economii = math.ceil(balance * 0.03 / 365 * 0.9 * 100) / 100
    data["main_balance"] = round(balance + daily_economii, 2)

    # Fond urgență 2.5%/an net 90%
    fond = data.get("fond_urgenta", {})
    fond_amount = fond.get("amount", 0)
    fond_rate = fond.get("interest_rate", 0.025)
    daily_urgenta = math.ceil(fond_amount * fond_rate / 365 * 0.9 * 100) / 100
    fond["amount"] = round(fond_amount + daily_urgenta, 2)
    data["fond_urgenta"] = fond

    with open(extra_file, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False)
    logger.info(f"Dobândă zilnică adăugată: +{daily_economii} RON economii, +{daily_urgenta} RON fond urgență")


def start_scheduler(interval_minutes: int, db_factory):
    global _scheduler
    from apscheduler.schedulers.background import BackgroundScheduler
    from apscheduler.triggers.cron import CronTrigger

    def sync_job():
        db = db_factory()
        try:
            sync_all(db)
        finally:
            db.close()

    _scheduler = BackgroundScheduler()
    _scheduler.add_job(sync_job, "interval", minutes=interval_minutes)
    # Dobânda zilnică la 00:01 în fiecare dimineață
    _scheduler.add_job(_add_daily_interest, CronTrigger(hour=0, minute=1))
    _scheduler.start()
    logger.info(f"Sync scheduler started — every {interval_minutes} minutes + dobândă zilnică la 00:01")
    return _scheduler


def stop_scheduler():
    global _scheduler
    if _scheduler and _scheduler.running:
        _scheduler.shutdown()
