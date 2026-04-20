# Operational State Questions

## 1. Is the application reachable by our end users?
**Why it matters:** If the frontend is down, nobody can log in. 
**How the dashboard answers this:** We look at the "CipherStream Frontend" block in Gatus. Because it is configured to expect an HTTP `200 OK` status, a green box tells us the web server is online and successfully serving the React code.

## 2. Is the core chat infrastructure accepting websocket connections?
**Why it matters:** Users might load the site, but if the socket broker is crashed, messages won't send.
**How the dashboard answers this:** In Gatus, the "CipherStream Backend" block attempts to open a TCP port connection to the API. If it's green, the backend event loop is not frozen and is ready to accept connections.

## 3. Is the backend successfully talking to the database?
**Why it matters:** In our E2EE design, all encrypted payloads must be saved to Postgres. 
**How the dashboard answers this:** The "CipherStream Database" block in Gatus checks the database port. If it fails, we know immediately that the backend and DB are disconnected, usually leading to failed message sends.

## 4. Why did a specific component just fail?
**Why it matters:** "It's broken" isn't enough; we need to know *why* to fix it quickly.
**How the dashboard answers this:** By clicking the "Live Logs" buttons added to the Gatus header, we jump into Dozzle to immediately see the real-time application crash outputs (for example, `UnhandledPromiseRejection` or `Out of Memory`).
