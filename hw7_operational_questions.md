# Operational Questions Answered by Grafana Dashboard

By migrating from a simple health checker (Gatus) to an industry-standard telemetry stack (Prometheus and Grafana), our OE dashboard is now capable of answering deep, live operational questions:

## Questions The Dashboard Can Answer Now
1. **"Are users actively connected?"**
   - By querying the `cipherstream_active_users` Gauge, we can see exactly how many WebSocket connections are alive in real-time. If this drops to zero unexpectedly, we have a network outage.
2. **"What is our message throughput?"**
   - Using the `rate(cipherstream_messages_sent_total[1m])` Prometheus query, we can graph exactly how many encrypted messages are sent per minute. A spike indicates heavy usage; a flatline indicates broken database queries or broken routing.
3. **"Is the system under a credential-stuffing attack?"**
   - By tracking `cipherstream_auth_errors_total` per day (or per minute), any sudden vertical spike immediately alerts us that an attacker is trying to brute-force accounts or stuffing credentials.
4. **"Are we at risk of memory exhaustion?"**
   - `prom-client` automatically tracks `process_resident_memory_bytes`. We can chart our memory usage and set alerts if it approaches the container limit, preventing the DoS risk identified in HW6.

## Remaining Gaps (What It Cannot Answer)
1. **End-to-End Encryption Success:**
   - Because our backend operates on a Zero-Trust basis, it never decrypts the payloads. Grafana can tell us a message was routed (`messages_sent_total`), but it *cannot* tell us if the recipient's phone successfully decrypted it using their private key. That requires client-side telemetry (which compromises privacy).
2. **Database Connection Pool Exhaustion:**
   - Prometheus is currently scraping the Node.js backend. It does not yet scrape the PostgreSQL internal metrics. If the database locks up, the Node.js metrics will show a flatline, but we won't have root-cause visibility into the database's internal locks.
