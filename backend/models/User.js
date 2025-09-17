const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  firstName: {
    type: String,
    required: [true, 'Le prénom est requis'],
    trim: true,
    maxlength: [50, 'Le prénom ne peut pas dépasser 50 caractères']
  },
  lastName: {
    type: String,
    required: [true, 'Le nom de famille est requis'],
    trim: true,
    maxlength: [50, 'Le nom de famille ne peut pas dépasser 50 caractères']
  },
  email: {
    type: String,
    required: [true, 'L\'email est requis'],
    unique: true,
    lowercase: true,
    match: [
      /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
      'Veuillez entrer un email valide'
    ]
  },
  password: {
    type: String,
    required: [true, 'Le mot de passe est requis'],
    minlength: [6, 'Le mot de passe doit contenir au moins 6 caractères'],
    select: false // Par défaut, ne pas inclure le mot de passe dans les requêtes
  },
  role: {
    type: String,
    enum: ['employee', 'manager', 'hr', 'admin'],
    default: 'employee'
  },
  department: {
    type: String,
    required: [true, 'Le département est requis'],
    trim: true
  },
  position: {
    type: String,
    required: [true, 'Le poste est requis'],
    trim: true
  },
  manager: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  team: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Team'
  },
  employeeId: {
    type: String,
    unique: true,
    sparse: true
  },
  hireDate: {
    type: Date,
    default: Date.now
  },
  phone: {
    type: String,
    trim: true
  },
  profilePicture: {
    type: String // URL de l'image de profil
  },

  // Statut d'activité
  isActive: {
    type: Boolean,
    default: true
  },
  lastLogin: {
    type: Date
  },

  // Informations de congés
  leaveBalance: {
    totalLeaves: { type: Number, default: 30 },
    usedLeaves: { type: Number, default: 0 },
    availableLeaves: { type: Number, default: 30 },
    RTTBalance: { type: Number, default: 10 },
    CPPBalance: { type: Number, default: 5 }
  },

  // Préférences utilisateur
  preferences: {
    language: { type: String, default: 'fr' },
    theme: { type: String, default: 'light' },
    notifications: {
      leaveRequests: { type: Boolean, default: true },
      leaveApprovals: { type: Boolean, default: true },
      hrQuestions: { type: Boolean, default: true },
      calendarReminders: { type: Boolean, default: true }
    }
  },

  // Tokens de rafraîchissement
  refreshTokens: [{
    token: String,
    expiresAt: Date,
    createdAt: { type: Date, default: Date.now }
  }],

  // Historique des activités
  activityLogs: [{
    action: String,
    details: mongoose.Schema.Types.Mixed,
    ipAddress: String,
    userAgent: String,
    timestamp: { type: Date, default: Date.now }
  }]

}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Index pour améliorer les performances
userSchema.index({ email: 1 });
userSchema.index({ department: 1 });
userSchema.index({ role: 1 });
userSchema.index({ manager: 1 });
userSchema.index({ team: 1 });

// Virtual pour le nom complet
userSchema.virtual('fullName').get(function() {
  return `${this.firstName} ${this.lastName}`;
});

// Virtual pour les congés disponibles
userSchema.virtual('availableLeave').get(function() {
  return this.leaveBalance.availableLeaves;
});

// Pré-save middleware pour hasher le mot de passe
userSchema.pre('save', async function(next) {
  // Ne hasher que si le mot de passe a été modifié
  if (!this.isModified('password')) return next();

  try {
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Méthode pour vérifier le mot de passe
userSchema.methods.comparePassword = async function(candidatePassword) {
  try {
    return await bcrypt.compare(candidatePassword, this.password);
  } catch (error) {
    throw error;
  }
};

// Méthode pour mettre à jour le solde de congés
userSchema.methods.updateLeaveBalance = function(usedDays) {
  this.leaveBalance.usedLeaves += usedDays;
  this.leaveBalance.availableLeaves = this.leaveBalance.totalLeaves - this.leaveBalance.usedLeaves;
};

// Méthode pour ajouter un token de rafraîchissement
userSchema.methods.addRefreshToken = function(token, expiresIn = '7d') {
  const expiresAt = new Date(Date.now() + this.getSecondsFromString(expiresIn) * 1000);
  this.refreshTokens.push({ token, expiresAt });
};

// Méthode pour supprimer un token de rafraîchissement
userSchema.methods.removeRefreshToken = function(token) {
  this.refreshTokens = this.refreshTokens.filter(t => t.token !== token);
};

// Méthode pour nettoyer les tokens expirés
userSchema.methods.cleanExpiredTokens = function() {
  const now = new Date();
  this.refreshTokens = this.refreshTokens.filter(t => t.expiresAt > now);
};

// Méthode utilitaire pour convertir la durée en secondes
userSchema.methods.getSecondsFromString = function(timeString) {
  const unit = timeString.slice(-1);
  const value = parseInt(timeString.slice(0, -1));

  switch (unit) {
    case 'd': return value * 24 * 60 * 60;
    case 'h': return value * 60 * 60;
    case 'm': return value * 60;
    default: return value;
  }
};

// Méthode pour logger une activité
userSchema.methods.logActivity = function(action, details, ipAddress = null, userAgent = null) {
  this.activityLogs.unshift({
    action,
    details,
    ipAddress,
    userAgent,
    timestamp: new Date()
  });

  // Garder seulement les 100 dernières activités
  if (this.activityLogs.length > 100) {
    this.activityLogs = this.activityLogs.slice(0, 100);
  }
};

// Static method pour trouver un utilisateur par email
userSchema.statics.findByEmail = function(email) {
  return this.findOne({ email });
};

// Static method pour trouver tous les utilisateurs d'un manager
userSchema.statics.findByManager = function(managerId) {
  return this.find({ manager: managerId });
};

module.exports = mongoose.model('User', userSchema);
