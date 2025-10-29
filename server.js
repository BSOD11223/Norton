const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs').promises;
const path = require('path');
const cors = require('cors');
const uniqid = require('uniqid');

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_FILE = path.join(__dirname, 'messages.json');

app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

// Ensure messages.json exists
async function ensureDataFile() {
  try {
    await fs.access(DATA_FILE);
  } catch (err) {
    await fs.writeFile(DATA_FILE, '[]', 'utf8');
  }
}

async function readMessages() {
  await ensureDataFile();
  const raw = await fs.readFile(DATA_FILE, 'utf8');
  return JSON.parse(raw || '[]');
}

async function writeMessages(msgs) {
  await fs.writeFile(DATA_FILE, JSON.stringify(msgs, null, 2), 'utf8');
}

// Serve user page at /
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Serve admin page at /admin
app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

// API: get messages (optionally filter by userId)
app.get('/api/messages', async (req, res) => {
  const { userId } = req.query;
  try {
    let msgs = await readMessages();
    if (userId) {
      msgs = msgs.filter(m => m.userId === userId);
    }
    // sort by timestamp ascending
    msgs.sort((a,b) => a.timestamp - b.timestamp);
    res.json(msgs);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to read messages' });
  }
});

// API: get distinct users (for admin)
app.get('/api/users', async (req, res) => {
  try {
    const msgs = await readMessages();
    const map = {};
    msgs.forEach(m => {
      if (!map[m.userId]) {
        map[m.userId] = { userId: m.userId, name: m.name || 'Anonymous', lastTimestamp: m.timestamp };
      } else {
        if (m.timestamp > map[m.userId].lastTimestamp) map[m.userId].lastTimestamp = m.timestamp;
      }
    });
    const users = Object.values(map).sort((a,b) => b.lastTimestamp - a.lastTimestamp);
    res.json(users);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to read users' });
  }
});

// API: post a message
app.post('/api/messages', async (req, res) => {
  const { userId, name, text, from } = req.body;
  if (!text) return res.status(400).json({ error: 'Message text required' });
  try {
    const msgs = await readMessages();
    const msg = {
      id: uniqid(),
      userId: userId || uniqid(), // should be provided from client
      name: name || 'Anonymous',
      text,
      from: from || 'user', // 'user' or 'admin'
      seen: from === 'admin', // messages from admin considered seen by admin
      timestamp: Date.now()
    };
    msgs.push(msg);
    await writeMessages(msgs);
    res.json(msg);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to save message' });
  }
});

// API: mark message seen
app.put('/api/messages/:id/seen', async (req, res) => {
  const id = req.params.id;
  try {
    const msgs = await readMessages();
    const idx = msgs.findIndex(m => m.id === id);
    if (idx === -1) return res.status(404).json({ error: 'Message not found' });
    msgs[idx].seen = true;
    await writeMessages(msgs);
    res.json(msgs[idx]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update message' });
  }
});

// API: get single message
app.get('/api/messages/:id', async (req, res) => {
  try {
    const msgs = await readMessages();
    const msg = msgs.find(m => m.id === req.params.id);
    if (!msg) return res.status(404).json({ error: 'Message not found' });
    res.json(msg);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to read message' });
  }
});

app.listen(PORT, () => {
  console.log(`Server started on port ${PORT}`);
});
