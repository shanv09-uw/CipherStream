const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('./db');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] }
});

const port = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_e2ee_key';

app.use(cors());
app.use(express.json());

// Initialize tables
const initDb = async () => {
  try {
    await db.query(`DROP TABLE IF EXISTS messages, users CASCADE;`);
    
    await db.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        public_key TEXT NOT NULL,
        encrypted_private_key TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      CREATE TABLE IF NOT EXISTS messages (
        id SERIAL PRIMARY KEY,
        sender_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        receiver_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        encrypted_aes_key TEXT NOT NULL,
        sender_encrypted_aes_key TEXT,
        encrypted_payload TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('Database initialized for Authenticated E2EE Chat');
  } catch (err) {
    console.error('Error initializing database', err);
  }
};


// --- Auth Middleware ---
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) return res.sendStatus(401);

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
};

// --- API Endpoints ---

app.post('/api/register', async (req, res) => {
  try {
    const { username, password, public_key, encrypted_private_key } = req.body;
    if (!username || !password || !public_key || !encrypted_private_key) {
      return res.status(400).json({ error: 'Missing required registration payload' });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const { rows } = await db.query(
      `INSERT INTO users (username, password_hash, public_key, encrypted_private_key) 
       VALUES ($1, $2, $3, $4) RETURNING id, username, public_key, encrypted_private_key`,
      [username, passwordHash, public_key, encrypted_private_key]
    );

    const user = rows[0];
    const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, { expiresIn: '24h' });

    res.status(201).json({ user, token });
  } catch (err) {
    if (err.code === '23505') { // Unique violation
      res.status(400).json({ error: 'Username already taken' });
    } else {
      res.status(500).json({ error: err.message });
    }
  }
});

app.post('/api/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ error: 'Username and password required' });

    const { rows } = await db.query('SELECT * FROM users WHERE username = $1', [username]);
    if (rows.length === 0) return res.status(400).json({ error: 'Invalid credentials' });

    const user = rows[0];
    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) return res.status(400).json({ error: 'Invalid credentials' });

    const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, { expiresIn: '24h' });
    
    // Return the escrow payload (encrypted private key)
    res.json({ 
      user: { id: user.id, username: user.username, public_key: user.public_key, encrypted_private_key: user.encrypted_private_key }, 
      token 
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/users', authenticateToken, async (req, res) => {
  try {
    const { rows } = await db.query('SELECT id, username, public_key FROM users ORDER BY username ASC');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/messages/:peerId', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { peerId } = req.params;
    const { rows } = await db.query(
      `SELECT * FROM messages 
       WHERE (sender_id = $1 AND receiver_id = $2) OR (sender_id = $2 AND receiver_id = $1) 
       ORDER BY created_at ASC`,
      [userId, peerId]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- Socket.IO Broker ---
const activeUsers = new Map();

// Authentication middleware for Sockets
io.use((socket, next) => {
  const token = socket.handshake.auth?.token;
  if (!token) return next(new Error('Authentication error'));
  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) return next(new Error('Authentication error'));
    socket.userId = decoded.id;
    next();
  });
});

io.on('connection', (socket) => {
  console.log(`Socket Connected: User ${socket.userId}`);
  activeUsers.set(String(socket.userId), socket.id);

  socket.on('private_message', async (data, callback) => {
    try {
      const { rows } = await db.query(
        `INSERT INTO messages (sender_id, receiver_id, encrypted_aes_key, sender_encrypted_aes_key, encrypted_payload)
         VALUES ($1, $2, $3, $4, $5) RETURNING *`,
        [socket.userId, data.receiver_id, data.encrypted_aes_key, data.sender_encrypted_aes_key, data.encrypted_payload]
      );
      const savedMessage = rows[0];

      const receiverSocketId = activeUsers.get(String(data.receiver_id));
      if (receiverSocketId) {
        io.to(receiverSocketId).emit('receive_message', savedMessage);
      }

      if (callback) callback({ success: true, message: savedMessage });
    } catch (err) {
      console.error('Socket message error:', err);
      if (callback) callback({ success: false, error: err.message });
    }
  });

  socket.on('disconnect', () => {
    activeUsers.delete(String(socket.userId));
  });
});

if (require.main === module) {
  initDb();
  server.listen(port, () => {
    console.log(`Auth-Secured Broker running on ${port}`);
  });
}

module.exports = { app, server };
