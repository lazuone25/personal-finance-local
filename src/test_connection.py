from client import get

TARGET_BANKS = ["revolut", "ing", "raiffeisen"]

data = get("/aspsps?country=RO")

banks = data.get("aspsps", [])
print(f"Toate băncile din România: {len(banks)}\n")

print("Toate băncile:")
for bank in banks:
    print(f"  {bank['name']} — bic: {bank.get('bic', 'N/A')}, beta: {bank.get('beta', False)}")

print("\nBănci relevante:")
for bank in banks:
    name_lower = bank["name"].lower()
    if any(t in name_lower for t in TARGET_BANKS):
        print(f"  ✓ {bank['name']} — bic: {bank.get('bic', 'N/A')}")
