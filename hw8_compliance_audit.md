# CipherStream Compliance Audit

This document serves as an internal audit of the `CipherStream` application architecture and codebase against the regulatory frameworks researched in `hw8_compliance_requirements.md`.

## 1. GDPR Article 5: Data Minimization
**Status:** PASS ✅

**Audit Findings:** 
CipherStream perfectly embodies Data Minimization. By utilizing End-to-End Encryption (E2EE) with the Web Crypto API, the server never receives or stores plaintext passwords (handled via `bcrypt`) or plaintext messages. The `messages` table in our PostgreSQL database only stores the `encrypted_payload`. 
*   **Compliance:** If our database is breached, the attacker gains no readable PII or message content, shielding the company from massive GDPR data breach liabilities.

## 2. CALEA / Lawful Intercept
**Status:** PASS (Conditionally) ✅

**Audit Findings:**
Under current US law, telecommunication providers are not forced to write a backdoor if they do not hold the decryption keys. 
*   **Compliance:** Because our keys are generated on the client via `window.crypto.subtle` and the private key is held locally (or escrowed in an encrypted state), we can legally respond to a CALEA warrant by stating we do not possess the means to decrypt the payloads, keeping us in compliance without compromising security.

## 3. GDPR Article 17: Right to Erasure ("Right to be Forgotten")
**Status:** FAIL ❌

**Audit Findings:**
A thorough review of `server/src/index.js` reveals that there is absolutely no mechanism for a user to delete their account. Once a user registers, their username, public key, encrypted private key, and all associated encrypted messages are stored in the PostgreSQL database permanently.
*   **Compliance Failure:** This is a direct violation of GDPR Article 17. Users must have a mechanism to withdraw consent and have their data permanently erased from our systems. 

## Action Plan (Product Update)
To remediate the failing grade on GDPR Article 17, we must implement an Account Deletion feature.

**Engineering Tasks:**
1.  **Backend:** Create a `DELETE /api/users/me` HTTP endpoint in `server/src/index.js`.
2.  **Database:** Ensure the deletion completely wipes the user's row from the `users` table. Because our database schema uses `ON DELETE CASCADE` for foreign keys (or we will manually delete associated rows), this will completely eradicate their metadata.
3.  **Testing:** Implement an automated test in `server/src/api.test.js` to ensure the deletion endpoint functions securely and requires a valid JWT token to prevent unauthorized deletions.
