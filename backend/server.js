// server.js
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const path = require('path');
require('dotenv').config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static('uploads'));

// File upload configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + file.originalname);
  }
});
const upload = multer({ storage });

// MongoDB connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/hr_4you', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

// Database connection event handlers
mongoose.connection.on('connected', () => {
  console.log('✅ Connected to MongoDB');
});

mongoose.connection.on('error', (err) => {
  console.error('❌ MongoDB connection error:', err);
});

mongoose.connection.on('disconnected', () => {
  console.log('⚠️ MongoDB disconnected');
});

// User Schema
const userSchema = new mongoose.Schema({
  identifiant: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  name: { type: String, default: 'John Doe' },
  role: { type: String, enum: ['Gestionnaire', 'Manager', 'Collaborateur'], default: 'Manager' },
  language: { type: String, default: 'Français' },
  profileImage: { type: String, default: null },
  paperworkCount: { type: Number, default: 3 },
  // Leave balance info
  leaveBalance: {
    conges: { taken: { type: Number, default: 3 }, total: { type: Number, default: 3 } },
    autresAbsences: { taken: { type: Number, default: 0 }, total: { type: Number, default: 5 } }
  },
  createdAt: { type: Date, default: Date.now }
}, {
  timestamps: true // Automatically adds createdAt and updatedAt
});

// Create indexes for User
userSchema.index({ identifiant: 1 }, { unique: true });
userSchema.index({ role: 1 });
userSchema.index({ createdAt: -1 });

const User = mongoose.model('User', userSchema);

// Task Group Schema (for homepage task groups)
const taskGroupSchema = new mongoose.Schema({
  title: { type: String, required: true },
  progress: { type: Number, default: 0 },
  bgColor: { type: String, default: '#FFFDF0' },
  imagePath: { type: String, required: true },
  category: { type: String, required: true }, // 'leave', 'hr', 'planning', etc.
  isActive: { type: Boolean, default: true },
  order: { type: Number, default: 0 }
}, {
  timestamps: true
});

// Create indexes for TaskGroup
taskGroupSchema.index({ category: 1 });
taskGroupSchema.index({ isActive: 1, order: 1 });
taskGroupSchema.index({ title: 'text' }); // Text search index

const TaskGroup = mongoose.model('TaskGroup', taskGroupSchema);

// Leave Request Schema
const leaveRequestSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  mainCategory: { type: String, required: true }, // 'Congé' or 'Congé exceptionnel'
  subCategory: { type: String, required: true }, // 'RTT', 'CPP', 'Civisme', etc.
  specificType: { type: String }, // For exceptional leaves like 'Activité civique'
  dates: [{ type: Date, required: true }],
  justification: { type: String },
  attachedFile: { type: String }, // File path
  status: { type: String, enum: ['draft', 'pending', 'approved', 'rejected'], default: 'pending' },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}, {
  timestamps: true
});

// Create indexes for LeaveRequest
leaveRequestSchema.index({ userId: 1, status: 1 });
leaveRequestSchema.index({ userId: 1, createdAt: -1 });
leaveRequestSchema.index({ mainCategory: 1, subCategory: 1 });
leaveRequestSchema.index({ status: 1, createdAt: -1 });
leaveRequestSchema.index({ dates: 1 });

const LeaveRequest = mongoose.model('LeaveRequest', leaveRequestSchema);

// HR Question Schema
const hrQuestionSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  beneficiaire: { type: String, required: true },
  category: { type: String, required: true },
  subCategory: { type: String },
  title: { type: String, required: true },
  description: { type: String, required: true },
  attachedFile: { type: String },
  notifyBeneficiary: { type: Boolean, default: false },
  status: { type: String, enum: ['draft', 'pending', 'approved', 'rejected'], default: 'pending' },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}, {
  timestamps: true
});

// Create indexes for HRQuestion
hrQuestionSchema.index({ userId: 1, status: 1 });
hrQuestionSchema.index({ userId: 1, createdAt: -1 });
hrQuestionSchema.index({ category: 1, subCategory: 1 });
hrQuestionSchema.index({ status: 1, createdAt: -1 });
hrQuestionSchema.index({ title: 'text', description: 'text' }); // Text search index

const HRQuestion = mongoose.model('HRQuestion', hrQuestionSchema);

// Notification Schema
const notificationSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  title: { type: String, required: true },
  message: { type: String, required: true },
  type: { type: String, enum: ['leave', 'hr', 'system', 'reminder'], default: 'system' },
  isRead: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
}, {
  timestamps: true
});

// Create indexes for Notification
notificationSchema.index({ userId: 1, isRead: 1 });
notificationSchema.index({ userId: 1, createdAt: -1 });
notificationSchema.index({ type: 1 });

const Notification = mongoose.model('Notification', notificationSchema);

// Calendar Event Schema
const calendarEventSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  title: { type: String, required: true },
  description: { type: String },
  startDate: { type: Date, required: true },
  endDate: { type: Date, required: true },
  type: { type: String, enum: ['leave', 'meeting', 'holiday', 'personal'], default: 'personal' },
  isAllDay: { type: Boolean, default: true },
  relatedId: { type: mongoose.Schema.Types.ObjectId }, // Link to leave request, etc.
  createdAt: { type: Date, default: Date.now }
}, {
  timestamps: true
});

// Create indexes for CalendarEvent
calendarEventSchema.index({ userId: 1, startDate: 1 });
calendarEventSchema.index({ userId: 1, endDate: 1 });
calendarEventSchema.index({ type: 1 });
calendarEventSchema.index({ startDate: 1, endDate: 1 });

const CalendarEvent = mongoose.model('CalendarEvent', calendarEventSchema);

// Colleague Schema
const colleagueSchema = new mongoose.Schema({
  name: { type: String, required: true },
  department: { type: String, required: true },
  position: { type: String, required: true },
  email: { type: String, required: true },
  phone: { type: String },
  profileImage: { type: String },
  isAvailable: { type: Boolean, default: true },
  leaveSchedule: [{
    startDate: Date,
    endDate: Date,
    type: String
  }]
}, {
  timestamps: true
});

// Create indexes for Colleague
colleagueSchema.index({ department: 1 });
colleagueSchema.index({ isAvailable: 1 });
colleagueSchema.index({ email: 1 }, { unique: true });
colleagueSchema.index({ name: 'text' }); // Text search index

const Colleague = mongoose.model('Colleague', colleagueSchema);

// Document/Attestation Schema
const documentSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  title: { type: String, required: true },
  type: { type: String, required: true }, // 'salary', 'employment', 'tax', etc.
  filePath: { type: String, required: true },
  generatedDate: { type: Date, default: Date.now },
  validUntil: { type: Date },
  status: { type: String, enum: ['active', 'expired', 'revoked'], default: 'active' }
}, {
  timestamps: true
});

// Create indexes for Document
documentSchema.index({ userId: 1, status: 1 });
documentSchema.index({ userId: 1, generatedDate: -1 });
documentSchema.index({ type: 1 });
documentSchema.index({ validUntil: 1 });

const Document = mongoose.model('Document', documentSchema);

// JWT middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.sendStatus(401);
  }

  jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key', (err, user) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
};

// Routes

// Auth Routes
app.post('/api/auth/login', async (req, res) => {
  try {
    const { identifiant, password } = req.body;
    
    // Find user
    let user = await User.findOne({ identifiant });
    
    // Create default user if doesn't exist (for demo purposes)
    if (!user) {
      const hashedPassword = await bcrypt.hash(password, 10);
      user = new User({
        identifiant,
        password: hashedPassword,
        name: 'John Doe'
      });
      await user.save();
    } else {
      // Verify password
      const validPassword = await bcrypt.compare(password, user.password);
      if (!validPassword) {
        return res.status(400).json({ message: 'Invalid credentials' });
      }
    }

    // Generate JWT
    const token = jwt.sign(
      { userId: user._id, identifiant: user.identifiant },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '24h' }
    );

    res.json({
      token,
      user: {
        id: user._id,
        identifiant: user.identifiant,
        name: user.name,
        role: user.role,
        language: user.language
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// User Profile Routes
app.get('/api/user/profile', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select('-password');
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

app.put('/api/user/profile', authenticateToken, async (req, res) => {
  try {
    const { name, role } = req.body;
    const user = await User.findByIdAndUpdate(
      req.user.userId,
      { name, role },
      { new: true }
    ).select('-password');
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Task Groups Routes (for homepage)
app.get('/api/task-groups', authenticateToken, async (req, res) => {
  try {
    const { search } = req.query;
    let query = { isActive: true };
    
    if (search) {
      query.title = { $regex: search, $options: 'i' };
    }
    
    const taskGroups = await TaskGroup.find(query).sort({ order: 1 });
    res.json(taskGroups);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Initialize default task groups
app.post('/api/task-groups/initialize', async (req, res) => {
  try {
    const count = await TaskGroup.countDocuments();
    if (count === 0) {
      const defaultTaskGroups = [
        { title: "Mes congés", progress: 0.7, imagePath: "lib/assets/images.jpg", category: "leave", order: 1 },
        { title: "Mes questions RH", progress: 0.52, imagePath: "lib/assets/images.jpg", category: "hr", order: 2 },
        { title: "Le planning de mes collégues", progress: 0.87, imagePath: "lib/assets/images.jpg", category: "planning", order: 3 },
        { title: "Mes attestations", progress: 0.87, imagePath: "lib/assets/images.jpg", category: "documents", order: 4 },
        { title: "Je suis malade", progress: 0.87, imagePath: "lib/assets/images.jpg", category: "sick", order: 5 },
        { title: "Mon mode de transport", progress: 0.87, imagePath: "lib/assets/images.jpg", category: "transport", order: 6 },
        { title: "Mon déménagement", progress: 0.87, imagePath: "lib/assets/images.jpg", category: "moving", order: 7 },
        { title: "Mon changement de situation familliale", progress: 0.87, imagePath: "lib/assets/images.jpg", category: "family", order: 8 },
        { title: "Mon changement de composition familliale", progress: 0.87, imagePath: "lib/assets/images.jpg", category: "family_composition", order: 9 },
        { title: "Ma demande d'acompte", progress: 0.87, imagePath: "lib/assets/images.jpg", category: "advance", order: 10 }
      ];
      await TaskGroup.insertMany(defaultTaskGroups);
      res.json({ message: 'Task groups initialized', count: defaultTaskGroups.length });
    } else {
      res.json({ message: 'Task groups already exist', count });
    }
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Leave Request Routes
app.get('/api/leaves', authenticateToken, async (req, res) => {
  try {
    const leaves = await LeaveRequest.find({ userId: req.user.userId })
      .sort({ createdAt: -1 });
    res.json(leaves);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

app.post('/api/leaves', authenticateToken, upload.single('attachment'), async (req, res) => {
  try {
    const {
      mainCategory,
      subCategory,
      specificType,
      dates,
      justification,
      status = 'pending'
    } = req.body;

    const leaveRequest = new LeaveRequest({
      userId: req.user.userId,
      mainCategory,
      subCategory,
      specificType,
      dates: JSON.parse(dates), // Parse dates array from string
      justification,
      attachedFile: req.file ? req.file.filename : null,
      status
    });

    await leaveRequest.save();
    res.status(201).json(leaveRequest);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

app.put('/api/leaves/:id', authenticateToken, upload.single('attachment'), async (req, res) => {
  try {
    const {
      mainCategory,
      subCategory,
      specificType,
      dates,
      justification,
      status
    } = req.body;

    const updateData = {
      mainCategory,
      subCategory,
      specificType,
      dates: dates ? JSON.parse(dates) : undefined,
      justification,
      status,
      updatedAt: new Date()
    };

    if (req.file) {
      updateData.attachedFile = req.file.filename;
    }

    const leaveRequest = await LeaveRequest.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.userId },
      updateData,
      { new: true }
    );

    if (!leaveRequest) {
      return res.status(404).json({ message: 'Leave request not found' });
    }

    res.json(leaveRequest);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

app.delete('/api/leaves/:id', authenticateToken, async (req, res) => {
  try {
    const leaveRequest = await LeaveRequest.findOneAndDelete({
      _id: req.params.id,
      userId: req.user.userId
    });

    if (!leaveRequest) {
      return res.status(404).json({ message: 'Leave request not found' });
    }

    res.json({ message: 'Leave request deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// HR Questions Routes
app.get('/api/hr-questions', authenticateToken, async (req, res) => {
  try {
    const questions = await HRQuestion.find({ userId: req.user.userId })
      .sort({ createdAt: -1 });
    res.json(questions);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

app.post('/api/hr-questions', authenticateToken, upload.single('attachment'), async (req, res) => {
  try {
    const {
      beneficiaire,
      category,
      subCategory,
      title,
      description,
      notifyBeneficiary = false,
      status = 'pending'
    } = req.body;

    const hrQuestion = new HRQuestion({
      userId: req.user.userId,
      beneficiaire,
      category,
      subCategory,
      title,
      description,
      attachedFile: req.file ? req.file.filename : null,
      notifyBeneficiary,
      status
    });

    await hrQuestion.save();
    res.status(201).json(hrQuestion);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

app.put('/api/hr-questions/:id', authenticateToken, upload.single('attachment'), async (req, res) => {
  try {
    const {
      beneficiaire,
      category,
      subCategory,
      title,
      description,
      notifyBeneficiary,
      status
    } = req.body;

    const updateData = {
      beneficiaire,
      category,
      subCategory,
      title,
      description,
      notifyBeneficiary,
      status,
      updatedAt: new Date()
    };

    if (req.file) {
      updateData.attachedFile = req.file.filename;
    }

    const hrQuestion = await HRQuestion.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.userId },
      updateData,
      { new: true }
    );

    if (!hrQuestion) {
      return res.status(404).json({ message: 'HR question not found' });
    }

    res.json(hrQuestion);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

app.delete('/api/hr-questions/:id', authenticateToken, async (req, res) => {
  try {
    const hrQuestion = await HRQuestion.findOneAndDelete({
      _id: req.params.id,
      userId: req.user.userId
    });

    if (!hrQuestion) {
      return res.status(404).json({ message: 'HR question not found' });
    }

    res.json({ message: 'HR question deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Notifications Routes
app.get('/api/notifications', authenticateToken, async (req, res) => {
  try {
    const notifications = await Notification.find({ userId: req.user.userId })
      .sort({ createdAt: -1 })
      .limit(50);
    res.json(notifications);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

app.put('/api/notifications/:id/read', authenticateToken, async (req, res) => {
  try {
    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.userId },
      { isRead: true },
      { new: true }
    );
    res.json(notification);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

app.put('/api/notifications/read-all', authenticateToken, async (req, res) => {
  try {
    await Notification.updateMany(
      { userId: req.user.userId, isRead: false },
      { isRead: true }
    );
    res.json({ message: 'All notifications marked as read' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Calendar Routes
app.get('/api/calendar/events', authenticateToken, async (req, res) => {
  try {
    const { month, year } = req.query;
    let query = { userId: req.user.userId };
    
    if (month && year) {
      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 0);
      query.startDate = { $gte: startDate, $lte: endDate };
    }
    
    const events = await CalendarEvent.find(query).sort({ startDate: 1 });
    res.json(events);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

app.post('/api/calendar/events', authenticateToken, async (req, res) => {
  try {
    const event = new CalendarEvent({
      ...req.body,
      userId: req.user.userId
    });
    await event.save();
    res.status(201).json(event);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Colleagues Routes
app.get('/api/colleagues', authenticateToken, async (req, res) => {
  try {
    const colleagues = await Colleague.find({ isAvailable: true });
    res.json(colleagues);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

app.get('/api/colleagues/:id/schedule', authenticateToken, async (req, res) => {
  try {
    const colleague = await Colleague.findById(req.params.id);
    if (!colleague) {
      return res.status(404).json({ message: 'Colleague not found' });
    }
    res.json(colleague.leaveSchedule);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Documents/Attestations Routes
app.get('/api/documents', authenticateToken, async (req, res) => {
  try {
    const documents = await Document.find({ 
      userId: req.user.userId,
      status: 'active'
    }).sort({ generatedDate: -1 });
    res.json(documents);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

app.post('/api/documents/generate', authenticateToken, async (req, res) => {
  try {
    const { title, type } = req.body;
    
    // In a real app, you would generate the actual document here
    const document = new Document({
      userId: req.user.userId,
      title,
      type,
      filePath: `/generated/${Date.now()}-${type}.pdf`, // Mock file path
      validUntil: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) // Valid for 1 year
    });
    
    await document.save();
    res.status(201).json(document);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Sick Leave Routes
app.post('/api/sick-leave', authenticateToken, async (req, res) => {
  try {
    const { startDate, endDate, reason, doctorNote } = req.body;
    
    // Create sick leave record (similar to leave request but specific type)
    const sickLeave = new LeaveRequest({
      userId: req.user.userId,
      mainCategory: 'Congé exceptionnel',
      subCategory: 'Maladie / Accident',
      specificType: 'Absence maladie',
      dates: [new Date(startDate), new Date(endDate)],
      justification: reason,
      attachedFile: doctorNote,
      status: 'pending'
    });

    await sickLeave.save();

    // Create notification for managers
    const notification = new Notification({
      userId: req.user.userId,
      title: 'Arrêt maladie déclaré',
      message: `Arrêt maladie du ${startDate} au ${endDate}`,
      type: 'leave'
    });
    await notification.save();

    res.status(201).json(sickLeave);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Transport/Moving/Family Change Routes
app.post('/api/life-events', authenticateToken, async (req, res) => {
  try {
    const { eventType, details, effectiveDate, attachments } = req.body;
    
    // Create HR question for life events
    const hrQuestion = new HRQuestion({
      userId: req.user.userId,
      beneficiaire: req.user.identifiant,
      category: 'Données personnelles',
      subCategory: eventType,
      title: `Changement - ${eventType}`,
      description: details,
      attachedFile: attachments,
      notifyBeneficiary: true,
      status: 'pending'
    });

    await hrQuestion.save();
    res.status(201).json(hrQuestion);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Advance Payment Request Routes
app.post('/api/advance-payment', authenticateToken, async (req, res) => {
  try {
    const { amount, reason, requestedDate } = req.body;
    
    const advanceRequest = new HRQuestion({
      userId: req.user.userId,
      beneficiaire: req.user.identifiant,
      category: 'Autre',
      subCategory: 'Autre',
      title: `Demande d'acompte - ${amount}€`,
      description: `Montant: ${amount}€\nRaison: ${reason}\nDate souhaitée: ${requestedDate}`,
      notifyBeneficiary: true,
      status: 'pending'
    });

    await advanceRequest.save();
    res.status(201).json(advanceRequest);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Dashboard Routes
app.get('/api/dashboard/stats', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    
    // Get user with leave balance
    const user = await User.findById(userId).select('leaveBalance paperworkCount');
    
    const leaveStats = await LeaveRequest.aggregate([
      { $match: { userId: mongoose.Types.ObjectId(userId) } },
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);
    
    const questionStats = await HRQuestion.aggregate([
      { $match: { userId: mongoose.Types.ObjectId(userId) } },
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);

    const totalLeaves = await LeaveRequest.countDocuments({ userId });
    const totalQuestions = await HRQuestion.countDocuments({ userId });
    const unreadNotifications = await Notification.countDocuments({ 
      userId, 
      isRead: false 
    });

    // Get recent leaves and questions for task cards
    const recentLeaves = await LeaveRequest.find({ userId })
      .sort({ createdAt: -1 })
      .limit(5);
    
    const recentQuestions = await HRQuestion.find({ userId })
      .sort({ createdAt: -1 })
      .limit(5);

    res.json({
      user: {
        leaveBalance: user.leaveBalance,
        paperworkCount: user.paperworkCount
      },
      stats: {
        totalLeaves,
        totalQuestions,
        unreadNotifications,
        leaveStats,
        questionStats
      },
      recent: {
        leaves: recentLeaves,
        questions: recentQuestions
      },
      taskCards: [
        {
          title: "Mon solde de congés",
          subtitle: `${user.leaveBalance.conges.taken}J/${user.leaveBalance.conges.total}J`,
          bgGradient: ["#8E44AD", "#BF61E4"],
          progressColor: "white"
        },
        {
          title: "Mes autres absences", 
          subtitle: `${user.leaveBalance.autresAbsences.taken}J pris`,
          bgColor: "#8E44AD",
          progressColor: "white"
        }
      ]
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Search functionality for homepage
app.get('/api/search', authenticateToken, async (req, res) => {
  try {
    const { query } = req.query;
    if (!query) {
      return res.json({ taskGroups: [], leaves: [], questions: [] });
    }

    const searchRegex = { $regex: query, $options: 'i' };
    
    const taskGroups = await TaskGroup.find({ 
      title: searchRegex,
      isActive: true 
    });
    
    const leaves = await LeaveRequest.find({ 
      userId: req.user.userId,
      $or: [
        { mainCategory: searchRegex },
        { subCategory: searchRegex },
        { specificType: searchRegex }
      ]
    }).limit(5);
    
    const questions = await HRQuestion.find({ 
      userId: req.user.userId,
      $or: [
        { title: searchRegex },
        { category: searchRegex },
        { description: searchRegex }
      ]
    }).limit(5);

    res.json({ taskGroups, leaves, questions });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Welcome message and user info for homepage
app.get('/api/dashboard/welcome', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select('-password');
    const currentHour = new Date().getHours();
    
    let greeting = "Bonne journée";
    if (currentHour < 12) greeting = "Bonjour";
    else if (currentHour < 18) greeting = "Bon après-midi";
    else greeting = "Bonsoir";
    
    const unreadNotifications = await Notification.countDocuments({ 
      userId: req.user.userId, 
      isRead: false 
    });

    res.json({
      greeting: `${greeting}, ${user.name}!`,
      user: {
        name: user.name,
        role: user.role,
        paperworkCount: user.paperworkCount,
        profileImage: user.profileImage
      },
      unreadNotifications
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Initialize database indexes and setup
app.get('/api/setup/indexes', async (req, res) => {
  try {
    console.log('🔧 Setting up database indexes...');
    
    // Ensure all indexes are created
    await User.createIndexes();
    await TaskGroup.createIndexes();
    await LeaveRequest.createIndexes();
    await HRQuestion.createIndexes();
    await Notification.createIndexes();
    await CalendarEvent.createIndexes();
    await Colleague.createIndexes();
    await Document.createIndexes();
    
    // Get all indexes for verification
    const userIndexes = await User.collection.getIndexes();
    const taskGroupIndexes = await TaskGroup.collection.getIndexes();
    const leaveRequestIndexes = await LeaveRequest.collection.getIndexes();
    const hrQuestionIndexes = await HRQuestion.collection.getIndexes();
    const notificationIndexes = await Notification.collection.getIndexes();
    const calendarEventIndexes = await CalendarEvent.collection.getIndexes();
    const colleagueIndexes = await Colleague.collection.getIndexes();
    const documentIndexes = await Document.collection.getIndexes();
    
    console.log('✅ All database indexes created successfully!');
    
    res.json({
      message: 'Database indexes created successfully',
      indexes: {
        users: Object.keys(userIndexes),
        taskGroups: Object.keys(taskGroupIndexes),
        leaveRequests: Object.keys(leaveRequestIndexes),
        hrQuestions: Object.keys(hrQuestionIndexes),
        notifications: Object.keys(notificationIndexes),
        calendarEvents: Object.keys(calendarEventIndexes),
        colleagues: Object.keys(colleagueIndexes),
        documents: Object.keys(documentIndexes)
      }
    });
  } catch (error) {
    console.error('❌ Error creating indexes:', error);
    res.status(500).json({ message: 'Error creating indexes', error: error.message });
  }
});

// Database status and indexes info
app.get('/api/setup/database-info', async (req, res) => {
  try {
    const collections = await mongoose.connection.db.listCollections().toArray();
    
    const dbInfo = {
      database: mongoose.connection.name,
      collections: [],
      totalDocuments: 0
    };
    
    for (const collection of collections) {
      const collectionName = collection.name;
      const collectionObj = mongoose.connection.db.collection(collectionName);
      
      const indexes = await collectionObj.indexes();
      const count = await collectionObj.countDocuments();
      
      dbInfo.collections.push({
        name: collectionName,
        documentCount: count,
        indexes: indexes.map(index => ({
          name: index.name,
          keys: index.key,
          unique: index.unique || false,
          text: index.textIndexVersion ? true : false
        }))
      });
      
      dbInfo.totalDocuments += count;
    }
    
    res.json(dbInfo);
  } catch (error) {
    res.status(500).json({ message: 'Error getting database info', error: error.message });
  }
});

// Initialize demo data for demo
app.post('/api/initialize-demo-data', async (req, res) => {
  try {
    // Create sample colleagues
    const colleaguesCount = await Colleague.countDocuments();
    if (colleaguesCount === 0) {
      const sampleColleagues = [
        {
          name: "Marie Dupont",
          department: "RH",
          position: "Gestionnaire RH",
          email: "marie.dupont@company.com",
          isAvailable: true,
          leaveSchedule: []
        },
        {
          name: "Pierre Martin", 
          department: "IT",
          position: "Développeur",
          email: "pierre.martin@company.com",
          isAvailable: false,
          leaveSchedule: [
            {
              startDate: new Date('2024-01-15'),
              endDate: new Date('2024-01-19'),
              type: 'Congés payés'
            }
          ]
        },
        {
          name: "Sophie Bernard", 
          department: "Marketing",
          position: "Chef de projet",
          email: "sophie.bernard@company.com",
          isAvailable: true,
          leaveSchedule: []
        }
      ];
      await Colleague.insertMany(sampleColleagues);
    }

    res.json({ message: 'Demo data initialized successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Complete setup endpoint that initializes everything
app.post('/api/setup/complete', async (req, res) => {
  try {
    console.log('🚀 Starting complete setup...');
    
    // 1. Create all database indexes
    await User.createIndexes();
    await TaskGroup.createIndexes();
    await LeaveRequest.createIndexes();
    await HRQuestion.createIndexes();
    await Notification.createIndexes();
    await CalendarEvent.createIndexes();
    await Colleague.createIndexes();
    await Document.createIndexes();
    
    // 2. Initialize task groups if not exist
    const taskGroupsCount = await TaskGroup.countDocuments();
    if (taskGroupsCount === 0) {
      const defaultTaskGroups = [
        { title: "Mes congés", progress: 0.7, imagePath: "lib/assets/images.jpg", category: "leave", order: 1 },
        { title: "Mes questions RH", progress: 0.52, imagePath: "lib/assets/images.jpg", category: "hr", order: 2 },
        { title: "Le planning de mes collégues", progress: 0.87, imagePath: "lib/assets/images.jpg", category: "planning", order: 3 },
        { title: "Mes attestations", progress: 0.87, imagePath: "lib/assets/images.jpg", category: "documents", order: 4 },
        { title: "Je suis malade", progress: 0.87, imagePath: "lib/assets/images.jpg", category: "sick", order: 5 },
        { title: "Mon mode de transport", progress: 0.87, imagePath: "lib/assets/images.jpg", category: "transport", order: 6 },
        { title: "Mon déménagement", progress: 0.87, imagePath: "lib/assets/images.jpg", category: "moving", order: 7 },
        { title: "Mon changement de situation familliale", progress: 0.87, imagePath: "lib/assets/images.jpg", category: "family", order: 8 },
        { title: "Mon changement de composition familliale", progress: 0.87, imagePath: "lib/assets/images.jpg", category: "family_composition", order: 9 },
        { title: "Ma demande d'acompte", progress: 0.87, imagePath: "lib/assets/images.jpg", category: "advance", order: 10 }
      ];
      await TaskGroup.insertMany(defaultTaskGroups);
    }
    
    // 3. Initialize sample colleagues if not exist
    const colleaguesCount = await Colleague.countDocuments();
    if (colleaguesCount === 0) {
      const sampleColleagues = [
        {
          name: "Marie Dupont",
          department: "RH",
          position: "Gestionnaire RH",
          email: "marie.dupont@company.com",
          phone: "+33 1 23 45 67 89",
          profileImage: "lib/assets/profile_marie.jpg",
          isAvailable: true,
          leaveSchedule: [
            {
              startDate: new Date('2024-02-10'),
              endDate: new Date('2024-02-12'),
              type: 'RTT'
            }
          ]
        },
        {
          name: "Pierre Martin", 
          department: "IT",
          position: "Développeur",
          email: "pierre.martin@company.com",
          phone: "+33 1 23 45 67 90",
          profileImage: "lib/assets/profile_pierre.jpg",
          isAvailable: false,
          leaveSchedule: [
            {
              startDate: new Date('2024-01-15'),
              endDate: new Date('2024-01-19'),
              type: 'Congés payés'
            }
          ]
        },
        {
          name: "Sophie Bernard", 
          department: "Marketing",
          position: "Chef de projet",
          email: "sophie.bernard@company.com",
          phone: "+33 1 23 45 67 91",
          profileImage: "lib/assets/profile_sophie.jpg",
          isAvailable: true,
          leaveSchedule: []
        }
      ];
      await Colleague.insertMany(sampleColleagues);
    }
    
    console.log('✅ Complete setup finished successfully!');
    
    res.json({
      message: 'Complete setup finished successfully',
      initialized: {
        indexes: true,
        taskGroups: taskGroupsCount === 0,
        colleagues: colleaguesCount === 0
      }
    });
  } catch (error) {
    console.error('❌ Error in complete setup:', error);
    res.status(500).json({ message: 'Error in complete setup', error: error.message });
  }
});

// Create sample data with all fields to populate MongoDB collections
app.post('/api/setup/populate-sample-data', async (req, res) => {
  try {
    console.log('📝 Populating sample data with all fields...');
    
    // 1. Create a sample user with all fields
    const existingUser = await User.findOne({ identifiant: 'demo.user' });
    if (!existingUser) {
      const hashedPassword = await bcrypt.hash('demo123', 10);
      const sampleUser = new User({
        identifiant: 'demo.user',
        password: hashedPassword,
        name: 'Demo User',
        role: 'Manager',
        language: 'Français',
        profileImage: 'lib/assets/demo_profile.jpg',
        paperworkCount: 5,
        leaveBalance: {
          conges: { taken: 8, total: 25 },
          autresAbsences: { taken: 2, total: 10 }
        }
      });
      await sampleUser.save();
      console.log('✅ Sample user created');
    }
    
    // Get the demo user for creating related data
    const demoUser = await User.findOne({ identifiant: 'demo.user' });
    
    // 2. Create sample leave requests with all fields
    const leaveCount = await LeaveRequest.countDocuments({ userId: demoUser._id });
    if (leaveCount === 0) {
      const sampleLeaves = [
        {
          userId: demoUser._id,
          mainCategory: 'Congé',
          subCategory: 'RTT',
          specificType: null,
          dates: [new Date('2024-03-15'), new Date('2024-03-16')],
          justification: 'Repos bien mérité',
          attachedFile: 'sample_document.pdf',
          status: 'approved'
        },
        {
          userId: demoUser._id,
          mainCategory: 'Congé exceptionnel',
          subCategory: 'Famille',
          specificType: 'Congés naissance',
          dates: [new Date('2024-04-20'), new Date('2024-04-21'), new Date('2024-04-22')],
          justification: 'Naissance de mon enfant',
          attachedFile: 'birth_certificate.pdf',
          status: 'pending'
        },
        {
          userId: demoUser._id,
          mainCategory: 'Congé exceptionnel',
          subCategory: 'Maladie / Accident',
          specificType: 'Absence maladie',
          dates: [new Date('2024-02-10')],
          justification: 'Grippe',
          attachedFile: 'arret_travail.pdf',
          status: 'draft'
        }
      ];
      await LeaveRequest.insertMany(sampleLeaves);
      console.log('✅ Sample leave requests created');
    }
    
    // 3. Create sample HR questions with all fields
    const questionCount = await HRQuestion.countDocuments({ userId: demoUser._id });
    if (questionCount === 0) {
      const sampleQuestions = [
        {
          userId: demoUser._id,
          beneficiaire: 'Demo User',
          category: 'Données personnelles',
          subCategory: 'Changement d\'adresse',
          title: 'Mise à jour adresse personnelle',
          description: 'Je souhaite mettre à jour mon adresse suite à mon déménagement.',
          attachedFile: 'justificatif_domicile.pdf',
          notifyBeneficiary: true,
          status: 'pending'
        },
        {
          userId: demoUser._id,
          beneficiaire: 'Demo User',
          category: 'Attestations',
          subCategory: 'Attestation',
          title: 'Demande attestation de salaire',
          description: 'J\'ai besoin d\'une attestation de salaire pour mon dossier bancaire.',
          attachedFile: null,
          notifyBeneficiary: false,
          status: 'approved'
        },
        {
          userId: demoUser._id,
          beneficiaire: 'Demo User',
          category: 'Congés',
          subCategory: 'Congés exceptionnels',
          title: 'Question sur congés maternité',
          description: 'Pouvez-vous m\'expliquer la procédure pour les congés maternité ?',
          attachedFile: null,
          notifyBeneficiary: true,
          status: 'draft'
        }
      ];
      await HRQuestion.insertMany(sampleQuestions);
      console.log('✅ Sample HR questions created');
    }
    
    // 4. Create sample notifications with all fields
    const notificationCount = await Notification.countDocuments({ userId: demoUser._id });
    if (notificationCount === 0) {
      const sampleNotifications = [
        {
          userId: demoUser._id,
          title: 'Congés approuvés',
          message: 'Vos congés du 15-16 mars ont été approuvés',
          type: 'leave',
          isRead: false
        },
        {
          userId: demoUser._id,
          title: 'Nouvelle question RH',
          message: 'Votre question sur l\'attestation de salaire a été traitée',
          type: 'hr',
          isRead: true
        },
        {
          userId: demoUser._id,
          title: 'Rappel système',
          message: 'N\'oubliez pas de compléter votre profil',
          type: 'system',
          isRead: false
        }
      ];
      await Notification.insertMany(sampleNotifications);
      console.log('✅ Sample notifications created');
    }
    
    // 5. Create sample calendar events with all fields
    const eventCount = await CalendarEvent.countDocuments({ userId: demoUser._id });
    if (eventCount === 0) {
      const sampleEvents = [
        {
          userId: demoUser._id,
          title: 'Congés RTT',
          description: 'Repos de récupération',
          startDate: new Date('2024-03-15'),
          endDate: new Date('2024-03-16'),
          type: 'leave',
          isAllDay: true,
          relatedId: null
        },
        {
          userId: demoUser._id,
          title: 'Réunion équipe',
          description: 'Point mensuel avec l\'équipe',
          startDate: new Date('2024-03-20'),
          endDate: new Date('2024-03-20'),
          type: 'meeting',
          isAllDay: false,
          relatedId: null
        },
        {
          userId: demoUser._id,
          title: 'Formation',
          description: 'Formation sur les nouveaux outils',
          startDate: new Date('2024-04-05'),
          endDate: new Date('2024-04-05'),
          type: 'personal',
          isAllDay: true,
          relatedId: null
        }
      ];
      await CalendarEvent.insertMany(sampleEvents);
      console.log('✅ Sample calendar events created');
    }
    
    // 6. Create sample documents with all fields
    const docCount = await Document.countDocuments({ userId: demoUser._id });
    if (docCount === 0) {
      const sampleDocuments = [
        {
          userId: demoUser._id,
          title: 'Attestation de salaire',
          type: 'salary',
          filePath: '/generated/attestation_salaire_2024.pdf',
          generatedDate: new Date(),
          validUntil: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
          status: 'active'
        },
        {
          userId: demoUser._id,
          title: 'Certificat de travail',
          type: 'employment',
          filePath: '/generated/certificat_travail_2024.pdf',
          generatedDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
          validUntil: new Date(Date.now() + 300 * 24 * 60 * 60 * 1000),
          status: 'active'
        },
        {
          userId: demoUser._id,
          title: 'Attestation fiscale 2023',
          type: 'tax',
          filePath: '/generated/attestation_fiscale_2023.pdf',
          generatedDate: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000),
          validUntil: new Date(Date.now() + 200 * 24 * 60 * 60 * 1000),
          status: 'expired'
        }
      ];
      await Document.insertMany(sampleDocuments);
      console.log('✅ Sample documents created');
    }
    
    console.log('🎉 All sample data populated successfully!');
    
    // Get collection counts for response
    const collectionCounts = {
      users: await User.countDocuments(),
      taskGroups: await TaskGroup.countDocuments(),
      leaveRequests: await LeaveRequest.countDocuments(),
      hrQuestions: await HRQuestion.countDocuments(),
      notifications: await Notification.countDocuments(),
      calendarEvents: await CalendarEvent.countDocuments(),
      colleagues: await Colleague.countDocuments(),
      documents: await Document.countDocuments()
    };
    
    res.json({
      message: 'Sample data populated successfully! All fields should now be visible in MongoDB Compass.',
      collectionCounts,
      demoUser: {
        identifiant: 'demo.user',
        password: 'demo123'
      }
    });
    
  } catch (error) {
    console.error('❌ Error populating sample data:', error);
    res.status(500).json({ message: 'Error populating sample data', error: error.message });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/api/health`);
  console.log(`🔧 Setup database: http://localhost:${PORT}/api/setup/complete`);
});