from fastapi import APIRouter
from backend.services.banking import list_banks

router = APIRouter()


@router.get("/banks")
def get_banks():
    ro_banks = list_banks()
    banks_out = [{"name": b["name"], "bic": b.get("bic", ""), "country": "RO"} for b in ro_banks]

    # Revolut Bank UAB is a Lithuanian bank — connecting via LT may expose additional
    # account types (e.g. savings vaults) not visible through the RO endpoint.
    revolut_bics = {b["bic"] for b in banks_out if "revolut" in b["name"].lower()}
    if "REVOLT21" in revolut_bics:
        banks_out.append({"name": "Revolut (EU)", "bic": "REVOLT21", "country": "LT"})

    return {"banks": banks_out}
