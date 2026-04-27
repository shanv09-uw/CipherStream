# Unknown Unknowns: Systemic Risk Analysis

In Incident Response and Risk Management, the most dangerous threats are the ones we haven't thought of yet—the "Unknown Unknowns." For the CipherStream application, I have identified several critical areas of systemic risk that lie outside of our current code scope.

## 1. Upstream Supply Chain Compromise
**The Risk:** CipherStream relies heavily on NPM packages like `bcryptjs`, `jsonwebtoken`, and `socket.io`. If a malicious actor compromises the GitHub repository of one of these maintainers and pushes a poisoned version, our application will blindly download and execute it.
**Why it's unknown:** We cannot predict when an open-source maintainer's laptop will be hacked, nor what stealthy backdoor they might introduce (e.g., quietly logging JWT secrets to an external server).
**Mitigation Strategy:** Pinning exact version numbers in `package.json`, using tools like `npm audit`, and employing Software Bill of Materials (SBOM) tracking.

## 2. Cryptographic Obsolescence (Zero-Day Math)
**The Risk:** We currently rely on AES-GCM (Payload Encryption) and PBKDF2 (Escrow Key Wrapping). While computationally secure today, there is a risk that a mathematical breakthrough or the sudden advent of practical Quantum Computing could render these algorithms trivial to crack.
**Why it's unknown:** Mathematical breakthroughs are rarely announced in advance. Furthermore, a severe zero-day vulnerability could be discovered in the browser's native `window.crypto.subtle` API implementation itself.
**Mitigation Strategy:** Architecting the cryptography module to be "crypto-agile," allowing us to quickly swap algorithms (e.g., moving from RSA to a post-quantum algorithm like CRYSTALS-Kyber) via a seamless software update without rewriting the entire core.

## 3. Infrastructure "Blast Radius" Collapse
**The Risk:** Our application is currently deployed using Docker Compose on a single logical host. If the underlying hardware fails, or the hosting provider (e.g., AWS, DigitalOcean) experiences a massive localized outage, all of our isolated containers (DB, API, Frontend) will die simultaneously.
**Why it's unknown:** Hardware failures and catastrophic datacenter fires (e.g., the OVHcloud fire in 2021) are fundamentally unpredictable "Acts of God."
**Mitigation Strategy:** Implementing geographic redundancy, migrating from Docker Compose to multi-zone Kubernetes clusters, and enforcing rigorous Disaster Recovery Plan (DRP) drills.
