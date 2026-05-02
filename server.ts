import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import Database from 'better-sqlite3';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'mysecret123';
const DATABASE_URL = process.env.DATABASE_URL || './database.sqlite';

// Database setup
const db = new Database(DATABASE_URL);

// --- API Routes ---

// Initialize schema
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS scores (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    username TEXT NOT NULL,
    reaction_time REAL NOT NULL,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users (id)
  );

  CREATE INDEX IF NOT EXISTS idx_scores_time ON scores(reaction_time);
`);

// Check if columns exist (simple fix for schema migration)
try {
  db.prepare('SELECT username FROM scores LIMIT 1').get();
} catch (e) {
  console.log('Migrating scores table: adding username column');
  db.exec('ALTER TABLE scores ADD COLUMN username TEXT NOT NULL DEFAULT "Guest"');
}

try {
  db.prepare('SELECT reaction_time FROM scores LIMIT 1').get();
} catch (e) {
  console.log('Migrating scores table: renaming time to reaction_time');
  // SQLite doesn't easily support renaming columns before 3.25.0, so we just add and hope for the best or recreate
  db.exec('ALTER TABLE scores ADD COLUMN reaction_time REAL DEFAULT 0');
}

app.use(express.json());

// Middleware to authenticate JWT
const authenticate = (req: any, res: any, next: any) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: 'No token provided' });

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: number; username: string };
    req.user = decoded;
    next();
  } catch (err) {
    res.status(401).json({ error: 'Invalid token' });
  }
};

// --- API Routes ---

// Signup
app.post('/api/signup', (req, res) => {
  const { username, email, password } = req.body;
  if (!username || !email || !password) {
    return res.status(400).json({ error: 'All fields are required' });
  }

  try {
    const hashedPassword = bcrypt.hashSync(password, 10);
    const result = db.prepare('INSERT INTO users (username, email, password) VALUES (?, ?, ?)').run(username, email, hashedPassword);
    
    const token = jwt.sign({ userId: result.lastInsertRowid, username }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, user: { username, email } });
  } catch (err: any) {
    if (err.message.includes('UNIQUE constraint failed')) {
      return res.status(400).json({ error: 'Username or email already exists' });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Login
app.post('/api/login', (req, res) => {
  const { email, password } = req.body;
  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email) as any;

  if (user && bcrypt.compareSync(password, user.password)) {
    const token = jwt.sign({ userId: user.id, username: user.username }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, user: { username: user.username, email: user.email } });
  } else {
    res.status(401).json({ error: 'Invalid credentials' });
  }
});

// Submit Score
app.post('/api/scores', async (req: any, res) => {
  const { score } = req.body;
  const authHeader = req.headers.authorization;
  
  let userId = null;
  let username = null;

  if (authHeader) {
    try {
      const token = authHeader.split(' ')[1];
      const decoded = jwt.verify(token, JWT_SECRET) as { userId: number; username: string };
      userId = decoded.userId;
      username = decoded.username;
    } catch (e) {
      // Token exists but invalid
    }
  }

  try {
    const isGuest = !userId;

    if (!isGuest) {
      // 1. Insert the score for authenticated users
      db.prepare('INSERT INTO scores (user_id, username, reaction_time) VALUES (?, ?, ?)').run(userId, username, score);
    }

    // 2. Get Rank
    // If guest: what WOULD their rank be. If user: what IS their rank.
    const betterCountResult = db.prepare('SELECT COUNT(*) as count FROM scores WHERE reaction_time < ?').get(score) as { count: number };
    const rank = betterCountResult.count + 1;

    // 3. Calculate Percentile
    const totalResult = db.prepare('SELECT COUNT(*) as count FROM scores').get() as { count: number };
    const total = totalResult.count;
    
    // For guests, we compare against total. For users, we compare against total - 1 (excluding themselves)
    const divisor = isGuest ? total : (total - 1);
    const slowerCountResult = db.prepare('SELECT COUNT(*) as count FROM scores WHERE reaction_time > ?').get(score) as { count: number };
    
    const percentile = divisor > 0 
      ? Math.round((slowerCountResult.count / divisor) * 100) 
      : 100;

    // 4. Fetch Top 500
    const top500 = db.prepare('SELECT username, reaction_time as time, timestamp FROM scores ORDER BY reaction_time ASC LIMIT 500').all();

    // 5. Response logic
    let message = isGuest ? "Login to save your score and appear on leaderboard" : "Score saved!";
    if (isGuest && rank <= 500) {
      message = "🔥 Great score! Sign in to claim your spot on the leaderboard";
    }

    res.json({ 
      saved: !isGuest, 
      rank, 
      percentile, 
      leaderboard: rank <= 500 ? top500 : undefined,
      totalPlayers: total,
      message
    });
  } catch (err) {
    console.error('Score submission error:', err);
    res.status(500).json({ error: 'Failed to process score' });
  }
});

// Get Leaderboard
app.get('/api/leaderboard', (req, res) => {
  try {
    const scores = db.prepare('SELECT username, reaction_time as time, timestamp FROM scores ORDER BY reaction_time ASC LIMIT 500').all();
    res.json(scores);
  } catch (err) {
    console.error('Leaderboard fetch error:', err);
    res.status(500).json({ error: 'Failed to retrieve records' });
  }
});

// Get Rank Prediction & Percentile
app.get('/api/rank', (req, res) => {
  const time = parseFloat(req.query.time as string);
  if (isNaN(time)) return res.status(400).json({ error: 'Invalid time' });

  try {
    const betterScores = db.prepare('SELECT COUNT(*) as count FROM scores WHERE reaction_time < ?').get(time) as { count: number };
    const totalScores = db.prepare('SELECT COUNT(*) as count FROM scores').get() as { count: number };
    const slowerScores = db.prepare('SELECT COUNT(*) as count FROM scores WHERE reaction_time > ?').get(time) as { count: number };

    const rank = betterScores.count + 1;
    const percentile = totalScores.count > 0 
      ? Math.round((slowerScores.count / totalScores.count) * 100) 
      : 100;

    res.json({ 
      rank, 
      percentile,
      totalPlayers: totalScores.count 
    });
  } catch (err) {
    console.error('Rank calculation error:', err);
    res.status(500).json({ error: 'Failed to calculate standing' });
  }
});

// --- Server & Vite Setup ---

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running at http://localhost:${PORT}`);
  });
}

startServer();
