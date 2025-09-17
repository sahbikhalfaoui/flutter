const mongoose = require('mongoose');

const hrQuestionSchema = new mongoose.Schema({
  // Utilisateur qui pose la question
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'L\'utilisateur est requis']
  },

  // Bénéficiaire (peut être différent de l'utilisateur)
  beneficiary: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },

  // Informations sur le bénéficiaire (si non enregistré)
  beneficiaryInfo: {
    name: String,
    email: String,
    phone: String
  },

  // Catégorie et sous-catégorie de la question
  category: {
    type: String,
    required: [true, 'La catégorie est requise'],
    enum: {
      values: [
        'Attestations',
        'Congés',
        'Données administratives',
        'Données contractuelles',
        'Données personnelles',
        'Maladie',
        'Autre'
      ],
      message: 'Catégorie non valide'
    }
  },

  subCategory: {
    type: String,
    required: [true, 'La sous-catégorie est requise'],
    validate: {
      validator: function(value) {
        const subCategories = this.getSubCategories();
        return subCategories[this.category]?.includes(value) || false;
      },
      message: 'Sous-catégorie non valide pour cette catégorie'
    }
  },

  // Titre et description de la question
  title: {
    type: String,
    required: [true, 'Le titre est requis'],
    trim: true,
    maxlength: [200, 'Le titre ne peut pas dépasser 200 caractères']
  },

  description: {
    type: String,
    required: [true, 'La description est requise'],
    trim: true,
    maxlength: [2000, 'La description ne peut pas dépasser 2000 caractères']
  },

  // Statut de la question
  status: {
    type: String,
    enum: ['draft', 'submitted', 'in-review', 'answered', 'closed', 'cancelled'],
    default: 'submitted'
  },

  // Priorité
  priority: {
    type: String,
    enum: ['low', 'normal', 'high', 'urgent'],
    default: 'normal'
  },

  // Informations de contact
  contactPreferences: {
    notifyBeneficiary: {
      type: Boolean,
      default: false
    },
    emailNotifications: {
      type: Boolean,
      default: true
    }
  },

  // Pièces jointes
  attachments: [{
    originalName: {
      type: String,
      required: true
    },
    filename: {
      type: String,
      required: true
    },
    mimeType: {
      type: String,
      required: true
    },
    size: {
      type: Number,
      required: true
    },
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  }],

  // Historique et communications
  conversations: [{
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    message: {
      type: String,
      required: true,
      maxlength: [1000, 'Le message ne peut pas dépasser 1000 caractères'],
      trim: true
    },
    timestamp: {
      type: Date,
      default: Date.now
    },
    isInternal: { // Visible uniquement au HR
      type: Boolean,
      default: false
    },
    attachments: [{
      originalName: String,
      filename: String,
      mimeType: String,
      size: Number
    }]
  }],

  // Assigné à (RH ou manager)
  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },

  // Échéance pour la réponse
  responseDeadline: {
    type: Date,
    default: function() {
      // Échéance par défaut: 7 jours
      const deadline = new Date();
      deadline.setDate(deadline.getDate() + 7);
      return deadline;
    }
  },

  // Dates importantes
  submittedAt: {
    type: Date,
    default: Date.now
  },
  answeredAt: Date,
  closedAt: Date,

  // Information de cloture
  closureInfo: {
    reason: String,
    closedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    satisfactionRating: {
      type: Number,
      min: 1,
      max: 5
    }
  },

  // Balises pour le classement et la recherche
  tags: [String],

  // Temps passé sur la question (en minutes)
  timeSpent: {
    type: Number,
    default: 0,
    min: 0
  },

  // Si c'est une question liée à une demande de congé
  relatedLeaveRequest: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'LeaveRequest'
  },

  // Métadonnées
  metadata: {
    source: { // Comment la question a été créée
      type: String,
      enum: ['web', 'mobile', 'email', 'phone'],
      default: 'web'
    },
    ipAddress: String,
    userAgent: String,
    firstResponseTime: Number, // En minutes
    totalResponseTime: Number  // En minutes
  },

  // Historique des changements de statut
  statusHistory: [{
    fromStatus: String,
    toStatus: String,
    changedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    changedAt: {
      type: Date,
      default: Date.now
    },
    reason: String
  }],

  // Rappels
  reminders: [{
    type: String, // 'submitted', 'overdue', 'escalation'
    sentAt: Date,
    sentTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    reminderNumber: { type: Number, default: 1 }
  }]

}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Index pour améliorer les performances
hrQuestionSchema.index({ user: 1 });
hrQuestionSchema.index({ beneficiary: 1 });
hrQuestionSchema.index({ category: 1 });
hrQuestionSchema.index({ subCategory: 1 });
hrQuestionSchema.index({ status: 1 });
hrQuestionSchema.index({ assignedTo: 1 });
hrQuestionSchema.index({ submittedAt: -1 });
hrQuestionSchema.index({ responseDeadline: 1 });
hrQuestionSchema.index({ '$**': 'text' }); // Recherche textuelle

// Virtual pour la durée de réponse
hrQuestionSchema.virtual('responseTime').get(function() {
  if (!this.answeredAt) return null;
  return Math.round((this.answeredAt - this.submittedAt) / (1000 * 60)); // En minutes
});

// Virtual pour le nombre de jours restant avant échéance
hrQuestionSchema.virtual('daysUntilDeadline').get(function() {
  if (!this.responseDeadline) return null;
  const now = new Date();
  const diffTime = this.responseDeadline - now;
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
});

// Méthode pour obtenir les sous-catégories
hrQuestionSchema.methods.getSubCategories = function() {
  return {
    'Attestations': ['Attestation', 'Autre'],
    'Congés': ['Congés', 'Congés exceptionnels', 'Autre'],
    'Données administratives': ['Demande de badge', 'Déménagement', 'Mode de transport', 'Autre'],
    'Données contractuelles': ['Période d\'essai', 'Temps de travail', 'Autre'],
    'Données personnelles': [
      'Changement d\'adresse', 'Enfants à charge', 'Etat civil',
      'Personnes à contacter', 'Photo', 'Situation familiale', 'Autre'
    ],
    'Maladie': ['Arret de travail', 'Autre'],
    'Autre': ['Autre']
  };
};

// Méthode pour ajouter un message à la conversation
hrQuestionSchema.methods.addMessage = function(authorId, message, isInternal = false, attachments = []) {
  this.conversations.push({
    author: authorId,
    message,
    isInternal,
    timestamp: new Date(),
    attachments
  });
};

// Méthode pour changer le statut
hrQuestionSchema.methods.changeStatus = function(newStatus, changerId, reason = null) {
  const oldStatus = this.status;
  this.status = newStatus;

  // Gestion automatique des dates
  if (newStatus === 'answered' && !this.answeredAt) {
    this.answeredAt = new Date();
  }
  if (newStatus === 'closed' && !this.closedAt) {
    this.closedAt = new Date();
  }

  // Ajouter à l'historique
  this.statusHistory.push({
    fromStatus: oldStatus,
    toStatus: newStatus,
    changedBy: changerId,
    changedAt: new Date(),
    reason
  });
};

// Méthode pour assigner à un utilisateur
hrQuestionSchema.methods.assignTo = function(assignedById, assignedToId) {
  this.assignedTo = assignedToId;
  this.addMessage(assignedById, `Question assignée à un nouveau responsable`, true);
};

// Méthode pour ajouter du temps passé
hrQuestionSchema.methods.addTimeSpent = function(minutes, userId) {
  if (minutes > 0) {
    this.timeSpent += minutes;
    this.addMessage(userId, `${minutes} minutes ont été passées sur cette question`, true);
  }
};

// Méthode pour vérifier si la question est en retard
hrQuestionSchema.methods.isOverdue = function() {
  if (!this.responseDeadline) return false;
  const now = new Date();
  return this.responseDeadline < now && this.status === 'submitted';
};

// Pré-save middleware
hrQuestionSchema.pre('save', function(next) {
  // Validation de la sous-catégorie
  if (this.isModified('category') || this.isModified('subCategory') || this.isNew) {
    const subCategories = this.getSubCategories();
    if (!subCategories[this.category]?.includes(this.subCategory)) {
      return next(new Error('Sous-catégorie invalide'));
    }
  }

  // Zéro remplissage des tableaux vides
  if (!this.attachments) this.attachments = [];
  if (!this.conversations) this.conversations = [];
  if (!this.statusHistory) this.statusHistory = [];
  if (!this.reminders) this.reminders = [];

  next();
});

// Static method pour trouver les questions assignées à un utilisateur
hrQuestionSchema.statics.findAssignedTo = function(userId) {
  return this.find({
    assignedTo: userId,
    status: { $nin: ['closed', 'cancelled'] }
  });
};

// Static method pour trouver les questions en retard
hrQuestionSchema.statics.findOverdue = function() {
  const now = new Date();
  return this.find({
    responseDeadline: { $lt: now },
    status: 'submitted'
  });
};

// Static method pour trouver les questions par catégorie
hrQuestionSchema.statics.findByCategory = function(category) {
  return this.find({ category });
};

// Static method pour rechercher dans les questions
hrQuestionSchema.statics.searchQuestions = function(searchTerm, filters = {}) {
  const searchQuery = {
    $text: { $search: searchTerm },
    ...filters
  };
  return this.find(searchQuery, { score: { $meta: 'textScore' } })
    .sort({ score: { $meta: 'textScore' } });
};

// Static method pour obtenir les statistiques
hrQuestionSchema.statics.getStatistics = function(dateRange = null) {
  let match = {};
  if (dateRange) {
    match.submittedAt = {
      $gte: dateRange.start,
      $lte: dateRange.end
    };
  }

  return this.aggregate([
    { $match: match },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
        avgResponseTime: {
          $avg: {
            $divide: [
              { $subtract: ['$answeredAt', '$submittedAt'] },
              1000 * 60 // Convertir en minutes
            ]
          }
        }
      }
    }
  ]);
};

module.exports = mongoose.model('HRQuestion', hrQuestionSchema);
