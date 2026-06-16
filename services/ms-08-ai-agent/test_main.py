import os
from unittest.mock import AsyncMock, patch
from fastapi.testclient import TestClient
from main import app

client = TestClient(app)

def test_health_check():
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert data["service"] == "ms-08-ai-agent"
    assert "providers" in data
    assert "rag" in data

@patch("main.run_agent", new_callable=AsyncMock)
def test_chat_endpoint_public(mock_run_agent):
    mock_run_agent.return_value = "Hola, soy Nexus. ¿En qué puedo ayudarte?"
    
    payload = {
        "message": "Hola",
        "conversation_id": "test_conv_123",
        "history": []
    }
    
    response = client.post("/chat", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["response"] == "Hola, soy Nexus. ¿En qué puedo ayudarte?"
    assert data["role"] == "public"
    mock_run_agent.assert_called_once()

def test_chat_endpoint_invalid_payload():
    # Test empty message
    payload = {
        "message": "",
        "conversation_id": "test_conv_123",
        "history": []
    }
    response = client.post("/chat", json=payload)
    assert response.status_code == 400

    # Test message too long
    payload["message"] = "a" * 2001
    response = client.post("/chat", json=payload)
    assert response.status_code == 400

def test_chat_secure_endpoint_requires_auth():
    payload = {
        "message": "Reservar laboratorio Cisco",
        "conversation_id": "test_conv_123",
        "history": []
    }
    response = client.post("/chat/secure", json=payload)
    assert response.status_code == 401
    assert "Se requiere autenticación" in response.json()["detail"]
