# Gap Analysis and Potential Improvements

**Author:** Shantanu Vartak  
**Date:** April 2026  

## 1. Introduction
Throughout the development and threat modeling of the "CipherStream" zero-trust E2EE chat application, I leaned heavily on generative AI (LLMs) to construct the baseline architecture, write boilerplate React code, and configure the Docker orchestration. While the AI provided a rapid prototype, my manual review uncovered significant architectural missteps, security oversights, and instances of "AI slop" that demonstrate the limitations of relying purely on auto-generated code for security-critical applications.

## 2. Identified Gaps

### 2.1 The Fundamental Cryptographic Oversight: Authenticity
**Observation:** I asked the AI to "build an E2EE chat where the server is untrusted." It successfully implemented Confidentiality by using RSA for key exchange and AES for message payloads. However, it completely missed **Authenticity**.
**Why it failed:** AI models often piece together tutorials. Most basic Web Crypto tutorials show encryption/decryption, but leave out digital signatures. The AI failed to realize that in a truly "zero-trust" environment, if messages aren't cryptographically signed by the sender, the untrusted server can simply encrypt its own malicious payload using the recipient's public key, append the sender's name to the metadata, and route it. 
**My Supplemental Work:** I identified this massive vulnerability during my STRIDE threat modeling. The client currently blindly trusts the `sender_id` metadata provided by the websocket.

### 2.2 Dangerously Extractable Keys
**Observation:** The AI implemented private key storage using `localStorage`, saving the key as a base64 string or plain JWK.
**Why it failed:** AI took the path of least resistance. It prioritizes code that works immediately over code that is secure.
**My Supplemental Work:** I noted this in my security testing documentation. A single XSS payload can dump the entire cryptographic identity of the user. I recognize that a proper implementation should use `window.crypto.subtle` to generate keys with `extractable: false` and store them in `IndexedDB`, meaning even an XSS attack cannot read the raw private key material out of the browser's memory.

### 2.3 Lack of Out-of-Band Key Verification
**Observation:** The AI built a system where Alice asks the server for Bob's public key, and the server provides it.
**Why it failed:** The AI didn't recognize that if the server is malicious, it can just hand Alice the *server's* public key instead of Bob's. 
**My Research:** Real-world E2EE apps (like Signal/WhatsApp) solve this by allowing users to scan QR codes (Safety Numbers/Security Codes) to verify public key fingerprints out-of-band. The AI-generated code blindly trusts the server's public key directory, which is a critical design flaw.

## 3. Proposed Remediation Plan
To bridge the gap between the AI's naive prototype and a production-ready E2EE system, the following manual engineering tasks are required:

1. **Implement Message Signing:** Add an Ed25519 or RSA-PSS signing step native to the client. Alice signs the AES payload, Bob verifies the signature against Alice's known public key before rendering the message.
2. **Refactor Storage:** Rewrite the storage utility to persist non-extractable `CryptoKey` objects into IndexedDB.
3. **Key Fingerprinting UI:** Build a UI component that hashes a user's public key and displays a fingerprint, allowing users to verify they aren't being MitM'd by the central server.
