require('dotenv').config();
const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const fs = require('fs');

fs.mkdirSync(path.join(__dirname, 'uploads'), { recursive: true });

// Initialize DB (runs schema creation on first launch)
require('./db/database');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*' }
});

// Middleware
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Make io accessible in route handlers
app.set('io', io);

// Routes (we'll build these next)
app.use('/api/auth',   require('./routes/auth'));
app.use('/api/food',   require('./routes/food'));
app.use('/api/drinks', require('./routes/drinks'));
app.use('/api/slides', require('./routes/slides'));
app.use('/api/settings',  require('./routes/settings'));
app.use('/api/weather',   require('./routes/weather'));
app.use('/api/drawings',  require('./routes/drawings'));

app.use('/register', express.static(path.join(__dirname, 'public')));
app.get('/register/:code', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/register.html'));
});

// Socket.io connection
io.on('connection', (socket) => {
  console.log('Display client connected:', socket.id);
  socket.on('disconnect', () => {
    console.log('Display client disconnected:', socket.id);
  });
});

// Serve display app static assets
app.use('/display', express.static(path.join(__dirname, '../display/dist')));
app.get('/display/*splat', (req, res) => {
  res.sendFile(path.join(__dirname, '../display/dist/index.html'));
});

// Serve admin app static assets
app.use('/admin', express.static(path.join(__dirname, '../admin/dist')));
app.get('/admin/*splat', (req, res) => {
  res.sendFile(path.join(__dirname, '../admin/dist/index.html'));
});

// Health check
app.get('/health', (req, res) => res.json({ status: 'ok' }));

// Root redirect
app.get('/', (req, res) => res.redirect('/admin'));

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Bar Display server running on port ${PORT}`);
});
