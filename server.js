// Load dependencies
const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config();

// Create app
const app = express();

// Middleware
app.use(express.static('public'));
app.use(express.json());

// Server port
const PORT = process.env.PORT || 3000;

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI, { 
  useNewUrlParser: true, 
  useUnifiedTopology: true 
})
.then(() => console.log("MongoDB connected"))
.catch(err => console.error(err));

// Define Message Schema
const messageSchema = new mongoose.Schema({
  userId: String,
  name: String,
  text: String,
  from: String,           // "user" or "admin"
  timestamp: { type: Date, default: Date.now }
});

// Create Message model
const Message = mongoose.model('Message', messageSchema);

// API route: send message
app.post('/api/messages', async (req, res) => {
  try {
    const { userId, name, text, from } = req.body;
    if (!text || !userId || !from) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const msg = new Message({ userId, name, text, from });
    await msg.save();
    res.json(msg);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// API route: get messages for a user
app.get('/api/messages', async (req, res) => {
  try {
    const { userId } = req.query;
    if (!userId) return res.status(400).json({ error: "Missing userId" });

    const messages = await Message.find({ userId }).sort({ timestamp: 1 });
    res.json(messages);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// Catch-all route to serve frontend
app.get('*', (req, res) => {
  res.sendFile(path.resolve(__dirname, 'public', 'index.html'));
});

// Start server
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
