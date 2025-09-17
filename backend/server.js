const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// Initialize Express app
const app = express();

// CORS configuration
app.use(cors({
  origin: process.env.CORS_ORIGIN?.split(',') || ['http://localhost:8000', 'http://localhost:3000'],
  credentials: true
}));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Serve static files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// File upload middleware
const multer = require('multer');
const upload = multer({
  dest: 'uploads/',
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE) || 5242880, // 5MB
  }
});

// Make upload available globally
app.use((req, res, next) => {
  req.upload = upload.single('attachment');
  req.uploadFiles = upload.fields([
    { name: 'attachment', maxCount: 1 },
    { name: 'attachments', maxCount: 10 }
  ]);
  next();
});

// Simple logging
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path}`);
  next();
});

// Import routes (only load what exists)
let authRoutes, leaveRoutes, hrRoutes, teamRoutes;
try {
  authRoutes = require('./routes/auth');
} catch (e) {
  console.log('Auth routes not available');
}

try {
  leaveRoutes = require('./routes/leaves');
} catch (e) {
  console.log('Leave routes not available');
}

try {
  hrRoutes = require('./routes/hr');
} catch (e) {
  console.log('HR routes not available');
}

try {
  teamRoutes = require('./routes/teams');
} catch (e) {
  console.log('Team routes not available');
}

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: '4YOU HR Backend is running!',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
    version: '1.0.0'
  });
});

// API info endpoint
app.get('/api', (req, res) => {
  res.json({
    success: true,
    message: '4YOU HR API - Minimal Setup',
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    endpoints: {
      health: '/api/health',
      auth: '/api/auth',
      leaves: '/api/leaves',
      hrQuestions: '/api/hr-questions',
      teams: '/api/teams'
    },
    docs: 'See README.md for complete API documentation',
    status: {
      auth: authRoutes ? 'available' : 'not available',
      leaves: leaveRoutes ? 'available' : 'not available',
      hr: hrRoutes ? 'available' : 'not available',
      teams: teamRoutes ? 'available' : 'not available'
    }
  });
});

// API routes - only mount if available
if (authRoutes) {
  app.use('/api/auth', authRoutes);
  console.log('✓ Auth routes loaded');
}

if (leaveRoutes) {
  app.use('/api/leaves', leaveRoutes);
  console.log('✓ Leave routes loaded');
}

if (hrRoutes) {
  app.use('/api/hr-questions', hrRoutes);
  console.log('✓ HR routes loaded');
}

if (teamRoutes) {
  app.use('/api/teams', teamRoutes);
  console.log('✓ Team routes loaded');
}

// Handle undefined routes
app.all('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.originalUrl} non trouvée sur ce serveur`,
    code: 'ROUTE_NOT_FOUND',
    availableRoutes: [
      '/api/health',
      '/api/',
      '/api/auth/*',
      '/api/leaves/*',
      '/api/hr-questions/*',
      '/api/teams/*'
    ],
    status: 'minimal'
  });
});

// Global error handler (simplified)
app.use((err, req, res, next) => {
  console.error('Error:', err.message);

  // Handle different error types
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      success: false,
      message: 'Erreur de validation',
      errors: Object.values(err.errors).map(e => e.message),
      code: 'VALIDATION_ERROR'
    });
  }

  if (err.code === 11000) {
    return res.status(409).json({
      success: false,
      message: 'Duplication détectée',
      code: 'DUPLICATE_ERROR'
    });
  }

  // Default error
  res.status(500).json({
    success: false,
    message: 'Erreur serveur',
    code: 'SERVER_ERROR',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// Connect to MongoDB
const connectDB = async () => {
  try {
    const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/fouryou_hr';
    const conn = await mongoose.connect(mongoURI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
    console.log(`📊 Database: ${conn.connection.name}`);
  } catch (error) {
    console.error('❌ MongoDB Connection Error:', error.message);
    console.error('📋 Make sure MongoDB is installed and running!');
    console.error('📚 For Windows: Download from mongodb.com/try/download/community');
    console.error('📚 For other OS: Use your package manager or download from mongodb.com');

    // Try to start without MongoDB for testing
    if (process.env.NODE_ENV !== 'test') {
      console.log('🚧 Starting server without database (limited functionality)...');
      return { connected: false };
    }
  }
};

// Get port
const PORT = process.env.PORT || 5000;

// Start server
const startServer = async () => {
  try {
    const dbConnection = await connectDB();

    const server = app.listen(PORT, () => {
      console.log(`
🚀 4YOU HR BACKEND - MINIMAL SETUP
=====================================
📍 Local:         http://localhost:${PORT}
🔗 API Base:      http://localhost:${PORT}/api
🩺 Health Check:  http://localhost:${PORT}/api/health
📖 API Info:      http://localhost:${PORT}/api/
🌍 Environment:   ${process.env.NODE_ENV || 'development'}
⚡ Database:       ${dbConnection?.connected !== false ? 'Connected' : 'Not Connected (limited mode)'}
⏰ Started at:     ${new Date().toLocaleString()}

📋 Available Routes:
${authRoutes ? '✅ /api/auth/*         - User authentication & management' : '❌ /api/auth/*         - Auth routes not loaded'}
${leaveRoutes ? '✅ /api/leaves/*        - Leave management system' : '❌ /api/leaves/*        - Leave routes not loaded'}
${hrRoutes ? '✅ /api/hr-questions/*  - HR questions & conversations' : '❌ /api/hr-questions/*  - HR routes not loaded'}
${teamRoutes ? '✅ /api/teams/*         - Team management & organization' : '❌ /api/teams/*         - Team routes not loaded'}

💡 Your Flutter HR app is ready to connect!
🔧 Use http://localhost:${PORT}/api as the base URL
📱 Update your Flutter services with real API endpoints
      `);
    });

    // Graceful shutdown
    process.on('SIGINT', () => {
      console.log('🛑 SIGINT received, shutting down gracefully...');
      server.close(() => {
        console.log('📴 Server closed');
        mongoose.connection.close(() => {
          console.log('📴 Database connection closed');
          process.exit(0);
        });
      });
    });

  } catch (error) {
    console.error('❌ Error starting the server:', error.message);
    process.exit(1);
  }
};

// Start the server
startServer();

// Export for testing
module.exports = app;
