# Highest Risks to Disruption of Customer Use

Operational Excellence for a real-time, security-focused application like **CipherStream** depends heavily on maintaining constant availability and low latency. Because the application relies on End-to-End Encrypted (E2EE) WebSockets, if the service drops, users immediately lose their ability to communicate securely.

Based on our architecture, here are the highest operational risks that threaten business continuity:

## 1. Payload Size Memory Exhaustion (Loss of Availability)
**The Risk:** As an E2EE chat app, the backend never reads the contents of a message; it simply receives encrypted ciphertexts and routes them. However, if a malicious actor (or a buggy client) sends massive multi-megabyte JSON payloads to our API or WebSocket endpoints, the Node.js event loop could exhaust its memory allocation. 
**The Business Impact:** A memory crash would sever all active WebSocket connections globally, causing an immediate, total outage of the chat application for all users.
**The Mitigation:** Enforce a strict byte-limit on all incoming payloads (e.g., `10kb`) at the Express middleware layer to drop abusive traffic before it enters memory.

## 2. API Latency Spikes / Event Loop Saturation (Degraded Performance)
**The Risk:** Even if traffic doesn't crash the server, heavy operations (like massive database queries or slow bcrypt hashing during sudden registration spikes) can block the single-threaded Node.js event loop. 
**The Business Impact:** If the event loop is blocked, real-time message delivery is delayed. Users will experience significant lag when sending messages, leading to a degraded experience, loss of trust, and potential customer churn.
**The Mitigation:** Implement a dedicated `/api/health` endpoint monitored by an external OE dashboard (like Gatus) to trigger alerts if server responsiveness drops below a strict threshold (e.g., `500ms`).
