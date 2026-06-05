# Incident Response Runbook: Supply Chain Attack (Typosquatting)

**Severity Level:** SEV-1 (CRITICAL)
**Incident Commander:** On-Call Security Engineer
**Objective:** Immediately sever unauthorized connections, remove malicious code injections, and rotate compromised secrets following a supply chain breach.

---

## 1. Detection Phase (Identification)
Supply chain attackers often deploy data-stealing payloads that consume massive amounts of server resources to serialize and exfiltrate data.

**Actionable Steps:**
- [ ] **Monitor OE Metrics:** Access the Grafana Operational Excellence (OE) Dashboard (`http://localhost:3000`).
- [ ] **Identify Anomalies:** Compare current metrics against the following critical incident thresholds to determine if a spike is uncommon:
    *   **Event Loop Lag:** `> 20ms` (Normal local baseline is `< 2ms`. Anything `> 500ms` indicates a severe synchronous blocking attack).
    *   **Process Memory Usage:** Sudden jump of `> 30 MB` above the standard 40MB baseline.
    *   **Process CPU:** `> 70%` utilization sustained for more than 1 minute without a corresponding spike in `API Requests Total`.
- [ ] **Audit Dependencies:** If metrics indicate an anomaly, immediately audit the `package.json` file and recent Git commits for typosquatted packages (e.g., `bcrytp` instead of `bcrypt`).

## 2. Containment Phase (Mitigation)
The moment a malicious package is identified, you must assume data is actively being exfiltrated. Time is critical.

**Actionable Steps:**
- [ ] **Sever Network Access:** Immediately stop the active Node.js processes and Docker containers to sever the attacker's outbound network connection.
    ```bash
    # Stop the running Docker containers immediately
    docker-compose stop
    ```
- [ ] **Isolate the Environment:** Do not attempt to let the server "finish" processing requests or drain connections. Hard-killing the server is required to prevent further data loss.

## 3. Response Phase (Eradication)
With the environment isolated and offline, systematically remove the threat from the codebase.

**Actionable Steps:**
- [ ] **Remove Code Execution Triggers:** Open `server/src/index.js` and delete any `require()` or `import` statements associated with the malicious package (e.g., `require('bcrytp')`).
- [ ] **Uninstall the Payload:** Remove the package from the dependency tree.
    ```bash
    cd server
    npm uninstall bcrytp
    ```
- [ ] **Rotate Compromised Secrets (CRITICAL):** Because the payload caused massive memory spikes, you must assume the `.env` file (containing database passwords and encryption keys) was read into memory and exfiltrated.
    ```bash
    # Generate a new secure JWT Secret
    node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
    ```
    - Open `server/.env` and replace the old `JWT_SECRET` with the newly generated hex string.

## 4. Recover Phase (Restoration)
Once the threat is fully eradicated and all secrets are rotated, restore the system to a healthy baseline.

**Actionable Steps:**
- [ ] **Rebuild Infrastructure:** Force a clean rebuild of the Docker containers to ensure the malicious package is completely expunged from the container cache.
    ```bash
    docker-compose up --build -d
    ```
- [ ] **Validate Baseline:** Open the Grafana OE Dashboard. Monitor the system for 5 minutes. Confirm that **Event Loop Lag** and **Process Memory Usage** remain flat and at healthy baseline levels.
- [ ] **Close Incident:** Once the baseline is validated, declare the SEV-1 incident resolved and proceed to the Post-Mortem phase.
