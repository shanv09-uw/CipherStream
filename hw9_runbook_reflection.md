# HW9 Runbook Reflection

This document reflects on the execution of the Incident Response Runbook (`hw9_incident_runbook.md`) during the simulated Typosquatting Supply Chain Attack (`bcrytp`).

## 1. Were the steps in your runbook easy to follow and understand?
Yes, the steps were exceptionally clear because they were separated logically into four strict phases: **Detection, Containment, Response, and Recover**. During the simulated incident, the runbook immediately pointed me toward the OE Dashboard. When I saw the massive Event Loop Lag and Memory spikes, the runbook's instruction to "Audit Dependencies" perfectly guided me to discover the recently installed `bcrytp` package.

## 2. Can you simplify your runbook further?
Yes. Currently, the runbook requires the responder to manually deduce *which* metric anomaly corresponds to *which* threat (e.g., guessing that Event Loop Lag + CPU Spike = ReDoS or Data Exfiltration). The runbook could be simplified by providing a direct mapping matrix (e.g., `If Event Loop Lag > 1000ms, go to Page 3`), completely removing the cognitive load of diagnosing the metrics during a high-stress SEV-1 incident.

## 3. Any steps in your runbook that should be automated further?
The **Identification (Dependency Audit)** and **Recovery (Secret Rotation)** steps desperately need automation:
*   **Dependency Audit:** I had to manually look through the Git commits and `package.json` to find the malicious `bcrytp` package. This should be automated by adding `npm audit` or **Dependabot** to our CI/CD pipeline, which would have caught the known typosquatted package and blocked the merge automatically.
*   **Secret Rotation:** Manually generating new JWT secrets via the Node CLI, updating the `.env` file, and rebuilding Docker containers took too long. We should automate this using a tool like HashiCorp Vault or AWS Secrets Manager, allowing us to rotate compromised keys across all environments with a single click.

## 4. Any automated steps in your runbook that need manual supplementation?
Our **Detection** is highly automated via the Grafana OE Dashboard alarms. However, this automated alarm needs manual supplementation during the **Containment** phase. If the Grafana dashboard detects a massive CPU spike, we currently receive an alert but have to manually kill the Docker container via `Ctrl+C` or `docker-compose stop`. In the future, we could implement a script that automatically isolates the container, but a human must manually decide whether it is a legitimate viral traffic spike or a malicious exfiltration script before permanently severing the connection.
