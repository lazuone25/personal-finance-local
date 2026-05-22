import httpx
import xml.etree.ElementTree as ET
from fastapi import APIRouter, HTTPException
from functools import lru_cache
from datetime import date

router = APIRouter()

BNR_URL = "https://www.bnr.ro/nbrfxrates.xml"

@lru_cache(maxsize=1)
def _fetch_rates_cached(today: str):
    """Cached by date string so it refreshes daily."""
    resp = httpx.get(BNR_URL, timeout=10)
    resp.raise_for_status()
    root = ET.fromstring(resp.content)
    ns = {'bnr': 'http://www.bnr.ro/xsd'}
    rates = {}
    for rate_el in root.findall('.//bnr:Rate', ns):
        currency = rate_el.get('currency')
        multiplier = int(rate_el.get('multiplier', 1))
        try:
            rates[currency] = float(rate_el.text) / multiplier
        except (TypeError, ValueError):
            pass
    return rates

@router.get("/rates")
def get_rates():
    try:
        rates = _fetch_rates_cached(str(date.today()))
        return {"rates": rates, "base": "RON"}
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"BNR fetch failed: {e}")
