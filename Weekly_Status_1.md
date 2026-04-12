# Weekly Status 1

## 1. Project Description and Motivation
**Description:** I am building a web-based End-to-End Encrypted (E2EE) Chat Application. It features a real-time messaging interface powered by WebSockets (Socket.IO), where all cryptographic operations—such as RSA key pair generation, public key exchange, and AES message encryption—occur natively within the user's browser via the Web Crypto API. The central server operates on a "zero-trust" model, exclusively routing and storing undecipherable ciphertext without ever possessing the keys to decrypt the chat payloads.

**Motivation:** I want to work on this project because it provides a highly prevalent, non-traditional attack surface that is perfect for threat modeling and creating incident runbooks. Unlike a standard application where the database and server are implicitly trusted, an E2EE architecture shifts the security perimeter entirely to the client side. This will allow me to operationally explore complex security scenarios, such as mitigating Cross-Site Scripting (XSS) attacks targeting local private key storage, analyzing Man-in-the-Middle (MitM) risks during initial public key exchanges, and handling the operational impact of user key loss.

## 2. Project Requirements (Operational Responsibilities)
As the Project Owner, I am operationally responsible for designing, deploying, and securing the following architecture components:

- **Client-Side Cryptographic Engine:** Ensuring robust key generation (e.g., RSA-OAEP) and message encryption (e.g., AES-GCM) exclusively within the React frontend, guaranteeing private keys never traverse the network.
- **Real-Time Message Broker (Backend):** Maintaining a Node.js/Socket.IO backend infrastructure responsible for reliably routing ciphertext between active clients.
- **Zero-Knowledge Data Persistence:** Managing a PostgreSQL database schema responsible for persistently storing user identities, public keys, and offline encrypted messages.
- **DevOps & CI/CD Pipeline:** Operating automated GitHub Actions workflows to lint, test, and package the microservices into Docker containers for reliable deployment.
- **Security Posture & Incident Response:** Continuously conducting threat modeling against the zero-trust architecture, and formulating actionable incident response runbooks for theoretical compromises (e.g., database exfiltration, hijacked WebSockets, or frontend dependency supply-chain attacks).
