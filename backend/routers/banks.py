from fastapi import APIRouter
from backend.services.banking import list_banks

router = APIRouter()


@router.get("/banks")
def get_banks():
    banks = list_banks()
    return {"banks": [{"name": b["name"], "bic": b.get("bic", ""), "country": "RO"} for b in banks]}
