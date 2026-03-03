require('dotenv').config();
const express    = require('express');
const mysql      = require('mysql2');
const cors       = require('cors');
const bodyParser = require('body-parser');

const app  = express();
const PORT = 3000;

app.use(cors());
app.use(bodyParser.json());
app.use(express.static('public'));

// ── MySQL Connection ──────────────────────────
const db = mysql.createConnection({
  host    : process.env.DB_HOST,
  user    : process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME
});

db.connect(err => {
  if (err) {
    console.error('❌ MySQL Error:', err.message);
    process.exit(1);
  }
  console.log('✅ MySQL Connected!');
  createTable();
});

// ── Table Auto-Create ─────────────────────────
function createTable() {
  const sql = `
    CREATE TABLE IF NOT EXISTS members (
      id         INT AUTO_INCREMENT PRIMARY KEY,
      first_name VARCHAR(100) NOT NULL,
      last_name  VARCHAR(100),
      phone      VARCHAR(20)  NOT NULL,
      email      VARCHAR(150) NOT NULL UNIQUE,
      plan       VARCHAR(100),
      message    TEXT,
      joined_at  DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `;
  db.query(sql, err => {
    if (err) console.error('❌ Table error:', err.message);
    else console.log('✅ members table ready!');
  });
}

// ── POST /api/join — Naya Member Save ─────────
app.post('/api/join', (req, res) => {
  const { first_name, last_name, phone, email, plan, message } = req.body;

  if (!first_name || !phone || !email || !plan)
    return res.status(400).json({ success: false, msg: 'Saari fields fill karo!' });

  const sql = `INSERT INTO members (first_name, last_name, phone, email, plan, message)
               VALUES (?, ?, ?, ?, ?, ?)`;

  db.query(sql, [first_name, last_name, phone, email, plan, message], (err, result) => {
    if (err) {
      if (err.code === 'ER_DUP_ENTRY')
        return res.status(409).json({ success: false, msg: '⚠️ Email already registered!' });
      return res.status(500).json({ success: false, msg: err.message });
    }
    res.json({ success: true, msg: '🎉 Welcome to PK FitZone!', id: result.insertId });
  });
});

// ── GET /api/members — Saare Members ──────────
app.get('/api/members', (req, res) => {
  db.query('SELECT * FROM members ORDER BY joined_at DESC', (err, rows) => {
    if (err) return res.status(500).json({ success: false });
    res.json({ success: true, total: rows.length, data: rows });
  });
});

// ── GET /api/stats — Dashboard Stats ──────────
app.get('/api/stats', (req, res) => {
  const queries = {
    total   : 'SELECT COUNT(*) c FROM members',
    today   : 'SELECT COUNT(*) c FROM members WHERE DATE(joined_at) = CURDATE()',
    basic   : "SELECT COUNT(*) c FROM members WHERE plan LIKE '%Basic%'",
    standard: "SELECT COUNT(*) c FROM members WHERE plan LIKE '%Standard%'",
    premium : "SELECT COUNT(*) c FROM members WHERE plan LIKE '%Premium%'"
  };
  const stats = {}; let done = 0;
  Object.keys(queries).forEach(k => {
    db.query(queries[k], (e, r) => {
      stats[k] = r?.[0]?.c || 0;
      if (++done === 5) res.json({ success: true, stats });
    });
  });
});

// ── DELETE /api/members/:id ────────────────────
app.delete('/api/members/:id', (req, res) => {
  db.query('DELETE FROM members WHERE id = ?', [req.params.id], err => {
    if (err) return res.status(500).json({ success: false });
    res.json({ success: true, msg: '🗑️ Member deleted!' });
  });
});

// ── Start Server ───────────────────────────────
app.listen(PORT, () => {
  console.log(`\n🚀 Server:    http://localhost:${PORT}`);
  console.log(`📊 Admin:     http://localhost:${PORT}/admin.html`);
  console.log(`🔗 API:       http://localhost:${PORT}/api/members\n`);
});