# Security Test Documentation

Based on the Threat Modeling previously conducted for the CipherStream Zero-Trust architecture, the following automated security tests have been designed and implemented to continuously validate our risk mitigation strategies in our CI/CD pipeline.

## 1. Authentication Boundary Enforcement (Implemented)
**Threat Addressed:** Server Forgery / Data Leakage
**Risk Level:** High
**Test Case Goal:** Validate that the backend logic drops all connections to sensitive REST endpoints if a valid JSON Web Token (JWT) is absent.
**Automated Test Map:** `api.test.js -> Security Test: Authentication Boundary Enforcement`
**Expected Outcome:** Any request to `/api/messages/:peerId` without an `Authorization: Bearer <token>` header MUST return an HTTP 401 Unauthorized, ensuring no unauthenticated data leakage occurs.

## 2. Master Password Integrity Check (Future Automation)
**Threat Addressed:** XSS Key Exfiltration
**Risk Level:** High
**Test Case Goal:** Validate that the client application correctly invokes the PBKDF2 Web Crypto API to wrap the private key before ever committing it to `localStorage`.
**Expected Outcome:** A front-end unit test that injects a mock payload into the login function and asserts that `localStorage.getItem('encrypted_private_key')` is *not* a plaintext RSA key, but an AES-GCM encrypted blob.

## 3. Database Denial of Service (DoS) Threshold (Future Automation)
**Threat Addressed:** Socket Exhaustion DoS
**Risk Level:** Medium
**Test Case Goal:** Stress-test the `/api/register` endpoint to ensure the application gracefully handles database connection pool limits.
**Expected Outcome:** A load testing script (e.g., Artillery or K6) fires 10,000 rapid requests. The server must return `429 Too Many Requests` (once rate limiting is added) rather than throwing internal PostgreSQL connection timeout exceptions.
