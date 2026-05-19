from unittest.mock import patch


def test_get_banks(client):
    mock_banks = [
        {"name": "Revolut", "bic": "REVOLT21", "country": "RO"},
        {"name": "ING Bank", "bic": "INGBROBU", "country": "RO"},
    ]
    with patch("backend.routers.banks.list_banks", return_value=mock_banks):
        response = client.get("/api/banks")
    assert response.status_code == 200
    data = response.json()
    assert "banks" in data
    assert len(data["banks"]) == 2
    assert data["banks"][0]["bic"] == "REVOLT21"
