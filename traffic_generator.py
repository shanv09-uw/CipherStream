import time
import uuid
import requests
import socketio
import threading

BASE_URL = 'http://localhost:5000'
sio = socketio.Client()

def background_http_traffic():
    """Continuously spam the API to generate HTTP traffic and auth errors."""
    while True:
        try:
            # Hit the health endpoint to spike general API traffic
            requests.get(f"{BASE_URL}/api/health", timeout=2)
            
            # Register a fake user to spike registration metrics
            username = f"test_user_{uuid.uuid4().hex[:8]}"
            res = requests.post(f"{BASE_URL}/api/register", json={
                "username": username,
                "password": "password123",
                "public_key": "fake_pub_key",
                "encrypted_private_key": "fake_priv_key"
            }, timeout=2)
            
            if res.status_code == 201:
                # Deliberately fail login to spike Auth Errors
                requests.post(f"{BASE_URL}/api/login", json={
                    "username": username,
                    "password": "WRONG_PASSWORD"
                }, timeout=2)
                
            time.sleep(3) # Wait 3 seconds before next cycle
        except Exception as e:
            time.sleep(3)

def generate_websocket_traffic():
    """Connect a WebSocket and spam encrypted payloads."""
    # First, register a valid user to get a token
    username = f"ws_user_{uuid.uuid4().hex[:8]}"
    res = requests.post(f"{BASE_URL}/api/register", json={
        "username": username,
        "password": "password123",
        "public_key": "fake_pub_key",
        "encrypted_private_key": "fake_priv_key"
    })
    
    if res.status_code != 201:
        print("Failed to register WebSocket user.")
        return
        
    token = res.json().get("token")
    user_id = res.json().get("user", {}).get("id")

    @sio.event
    def connect():
        print(f"WebSocket Connected: {username}")
        
    @sio.event
    def disconnect():
        print("WebSocket Disconnected")

    try:
        # Connect using the JWT token
        sio.connect(BASE_URL, auth={'token': token})
        
        while True:
            # Spam a 1KB encrypted payload to spike the Bandwidth and Message throughput charts
            fake_payload = "A" * 1024
            sio.emit('private_message', {
                'receiver_id': user_id, # Send to self
                'encrypted_aes_key': 'fake_key',
                'sender_encrypted_aes_key': 'fake_key',
                'encrypted_payload': fake_payload
            })
            time.sleep(2) # Send message every 2 seconds
            
    except Exception as e:
        print(f"WebSocket connection failed: {e}")

if __name__ == '__main__':
    print("Starting Python Traffic Generator for CipherStream Dashboard...")
    
    # Start HTTP traffic generator in a background thread
    threading.Thread(target=background_http_traffic, daemon=True).start()
    
    # Start WebSocket traffic in the main thread
    generate_websocket_traffic()
