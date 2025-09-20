// backend/server.js (Updated)
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const http = require('http');
const WebSocket = require('ws');
const jwt = require('jsonwebtoken');
const connectDB = require('./config/database');
const seedDatabase = require('./utils/seedDatabase');
const { addClient, removeClient } = require('./services/notificationService');

// Import routes
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const congeRoutes = require('./routes/conges');
const questionRoutes = require('./routes/questions');
const dashboardRoutes = require('./routes/dashboard');
const notificationRoutes = require('./routes/notifications');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// Middleware
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static('uploads'));

// Connect to database
connectDB();

// Routes
app.use('/api', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/conges', congeRoutes);
app.use('/api/questions-rh', questionRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/notifications', notificationRoutes);

// WebSocket connection handling for real-time notifications
wss.on('connection', (ws, req) => {
  console.log('New WebSocket connection');
  
  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);
      
      if (data.type === 'authenticate' && data.token) {
        try {
          const decoded = jwt.verify(data.token, JWT_SECRET);
          ws.userId = decoded.id;
          addClient(decoded.id, ws);
          
          ws.send(JSON.stringify({
            type: 'authenticated',
            message: 'WebSocket authenticated successfully',
          }));
        } catch (error) {
          console.error('WebSocket authentication error:', error);
          ws.send(JSON.stringify({
            type: 'error',
            message: 'Authentication failed',
          }));
          ws.close();
        }
      }
    } catch (error) {
      console.error('WebSocket message error:', error);
    }
  });
  
  ws.on('close', () => {
    if (ws.userId) {
      removeClient(ws.userId);
    }
    console.log('WebSocket connection closed');
  });
  
  ws.on('error', (error) => {
    console.error('WebSocket error:', error);
    if (ws.userId) {
      removeClient(ws.userId);
    }
  });
});

// Initialize database with seed data
const initializeApp = async () => {
  await seedDatabase();
};

// Start server
server.listen(PORT, async () => {
  console.log(`Serveur démarré sur le port ${PORT}`);
  console.log(`WebSocket server running on ws://localhost:${PORT}`);
  await initializeApp();
});

module.exports = app;