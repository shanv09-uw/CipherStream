# Required Emitted Metrics for the OE Dashboard

## 1. Standard HTTP Response Codes (Frontend/API)
*   **What it emits:** The web servers must emit correct HTTP status headers (e.g., `200 OK` when healthy, `500 Internal Server Error` when broken).
*   **Why it's needed:** Gatus literally acts like a web browser. It does not look at our CPU or RAM; it relies entirely on checking if it receives a `200` status back from the server. If our code returns a `200` even during a crash, Gatus will falsely report the system as healthy (a false positive).

## 2. Dedicated Health-Check Endpoints (Future Improvement)
*   **What it emits:** Right now, Gatus only checks if the backend TCP port is open. A more advanced metric would be adding a `/api/health` REST endpoint in Node.js that returns JSON like `{"database_connected": true}`.
*   **Why it's needed:** This allows Gatus to ping the backend to verify that the backend is explicitly connected to the database, rather than just guessing based on the port being open.

## 3. Formatted Standard Output Logs (`stdout` and `stderr`)
*   **What it emits:** Every console log, error stack trace, and socket disconnection must be dumped correctly to the container's standard output stream instead of hidden inside a local `.txt` file within the container.
*   **Why it's needed:** Dozzle works reading the Docker Daemon log streams. If the backend fails silently without logging to `console.error`, Dozzle has nothing to show the on-call engineer, significantly delaying recovery.
