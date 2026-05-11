# Unautomated Manual Tests & Missing Metrics

While we have automated several operational guardrails for CipherStream, there are still several operational risks that require manual testing or advanced metrics that we haven't integrated into the OE dashboard yet.

## 1. Manual Tests That Couldn't Be Automated

### Testing 10,000 Concurrent WebSocket Connections
**The Risk:** As a real-time chat application, our Socket.IO broker maintains a persistent TCP connection for every active user. If 10,000 users log in at once, the sheer volume of open sockets could crash the Node.js process due to file descriptor limits.
**Why it isn't automated:** Standard GitHub Actions runners do not have the RAM or the bandwidth to simulate 10,000 virtual users establishing persistent WebSocket handshakes.
**How to manually test it:** We would need to manually provision a distributed load testing cluster using tools like Locust or Artillery across multiple AWS EC2 instances, pointing them all at our staging server to observe when the server starts dropping connections.

## 2. Proactive Alert Metrics Not Yet in the Dashboard

### Database Connection Pool Utilization
**The Risk:** If our backend receives a sudden spike in traffic (e.g., thousands of simultaneous user registrations), it will rapidly consume connections to the PostgreSQL database. If the connection pool fills up, all subsequent database queries will hang or timeout, causing API failures across the board.
**Why it isn't in the dashboard:** Currently, our Gatus dashboard only performs "black-box" monitoring (it checks if TCP port 5432 is open). It cannot see *inside* the database.
**How to add it:** We need to deploy a `postgres_exporter` container alongside the database to scrape internal metrics (like `pg_stat_activity`), and use Prometheus to trigger an alert if the connection pool exceeds 85% capacity. This gives the on-call engineer time to act *before* the database completely exhausts its connections.
