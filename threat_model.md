# CipherStream Threat Model

**Author:** Shantanu Vartak  
**Date:** April 2026  
**Methodology:** STRIDE with a Zero-Trust Server Architecture focus.

## 1. Scope & Architecture Assumptions
- **In Scope:** Client-side cryptography (Web Crypto API), Socket.IO message routing, LocalStorage key management, PostgreSQL data at rest.
- **Core Assumption:** The backend application server and database are **fully untrusted**. We assume a malicious actor has root access to the central server and database.

## 2. Threat Analysis (STRIDE)

### 2.1 Spoofing (Identity Impersonation)
- **Threat:** An attacker, or the compromised central server, sends a message to Bob claiming to be Alice.
- **AI's Initial Take:** The AI suggested looking at JWT theft.
- **My Critical Finding:** The AI completely missed a massive cryptographic flaw. While the system uses RSA to encrypt messages (Confidentiality), it never implemented **Digital Signatures** (Authenticity). A compromised server can easily take Bob's public key, encrypt a malicious payload, and route it to Bob with a metadata tag claiming `sender: Alice`. Bob's client will decrypt it with his private key and assume it's from Alice.
- **Risk:** **CRITICAL**. Defeats the zero-trust paradigm.

### 2.2 Tampering (Data Alteration)
- **Threat:** A malicious server alters the ciphertext in transit.
- **Analysis:** AES-GCM is used for the symmetric payload encryption, which provides Authenticated Encryption with Associated Data (AEAD). If the server flips bits in the ciphertext, the GCM auth tag will fail upon decryption on the client.
- **Risk:** **LOW**, assuming the Web Crypto API correctly implements AES-GCM and the client handles throwing decryption errors safely without XSS.

### 2.3 Repudiation
- **Threat:** Alice sends a malicious message to Bob and later denies sending it.
- **Analysis:** Because of the lack of digital signatures (as identified in Spoofing), Alice has plausible deniability. Anyone could have encrypted that message with Bob's public key. 
- **Risk:** **MEDIUM** (Depending on the business case of the chat app).

### 2.4 Information Disclosure
- **Threat 1: Server Compromise.** 
  - **Analysis:** The database only stores ciphertext and public keys. The server cannot read historical messages. **Risk: LOW**.
- **Threat 2: Key Exfiltration via XSS.** 
  - **Analysis:** The technical design utilizes `localStorage` for private keys. If a cross-site scripting (XSS) vulnerability exists on the frontend UI, an attacker can extract the plaintext private key.
  - **Risk:** **HIGH**. 
- **Threat 3: Lack of Perfect Forward Secrecy (PFS).**
  - **Analysis:** Because static RSA key pairs are used, if Alice's private key is ever mathematically broken or physically stolen from her device, an attacker who has been hoarding the server's ciphertext can retroactively decrypt all past conversations.
  - **Risk:** **HIGH**.

### 2.5 Denial of Service (DoS)
- **Threat:** Socket.IO event flooding.
- **Analysis:** A malicious client can spam the backend broker with massive ciphertext payloads, exhausting Node.js memory or PostgreSQL storage. 
- **Risk:** **MEDIUM**.

### 2.6 Elevation of Privilege
- **Threat:** A user gains admin control over the broker.
- **Analysis:** Since the server only routes opaque blobs, "admin" control over the application logic gives no cryptographic advantage over the messages themselves, only availability control.
- **Risk:** **LOW** (in the context of E2EE).

## 3. Threat Mitigation Summary
1. **Immediate Need:** Implement Ed25519 or RSA-PSS digital signatures on all outgoing ciphertexts so the recipient can verify the sender's identity, preventing server-forged messages.
2. **Short-Term:** Restrict UI payload rendering to strict text (no innerHTML) to mitigate XSS targeting `localStorage`.
3. **Long-Term:** Migrate from static RSA to the Double Ratchet algorithm for PFS, and move key material to `IndexedDB` using non-extractable `CryptoKey` objects.
