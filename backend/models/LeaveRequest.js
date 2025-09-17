const mongoose = require('mongoose');

const leaveRequestSchema = new mongoose.Schema({
  // Utilisateur qui fait la demande
  employee: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'L\'employé est requis']
  },

  // Approbateur (manager)
  approver: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'L\'approbateur est requis']
  },

  // Type de congé
  leaveType: {
    type: String,
    required: [true, 'Le type de congé est requis'],
    enum: {
      values: [
        'RTT', 'CPP',
        // Congé exceptionnel avec sous-catégories
        'Civisme', 'Divers', 'Evolution professionnelle',
        'Famille', 'GTA', 'Handicap', 'Heures',
        'Maladie / Accident', 'Sans solde'
      ],
      message: 'Type de congé non valide'
    }
  },

  // Sous-catégorie pour les congés exceptionnels
  subCategory: {
    type: String,
    required: false, // Seulement requis pour les congés exceptionnels
    validate: {
      validator: function(value) {
        // Vérifier si le sous-type est valide pour les congés exceptionnels
        const exceptionCategory = this.leaveType;
        const subCategories = this.getExceptionSubCategories();

        if (['Civisme', 'Divers', 'Evolution professionnelle', 'Famille',
             'GTA', 'Handicap', 'Heures', 'Maladie / Accident', 'Sans solde'].includes(exceptionCategory)) {
          return subCategories[exceptionCategory]?.includes(value) || false;
        }
        return true; // pas de sous-catégorie pour RTT et CPP
      },
      message: 'Sous-catégorie non valide pour ce type de congé'
    }
  },

  // Dates de congé
  dates: [{
    date: {
      type: Date,
      required: true
    },
    isHalfDay: {
      type: Boolean,
      default: false
    },
    halfDayType: {
      type: String,
      enum: ['morning', 'afternoon'],
      default: null
    }
  }],

  // Statut de la demande
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'cancelled'],
    default: 'pending'
  },

  // Nombre total de jours demandés
  totalDays: {
    type: Number,
    required: true,
    min: [0.5, 'Le nombre minimum de jours est 0.5'],
    validate: {
      validator: function(value) {
        return value >= 0.5 && value <= 365; // Max 1 an
      },
      message: 'Le nombre de jours doit être entre 0.5 et 365'
    }
  },

  // Justification et commentaires
  justification: {
    type: String,
    maxlength: [500, 'La justification ne peut pas dépasser 500 caractères'],
    trim: true
  },

  comments: [{
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    content: {
      type: String,
      required: true,
      maxlength: [300, 'Le commentaire ne peut pas dépasser 300 caractères'],
      trim: true
    },
    timestamp: {
      type: Date,
      default: Date.now
    },
    isPrivate: {
      type: Boolean,
      default: false
    }
  }],

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

  // Dates d'approbation/rejet
  approvedAt: Date,
  rejectedAt: Date,
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  rejectedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },

  // Raison du rejet
  rejectionReason: {
    type: String,
    maxlength: [300, 'La raison du rejet ne peut pas dépasser 300 caractères'],
    trim: true
  },

  // Date d'annulation (si applicable)
  cancelledAt: Date,
  cancelledBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },

  // Délai de réponse demandé (en jours ouvrés)
  responseDeadline: {
    type: Number,
    default: 7,
    min: [1, 'Le délai minimum est de 1 jour'],
    max: [30, 'Le délai maximum est de 30 jours']
  },

  // Priorité (optionnel)
  priority: {
    type: String,
    enum: ['low', 'normal', 'high', 'urgent'],
    default: 'normal'
  },

  // Est-ce un congé dans le cadre d'un congé partagé ?
  isSharedLeave: {
    type: Boolean,
    default: false
  },

  // ID du congé lié (pour les congés partagés)
  relatedLeaveId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'LeaveRequest'
  },

  // Est-ce un congé exceptionnel légal ?
  isLegalExceptionalLeave: {
    type: Boolean,
    default: false
  },

  // Remplace une autre demande (si modification)
  replacesRequest: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'LeaveRequest'
  },

  // Informations supplémentaires
  additionalInfo: {
    reasonCode: String, // Code de la raison (pour intégrations externes)
    costCenter: String, // Centre de coût
    projectCode: String, // Code projet
    isUrgent: { type: Boolean, default: false }
  },

  // Historique des modifications
  changeHistory: [{
    changedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    changeType: String, // 'create', 'update', 'approve', 'reject', 'cancel'
    changes: mongoose.Schema.Types.Mixed,
    timestamp: { type: Date, default: Date.now },
    reason: String
  }],

  // Rappels automatiques
  reminders: [{
    type: String, // 'submit', 'overdue', 'approval'
    sentAt: { type: Date },
    sentTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    reminderNumber: { type: Number, default: 1 }
  }],

  // Solde de congés au moment de la demande
  leaveBalanceSnapshot: {
    totalLeaves: Number,
    usedLeaves: Number,
    availableLeaves: Number,
    RTTBalance: Number,
    CPPBalance: Number
  }

}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Index pour améliorer les performances
leaveRequestSchema.index({ employee: 1, status: 1 });
leaveRequestSchema.index({ approver: 1, status: 1 });
leaveRequestSchema.index({ status: 1 });
leaveRequestSchema.index({ 'dates.date': 1 });
leaveRequestSchema.index({ leaveType: 1 });
leaveRequestSchema.index({ createdAt: -1 });

// Virtual pour le nom complet de l'employé
leaveRequestSchema.virtual('employeeName').get(async function() {
  await this.populate('employee', 'firstName lastName');
  return this.employee ? `${this.employee.firstName} ${this.employee.lastName}` : '';
});

// Virtual pour le nombre de jours travaillés
leaveRequestSchema.virtual('weekDays').get(function() {
  let weekDays = 0;
  this.dates.forEach(dateObj => {
    const dayOfWeek = new Date(dateObj.date).getDay();
    // 0 = dimanche, 6 = samedi
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      weekDays++;
    }
  });
  return weekDays;
});

// Méthode pour obtenir les sous-catégories des congés exceptionnels
leaveRequestSchema.methods.getExceptionSubCategories = function() {
  return {
    'Civisme': [
      'Activité civique(campagne électorale)',
      'Activité civique(mandat électral)',
      'C.H.S.C.T',
      'Citoyen assesseur',
      'Commission administrateur caisses retraite & prévention',
      'Congé des réservistes',
      'Conseil prud homal',
      'Délégué du personnel',
      'Délégué syndical',
      'Formation conseiller prud homal',
      'Juré d’assises',
      'Participation aux opérations de secours',
      'Période militaire de réservistes',
      'Représentant du comité d’entreprise',
      'Représentation d’association',
      'Réserve dans la sécurité civile',
      'Réserve sanitaire'
    ],
    'Divers': [
      'Absence catastrophe naturelle',
      'Absence diverses',
      'Acquisition de la nationalité francaise',
      'Chomage technique',
      'Contrepartie obligatoire repos',
      'Don d\'ovocyte',
      'Remplacement(déplacement d\'heures)',
      'Repos compensateur',
      'Retard',
      'Solidarité internationale'
    ],
    'Evolution professionnelle': [
      'Bilan de compétences',
      'Congé d\'enseignement ou de recherche',
      'Congé de création d\'entreprise',
      'Congé d\'formation économique soc. et syndic',
      'Congé de mobilité',
      'Congé de reclassement',
      'Congé éducation ouvrière',
      'Congés événement familial',
      'Congés naissance',
      'Congé individuel de formation',
      'Congé mutualiste formation'
    ],
    'Famille': [
      'Absence Enfant malade',
      'Absence adoption',
      'Absence paternité',
      'Congé de présence parentale',
      'Congé de solidarité familiale',
      'Congé de soutien familial',
      'Congé de création d\'entreprise',
      'Congé éducation ouvrière',
      'Congé individuel de formation',
      'Congé parental d'éducation',
      'Congés événement familial',
      'Congés naissance'
    ],
    'GTA': [
      'Absence à tort',
      'Activité normale',
      'Astreinte libre',
      'Astreinte non libre',
      'Chômé',
      'Déjeuner',
      'Férié',
      'Férié chômé',
      'Grève',
      'Pont',
      'Présence à tort'
    ],
    'Handicap': [
      'Inaptitude non professionnelle',
      'Inaptitude professionnelle'
    ],
    'Heures': [
      'Heures à créditer',
      'Heures à débiter',
      'Heures à ignorer',
      'Heures à majorer',
      'Heures à payer',
      'Heures à récupérer',
      'Heures d\'intervention à payer',
      'Heures d\'intervention à récupérer',
      'Heures de récupération',
      'Heures supplémentaires et complémentaires',
      'Visite médicale',
      'Visite médicale grossesse'
    ],
    'Maladie / Accident': [
      'Absence accident de trajet',
      'Absence accident de travail',
      'Absence maladie',
      'Absence maladie professionnelle',
      'Absence maternité'
    ],
    'Sans solde': [
      'Congé sabbatique',
      'Congé sans solde'
    ]
  };
};

// Méthode pour ajouter un commentaire
leaveRequestSchema.methods.addComment = function(authorId, content, isPrivate = false) {
  this.comments.push({
    author: authorId,
    content,
    isPrivate,
    timestamp: new Date()
  });
};

// Méthode pour ajouter une pièce jointe
leaveRequestSchema.methods.addAttachment = function(attachment) {
  this.attachments.push(attachment);
};

// Méthode pour approuver la demande
leaveRequestSchema.methods.approve = function(approverId, comments = null) {
  this.status = 'approved';
  this.approvedAt = new Date();
  this.approvedBy = approverId;

  if (comments) {
    this.addComment(approverId, comments);
  }

  this.changeHistory.push({
    changedBy: approverId,
    changeType: 'approve',
    changes: { status: 'approved' },
    timestamp: new Date()
  });
};

// Méthode pour rejeter la demande
leaveRequestSchema.methods.reject = function(rejectorId, reason, comments = null) {
  this.status = 'rejected';
  this.rejectedAt = new Date();
  this.rejectedBy = rejectorId;
  this.rejectionReason = reason;

  if (comments) {
    this.addComment(rejectorId, comments);
  }

  this.changeHistory.push({
    changedBy: rejectorId,
    changeType: 'reject',
    changes: { status: 'rejected', reason },
    timestamp: new Date()
  });
};

// Méthode pour annuler la demande
leaveRequestSchema.methods.cancel = function(cancellerId, reason = null) {
  this.status = 'cancelled';
  this.cancelledAt = new Date();
  this.cancelledBy = cancellerId;

  this.changeHistory.push({
    changedBy: cancellerId,
    changeType: 'cancel',
    changes: { status: 'cancelled' },
    reason,
    timestamp: new Date()
  });
};

// Pré-save middleware pour mettre à jour le type complet
leaveRequestSchema.pre('save', async function(next) {
  // Validation pour les congés exceptionnels
  if (this.isModified('leaveType') && this.leaveType !== 'RTT' && this.leaveType !== 'CPP') {
    const subCategories = this.getExceptionSubCategories();
    if (!this.subCategory || !subCategories[this.leaveType]?.includes(this.subCategory)) {
      return next(new Error(`Sous-catégorie requise pour le type de congé ${this.leaveType}`));
    }
  }

  // Calcul du nombre total de jours
  if (this.isModified('dates') || this.isNew) {
    this.totalDays = this.dates.reduce((total, dateObj) => {
      return total + (dateObj.isHalfDay ? 0.5 : 1);
    }, 0);
  }

  next();
});

// Static method pour trouver les congés actifs d'un employé
leaveRequestSchema.statics.findActiveByEmployee = function(employeeId) {
  return this.find({
    employee: employeeId,
    status: { $in: ['pending', 'approved'] }
  });
};

// Static method pour trouver les demandes d'approbation en attente
leaveRequestSchema.statics.findPendingApprovals = function(approverId) {
  return this.find({
    approver: approverId,
    status: 'pending'
  });
};

// Static method pour trouver les congés entre deux dates
leaveRequestSchema.statics.findLeavesBetweenDates = function(startDate, endDate, employeeId = null) {
  const query = {
    'dates.date': {
      $gte: startDate,
      $lte: endDate
    },
    status: 'approved'
  };

  if (employeeId) {
    query.employee = employeeId;
  }

  return this.find(query);
};

module.exports = mongoose.model('LeaveRequest', leaveRequestSchema);
