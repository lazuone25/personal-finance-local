import sys, uuid, json
sys.path.insert(0, "src")
from client import _make_jwt
from datetime import datetime, timezone, timedelta
import requests, os
from dotenv import load_dotenv

load_dotenv(".env")
BASE_URL = os.getenv("ENABLE_BANKING_BASE_URL", "https://api.enablebanking.com")
REDIRECT_URI = os.getenv("REDIRECT_URI")

print(f"Folosesc redirect_url: {REDIRECT_URI}\n")

token = _make_jwt()
valid_until = (datetime.now(timezone.utc) + timedelta(days=30)).strftime("%Y-%m-%dT%H:%M:%SZ")
body = {
    "access": {"valid_until": valid_until, "balances": True, "transactions": True},
    "aspsp": {"name": "Revolut", "country": "RO"},
    "state": str(uuid.uuid4()),
    "redirect_url": REDIRECT_URI,
    "psu_type": "personal",
}
r = requests.post(f"{BASE_URL}/auth", json=body, headers={"Authorization": f"Bearer {token}"})
print(f"Status: {r.status_code}")
print(json.dumps(r.json(), indent=2))
