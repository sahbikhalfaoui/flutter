require('dotenv').config();
const express = require('express');
const cors = require('cors');
const connectDB = require('./config/database');
const seedDatabase = require('./utils/seedDatabase');

// Import routes
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const congeRoutes = require('./routes/conges');
const questionRoutes = require('./routes/questions');
const dashboardRoutes = require('./routes/dashboard');

const app = express();
const PORT = process.env.PORT || 3000;

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

// Initialize database with seed data
const initializeApp = async () => {
  await seedDatabase();
};

// Start server
app.listen(PORT, async () => {
  console.log(`Serveur démarré sur le port ${PORT}`);
  await initializeApp();
});

module.exports = app;