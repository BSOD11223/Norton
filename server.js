// -------------------- IMPORTS --------------------
const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const bodyParser = require('body-parser');
require('dotenv').config(); // Load .env locally

const app = express();

// -------------------- MIDDLEWARE --------------------
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

// -------------------- MONGODB CONNECTION --------------------
const mongoUri = process.env.MONGO_URI;

mongoose.connect(mongoUri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log("MongoDB connected"))
.catch(err => console.error("MongoDB connection error:", err));

// -------------------- SCHEMA --------------------
const messageSchema = new mongoose.Schema({
  userId: String,
  name: String,
  text: String,
  from: String, // 'user' or 'admin'
  timestamp: { type: Date, default: Date.now },
  seen: { type: Boolean, default: false }
});

const Message = mongoose.model('Message', messageSchema);

// -------------------- ROUTES --------------------

// Get messages for a specific user
app.get('/api/messages', async (req, res) => {
  const userId = req.query.userId;
  if (!userId) return res.status(400).json({ error: "Missing userId" });

  try {
    const messages = await Message.find({ userId }).sort({ timestamp: 1 });
    res.json(messages);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Send a new message
app.post('/api/messages', async (req, res) => {
  const { userId, name, text, from } = req.body;
  if (!userId || !text || !from) return res.status(400).json({ error: "Missing fields" });

  try {
    const message = new Message({ userId, name, text, from });
    await message.save();
    res.json(message);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get all users for admin page
app.get('/api/users', async (req, res) => {
  try {
    const users = await Message.aggregate([
      { $group: { _id: "$userId", lastMessage: { $last: "$$ROOT" } } },
      { $sort: { "lastMessage.timestamp": -1 } }
    ]);
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Mark messages as seen
app.post('/api/messages/seen', async (req, res) => {
  const { userId } = req.body;
  if (!userId) return res.status(400).json({ error: "Missing userId" });

  try {
    await Message.updateMany({ userId, seen: false }, { seen: true });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Serve frontend files
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/index.html'));
});

app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/admin.html'));
});

// -------------------- START SERVER --------------------
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
