# CipherStream (E2EE Chat)

A modern, zero-trust End-to-End Encrypted (E2EE) web chat application built to establish an advanced threat modeling security surface.

## Architecture

*   **Frontend**: React (Vite) + Tailwind CSS + *Web Crypto API*
*   **Backend**: Node.js + Express + *Socket.IO*
*   **Database**: PostgreSQL
*   **Orchestration**: Docker & Docker Compose

Unlike standard chat applications, CipherStream strictly processes and routes *ciphertext*. The central server architecture is considered fully "untrusted" by design. All cryptographic operations—including RSA key pair generation, asymmetric key exchange, and AES payload encryption—are executed natively within the user's browser context. 

## Motivation
This project serves as a practical sandbox to operationally explore non-traditional security domains, including:
- Mitigations against Client-Side XSS targeting local key extraction.
- Defenses against Man-in-the-Middle (MitM) interceptions during Public Key transfers.
- Analyzing the impacts of missing Perfect Forward Secrecy (PFS) and developing relevant security incident runbooks.

## Getting Started

### Prerequisites
Make sure you have [Docker Desktop](https://docs.docker.com/get-docker/) installed and actively running.

### Local Deployment
1. Clone the repository and navigate to the project root:
   ```bash
   git clone <your-repo-url>
   cd CipherStream # Or your specific directory name
   ```
2. Start the zero-trust execution stack:
   ```bash
   docker-compose up --build
   ```
3. Access the frontend interface natively via `http://localhost` (or `http://localhost:80`). Register an account to generate a local cryptographic profile and start communicating!
