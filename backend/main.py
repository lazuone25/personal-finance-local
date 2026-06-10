import os
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from pathlib import Path

load_dotenv(Path(__file__).parent.parent / ".env")

SYNC_INTERVAL = int(os.getenv("SYNC_INTERVAL_MINUTES", "5"))


@asynccontextmanager
async def lifespan(app: FastAPI):
    from backend.database import init_db, SessionLocal
    from backend.services.sync_service import start_scheduler, stop_scheduler, _add_daily_interest
    init_db()
    # Recuperează dobânda zilnică pentru zilele în care serverul a fost oprit la 00:01
    _add_daily_interest()
    start_scheduler(SYNC_INTERVAL, SessionLocal)
    yield
    stop_scheduler()


app = FastAPI(title="MoneyTracking API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

from backend.routers import banks, auth, accounts, transactions, sync
from backend.routers.deposits import router as deposits_router
from backend.routers.rates import router as rates_router
from backend.routers.xtb import router as xtb_router
from backend.routers.extra import router as extra_router
from backend.routers.datorii import router as datorii_router
from backend.routers.categories import router as categories_router
app.include_router(banks.router, prefix="/api")
app.include_router(auth.router, prefix="/api")
app.include_router(accounts.router, prefix="/api")
app.include_router(transactions.router, prefix="/api")
app.include_router(sync.router, prefix="/api")
app.include_router(deposits_router, prefix="/api")
app.include_router(rates_router, prefix="/api")
app.include_router(xtb_router, prefix="/api")
app.include_router(extra_router, prefix="/api")
app.include_router(datorii_router, prefix="/api")
app.include_router(categories_router, prefix="/api")
