import os
from XTBClient.client.xtb import XTBSyncClient
from XTBClient.models.models import ConnectionMode

def _mode():
    m = os.getenv("XTB_MODE", "real").lower()
    return ConnectionMode.REAL if m == "real" else ConnectionMode.DEMO

def get_portfolio():
    user = os.getenv("XTB_USER", "")
    password = os.getenv("XTB_PASSWORD", "")
    if not user or not password:
        return None

    with XTBSyncClient(user, password, mode=_mode()) as client:
        user_data = client.get_current_user_data()
        trades = client.get_trades(False)

    positions = []
    total_profit = 0.0
    for t in trades:
        profit = float(t.profit) if t.profit is not None else 0.0
        open_price = float(t.open_price) if t.open_price is not None else 0.0
        current_price = float(t.close_price) if t.close_price is not None else open_price
        volume = float(t.volume) if t.volume is not None else 0.0
        value = current_price * volume
        total_profit += profit
        positions.append({
            "symbol": str(t.symbol),
            "volume": volume,
            "open_price": open_price,
            "current_price": current_price,
            "profit": profit,
            "value": value,
        })

    return {
        "balance": float(user_data.balance) if user_data.balance is not None else 0.0,
        "equity": float(user_data.equity) if user_data.equity is not None else 0.0,
        "currency": str(user_data.currency) if user_data.currency else "EUR",
        "positions": positions,
        "total_profit": total_profit,
    }
