# Security Test Documentation

**Author:** Shantanu Vartak  
**Date:** April 2026  

## 1. Objective
To validate the zero-trust architecture of the CipherStream E2EE chat application, specifically testing cryptographic boundaries, local storage vulnerabilities, and the "untrusted server" paradigm.

## 2. Test Environments
- Local Docker orchestration (`docker-compose up --build`)
- Web browsers: Google Chrome, Mozilla Firefox.

## 3. Test Cases

### Test Case 1: Server Blindness to Plaintext (Confidentiality)
- **Description:** Verify that the backend database and server logs never receive or store the plaintext of user messages.
- **Prerequisites:** Two registered users (Alice & Bob).
- **Execution Steps:**
  1. Login as Alice and open a chat with Bob.
  2. Send the message: `SECRET_FLAG_12345`.
  3. Connect to the running PostgreSQL container (`docker exec -it cipherstream_db psql -U postgres -d cipherstream_db`).
  4. Query the messages table: `SELECT * FROM messages;`
- **Expected Result:** The `content` or `payload` column should contain an RSA-encrypted AES key and an AES-GCM encrypted blob. The string `SECRET_FLAG_12345` must not appear anywhere in the database.

### Test Case 2: Untrusted Server Sender Forgery (Authenticity)
- **Description:** Demonstrate the critical flaw I discovered during threat modeling: the lack of digital signatures allows the untrusted server to forge messages.
- **Prerequisites:** Bob's public key is known.
- **Execution Steps:**
  1. Write a custom external script that fetches Bob's public RSA key from the server's public key endpoint.
  2. Generate a random AES key, encrypt the string `FAKE_MESSAGE_FROM_ALICE` with AES-GCM.
  3. Encrypt the AES key with Bob's public RSA key.
  4. Manually emit a Socket.IO event to the backend broker, setting the sender ID to "Alice's ID" and the recipient to Bob.
- **Expected Result:** Bob's browser UI should decrypt the message and seamlessly display it as coming from Alice, proving the server can freely forge identities.

### Test Case 3: XSS Key Exfiltration (Client-Side Storage)
- **Description:** Prove that an XSS vulnerability would result in total cryptographic compromise of the local user.
- **Prerequisites:** Target user is logged in.
- **Execution Steps:**
  1. Open the browser's Developer Tools Console (simulating an XSS execution context).
  2. Execute: `console.log(localStorage.getItem('privateKey'))` (or the equivalent local storage key).
- **Expected Result:** The raw PKCS#8 or JWK private key is printed to the console, proving it is extractable.

### Test Case 4: Key Exchange Man-in-the-Middle (MitM)
- **Description:** Test if the client blindly trusts the public key provided by the server during initial key exchange.
- **Prerequisites:** A proxy proxying websocket/HTTP requests between Alice and the server.
- **Execution Steps:**
  1. Alice requests Bob's public key from the server.
  2. Intercept the server's response and replace Bob's public key with the Attacker's public key.
  3. Let Alice send a message.
- **Expected Result:** Alice encrypts the message using the Attacker's public key. The attacker can decrypt it. This proves a malicious server can perform an active MitM attack because public keys are not fingerprinted or verified out-of-band by the users.
