import httpx

def run_test():
    client = httpx.Client(timeout=60.0)
    print("1. Connecting to login endpoint...")
    login_res = client.post("http://127.0.0.1:8000/api/login", json={"username": "TestAdvocate"})
    print("Login Response:", login_res.json())
    user_id = login_res.json().get("user_id")

    print("\n2. Testing upload endpoint with a .txt file...")
    # Upload a small text evidence file
    files = {"file": ("breach_details.txt", b"Clause 10: Late delivery fee is 5000 INR per day.", "text/plain")}
    data = {"user_id": user_id}
    upload_res = client.post("http://127.0.0.1:8000/api/upload", files=files, data=data)
    print("Upload Response:", upload_res.json())

    # Query about the newly uploaded case details
    print("\n3. Querying about the newly uploaded case details...")
    chat_res = client.post("http://127.0.0.1:8000/api/chat", json={
        "text": "What is the penalty fee for late delivery?",
        "user_id": user_id
    })
    chat_data = chat_res.json()
    print("Structured Reasoning:\n", chat_data.get("structured_reasoning"))
    print("\nSynthesized Voice Text:\n", chat_data.get("voice_text"))

if __name__ == "__main__":
    run_test()
