import os
import time
import jwt
import requests
from dotenv import load_dotenv
from pathlib import Path

load_dotenv(Path(__file__).parent.parent / ".env")

APP_ID = os.getenv("ENABLE_BANKING_APP_ID")
KEY_PATH = Path(__file__).parent.parent / os.getenv("ENABLE_BANKING_PRIVATE_KEY_PATH")
BASE_URL = os.getenv("ENABLE_BANKING_BASE_URL", "https://api.enablebanking.com")


def _make_jwt() -> str:
    with open(KEY_PATH, "rb") as f:
        private_key = f.read()

    now = int(time.time())
    payload = {
        "iss": APP_ID,
        "sub": APP_ID,
        "aud": "api.enablebanking.com",
        "iat": now,
        "exp": now + 3600,
    }
    return jwt.encode(payload, private_key, algorithm="RS256", headers={"kid": APP_ID})


def get(path: str) -> dict:
    token = _make_jwt()
    response = requests.get(
        f"{BASE_URL}{path}",
        headers={"Authorization": f"Bearer {token}"},
    )
    if not response.ok:
        print(f"HTTP {response.status_code}: {response.text}")
        response.raise_for_status()
    return response.json()


def post(path: str, body: dict) -> dict:
    token = _make_jwt()
    response = requests.post(
        f"{BASE_URL}{path}",
        json=body,
        headers={"Authorization": f"Bearer {token}"},
    )
    response.raise_for_status()
    return response.json()
