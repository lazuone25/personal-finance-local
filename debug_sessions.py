import sys, json
sys.path.insert(0, "src")
from client import get

print("=== Sesiuni existente ===")
try:
    data = get("/sessions")
    print(json.dumps(data, indent=2))
except Exception as e:
    print(f"EROARE /sessions: {e}")

print("\n=== Conturi existente ===")
try:
    data = get("/accounts")
    print(json.dumps(data, indent=2))
except Exception as e:
    print(f"EROARE /accounts: {e}")
