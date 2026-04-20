# On-Call Troubleshooting with the OE Dashboard

## Step 1: Broad Status Check (The "Is It Broken?" Phase)
An on-call engineer can immediately pull up the **Gatus Dashboard** (`http://localhost:8080`). This would instantly visualize the scope of the blast radius without needing to log into any servers via SSH.
*   The engineer can see the status of all the services at a glance and identify the affected services.
*   For example, if the web server NGINX logic is fine, but the Node.js backend has completely dropped offline as a cascaded result of a database failure, the engineer can quickly identify the affected services.

## Step 2: Deep Dive Logs (The "Why Is It Broken?" Phase)
Now that the engineer exactly knows which components are failing, they need to know *why*. There comes the need for the **Dozzle** log viewer.
*   Dozzle log viewer specifically filters to the affected services to display the real-time Docker `stderr` outputs.
*   Looking at the logs, the engineer can spot the root cause of the issue.
*   For example, the PostgreSQL logs are spitting out errors. Also, the Node.js logs are throwing errors because it can't reach the database.
*   **Root Cause Identity:** This confirms the application is suffering from a database DoS attack.

## Step 3: Containment and Eradication (The "Fix It" Phase)
Because the OE Dashboard allowed the engineer to pinpoint the exact line of failure within a few minutes of waking up, they don't waste time looking at frontend code. 
*   **Action Plan:** The engineer immediately SSH into the host and runs `docker-compose down && docker-compose up -d` to restart the database and reset the database connection pool limits.
*   **Validation:** The engineer tabs back to the Gatus Dashboard. They watch the red blocks turn green as Gatus resumes its checks and verifies the TCP ports are open again.
