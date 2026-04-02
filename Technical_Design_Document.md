# Technical Design Document: CipherStream (E2EE Chat)

**Status:** Initial Architecture / Baseline Release  
**Version:** 0.1.0  
**Repository:** [Insert your GitHub Repository Link Here]

---

## 1. Overview
**CipherStream** is a zero-trust, End-to-End Encrypted (E2EE) real-time chat application. Unlike traditional messaging platforms where the central server has access to plaintext conversations, CipherStream relies on a "zero-trust" backend broker. The backend is designed strictly to route and store ciphertext. All cryptographic operations—including key generation, asymmetric key exchange, and symmetric payload encryption—are offloaded natively to the client's browser using the Web Crypto API.

The core value of this project is providing a robust, non-traditional attack surface for threat modeling, demonstrating practical implementations of secure key exchange and local persistence.

## 2. Motivation
The primary question driving this project is: "How do we comprehensively threat model an application where the server itself is considered an untrusted participant?"

Standard web applications implicitly trust the server. CipherStream shifts the paradigm by focusing on edge-side cryptography. The project was designed with the following tenets:
*   **Zero-Knowledge:** The central database and WebSocket server must never possess the necessary keys to decrypt user payloads.
*   **Transparency:** The cryptographic primitives (RSA-OAEP, AES-GCM) must be auditable and execute natively in the browser without obscure third-party dependencies.
*   **Operational Realism:** Building the application provides a realistic sandbox for creating incident runbooks against complex vectors like client-side XSS key exfiltration and Man-in-the-Middle (MitM) attacks during public key exchanges.

## 3. Project Components & Requirements

### 3.1 Web Crypto Engine (Client-Side)
*   **Framework:** Native Browser `window.crypto.subtle` API.
*   **Purpose:** Handles all cryptographic burdens. It generates an RSA key pair upon user registration, encrypts AES symmetric keys for recipients, and encrypts/decrypts the actual message payloads.

### 3.2 Real-Time Message Broker (Backend)
*   **Framework:** Node.js + Express + Socket.IO.
*   **Purpose:** Manages active WebSocket connections, authenticates users (via JWT for connection identity, not payload encryption), and routes ciphertext to the appropriate active digital sockets in real-time.

### 3.3 Persistence Layer
*   **Storage:** PostgreSQL.
*   **Requirement:** Must persistently store user identities, their associated Public Keys, and an offline queue of encrypted messages. The schema unequivocally disallows plaintext message storage.

### 3.4 WebUI (Frontend Interface)
*   **Framework:** React (Vite) + Tailwind CSS (TypeScript/JavaScript).
*   **Purpose:** A responsive chat interface that seamlessly integrates the Web Crypto Engine. It manages local key storage and handles real-time Socket.IO events to display deciphered messages to the end user.

### 3.5 Infrastructure
*   **Deployment:** Docker + Docker Compose + GitHub Actions.
*   **Requirement:** The entire stack must be orchestrated via Docker Compose for local development and threat modeling scenarios.

## 4. Out of Scope
To maintain a tight focus on the core E2EE threat modeling scope, the following are intentionally excluded from the initial baseline:
*   **Perfect Forward Secrecy (PFS):** Implementing the Double Ratchet algorithm is out of scope. We will rely on static RSA key pairs for this baseline implementation.
*   **Group Chats:** The initial architecture focuses exclusively on 1-to-1 secure messaging.
*   **File/Media Sharing:** Only text-based payloads will be supported initially to simplify the AES encryption pipeline.
*   **Multi-Device Syncing:** Syncing private keys across multiple devices securely is out of scope; a user's identity is tied to the local browser state.

## 5. Practical Technical Decisions

### 5.1 Technology Stack & Rationale
| Decision | Choice | Rationale |
| :--- | :--- | :--- |
| **Backend** | Node.js / Socket.IO | Industry standard for handling highly concurrent, bi-directional WebSocket events natively. |
| **Frontend** | React / Vite | Rapid deployment of complex state management required for handling asynchronous cryptographic routines and UI rendering. |
| **Cryptography** | Web Crypto API | Avoids supply-chain risks associated with third-party crypto libraries by using the browser's audited, native implementations. |
| **Database** | PostgreSQL | Robust relational structure for enforcing strict schema integrity on public keys and cipher payloads. |

### 5.2 Tradeoff Decisions
1.  **Static RSA vs. Ephemeral Keys (PFS):**
    *   *Decision:* Use static RSA key pairs generated at signup.
    *   *Reason:* While PFS offers superior security against future key compromises, static keys significantly reduce architectural complexity for the initial phase, providing a clear vulnerability to document in the incident response runbooks.
2.  **Web Crypto API vs. WebAssembly (Wasm) Crypto:**
    *   *Decision:* Web Crypto API.
    *   *Reason:* Native execution ensures higher performance and less overhead, avoiding the need to compile custom Wasm binaries.
3.  **Local Storage vs. IndexedDB for Private Keys:**
    *   *Decision:* Local Storage (initially).
    *   *Reason:* Easier to implement for the baseline, though it presents a known, documented XSS exfiltration risk that will be explicitly designated as a vector for threat modeling exercises.

## 6. Architecture Diagram (Simplified)
```text
[ Alice's Browser ]                           [ Bob's Browser ]
  (Private Key)     --- Ciphertext --->         (Private Key)
       |                                              |
       +-----------> [ Node.js/Socket.IO ] <----------+
       |                 (Broker)                     |
       v                    |                         v
[ LocalStorage ]            +---> [ PostgreSQL ] [ LocalStorage ]
                            (Public Keys & Ciphertext)
```
