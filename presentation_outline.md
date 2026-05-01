# CipherStream Presentation Outline (Practice Run)

**Target Duration:** 5 minutes
**Tone:** Student enrolled in Incident Response and Risk Management. Professional but acknowledge academic constraints (e.g., highlighting what we learned about "AI workflows" and industry standards).

---

## Slide 1: Title Slide
*   **Title:** CipherStream - Zero-Trust E2EE Chat
*   **Name:** Shantanu
*   **Course:** Incident Response & Risk Management

---

## Slide 2: Why This Product? (Duration: 45 Seconds)
*   **Talking Points:**
    *   *The Concept:* CipherStream is an End-to-End Encrypted (E2EE) chat application built around a "zero-trust" server model.
    *   *The "Why":* I chose this because data privacy is at the forefront of modern engineering. Building a system where the centralized server is completely blind to message contents presents fascinating, complex risk management challenges. 
    *   *The Takeaway:* It's easy to build a chat app; it takes careful operational excellence to build one where you can't even read your own database.

---

## Slide 3: Top 3 Risks from Threat Analysis (Duration: 2.5 Minutes)
*   **Visual:** A simple bulleted list of the three risks, maybe with "STRIDE" categories next to them.
*   **Talking Points:** *("During our threat modeling, we identified several risks, but these three are the most critical based on their impact:")*
    1.  **XSS / Private Key Exfiltration (High Risk):** 
        *   *Why it's top 3:* Because the backend is zero-trust, all cryptography happens in the browser. If we suffer an XSS attack, an attacker can scrape `localStorage` and steal the user's wrapped private keys, entirely defeating the E2EE.
    2.  **Server Forgery / Lack of Authenticity (Medium Risk):** 
        *   *Why it's top 3:* Currently, our messages are encrypted, but they lack digital signatures. If the backend is compromised, a malicious admin could inject forged ciphertext claiming to be someone else. It highlights a critical architecture gap between *confidentiality* and *authenticity*.
    3.  **Database Connection Exhaustion / DoS (Medium Risk):** 
        *   *Why it's top 3:* Our Socket.IO broker aggressively writes payloads to PostgreSQL before routing. Without strict rate-limiting, a bot could spam websocket frames, saturate the Postgres connection pool, and trigger a cascading collapse of the entire infrastructure.

---

## Slide 4: Operational Excellence (OE) Dashboard (Duration: 1 Minute)
*   **Visual:** Two parallel screenshots side-by-side. On the left: The green Gatus UI showing the 3 endpoints. On the right: The dark Dozzle UI showing a live terminal log.
*   **Talking Points:**
    *   *The Setup:* I built an isolated `oe-dashboard` Docker compose stack separating observation from application logic.
    *   *Gatus (Synthetic Monitoring):* Instead of complex metric agents, I use Gatus to act like a user. It synthetically pings the Frontend, the WebSocket Port, and the Database every 15 seconds to verify our SLAs.
    *   *Dozzle (Log Aggregation):* If Gatus turns red (e.g., the DoS risk happens), I can click a button to immediately jump into Dozzle, which streams real-time Docker logs so I can identify the exact stack trace during a 2:00 AM on-call paging event.

---

## Slide 5: Q&A / Wrap Up (Duration: 15 Seconds)
*   *Closing Statement:* "This combination of zero-trust architecture and heavily isolated synthetic monitoring prepares CipherStream for real-world reliability. Thank you."
