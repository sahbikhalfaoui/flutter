const mongoose = require('mongoose');

const teamSchema = new mongoose.Schema({
  // Informations de base
  name: {
    type: String,
    required: [true, 'Le nom de l\'équipe est requis'],
    trim: true,
    maxlength: [100, 'Le nom d\'équipe ne peut pas dépasser 100 caractères']
  },

  description: {
    type: String,
    trim: true,
    maxlength: [500, 'La description ne peut pas dépasser 500 caractères']
  },

  // Manager de l'équipe
  manager: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Un manager est requis']
  },

  // Membres de l'équipe
  members: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    joinedAt: {
      type: Date,
      default: Date.now
    },
    role: {
      type: String,
      enum: ['member', 'co-lead'],
      default: 'member'
    },
    isActive: {
      type: Boolean,
      default: true
    }
  }],

  // Départment
  department: {
    type: String,
    required: [true, 'Le département est requis'],
    trim: true
  },

  // Informations de contact
  contactInfo: {
    email: String,
    phone: String,
    location: String
  },

  // Métadonnées
  color: {
    type: String,
    default: '#8E44AD' // Couleur par défaut du thème
  },

  avatar: String, // URL de l'avatar de l'équipe

  // Statut actif
  isActive: {
    type: Boolean,
    default: true
  },

  // Statistiques
  statistics: {
    totalMembers: {
      type: Number,
      default: 0
    },
    activeMembers: {
      type: Number,
      default: 0
    },
    leaveRequestsThisMonth: {
      type: Number,
      default: 0
    },
    pendingApprovals: {
      type: Number,
      default: 0
    }
  },

  // Permissions et accès
  permissions: {
    canApproveLeaves: {
      type: Boolean,
      default: true
    },
    canViewTeamCalendar: {
      type: Boolean,
      default: true
    },
    canManageMembers: {
      type: Boolean,
      default: false
    },
    maxLeaveApprovalDays: {
      type: Number,
      default: 10
    }
  },

  // Paramètres de congés
  leaveSettings: {
    annualLeaveDays: {
      type: Number,
      default: 30
    },
    sickLeaveDays: {
      type: Number,
      default: 10
    },
    rttDays: {
      type: Number,
      default: 10
    },
    carryOverDays: {
      type: Number,
      default: 5
    }
  },

  // Historique des membres
  memberHistory: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    action: {
      type: String,
      enum: ['added', 'removed', 'promoted', 'demoted']
    },
    timestamp: {
      type: Date,
      default: Date.now
    },
    changedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  }],

  // Projets associés
  projects: [{
    name: String,
    description: String,
    status: {
      type: String,
      enum: ['planning', 'active', 'completed', 'on-hold'],
      default: 'active'
    },
    startDate: Date,
    endDate: Date,
    budget: Number
  }],

  // Objectifs d'équipe
  goals: [{
    title: String,
    description: String,
    targetValue: Number,
    currentValue: Number,
    unit: String,
    deadline: Date,
    status: {
      type: String,
      enum: ['pending', 'in-progress', 'completed', 'overdue'],
      default: 'pending'
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }]

}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Index pour améliorer les performances
teamSchema.index({ name: 1 });
teamSchema.index({ department: 1 });
teamSchema.index({ manager: 1 });
teamSchema.index({ 'members.user': 1 });
teamSchema.index({ isActive: 1 });

// Virtual pour obtenir le nombre de membres actifs
teamSchema.virtual('activeMemberCount').get(function() {
  return this.members.filter(member => member.isActive).length;
});

// Méthode pour ajouter un membre
teamSchema.methods.addMember = function(userId, role = 'member', addedBy = null) {
  // Vérifier si l'utilisateur est déjà membre
  const existingMember = this.members.find(member => member.user.toString() === userId.toString());

  if (existingMember && existingMember.isActive) {
    throw new Error('L\'utilisateur est déjà membre de cette équipe');
  }

  if (existingMember && !existingMember.isActive) {
    // Réactiver le membre
    existingMember.isActive = true;
    existingMember.role = role;
    existingMember.joinedAt = new Date();
  } else {
    // Ajouter un nouveau membre
    this.members.push({
      user: userId,
      role,
      isActive: true
    });
  }

  // Ajouter à l'historique
  this.memberHistory.push({
    user: userId,
    action: 'added',
    changedBy: addedBy,
    timestamp: new Date()
  });

  this.updateStatistics();
};

// Méthode pour supprimer un membre
teamSchema.methods.removeMember = function(userId, removedBy = null) {
  const memberIndex = this.members.findIndex(member => member.user.toString() === userId.toString());

  if (memberIndex === -1) {
    throw new Error('Utilisateur non trouvé dans l\'équipe');
  }

  if (!this.members[memberIndex].isActive) {
    throw new Error('L\'utilisateur est déjà inactif');
  }

  this.members[memberIndex].isActive = false;

  // Ajouter à l'historique
  this.memberHistory.push({
    user: userId,
    action: 'removed',
    changedBy: removedBy,
    timestamp: new Date()
  });

  this.updateStatistics();
};

// Méthode pour promouvoir un membre
teamSchema.methods.promoteMember = function(userId, newRole, promotedBy = null) {
  const member = this.members.find(member => member.user.toString() === userId.toString());

  if (!member) {
    throw new Error('Utilisateur non trouvé dans l\'équipe');
  }

  if (!member.isActive) {
    throw new Error('L\'utilisateur est inactif');
  }

  if (!['member', 'co-lead'].includes(newRole)) {
    throw new Error('Rôle invalide');
  }

  member.role = newRole;

  // Ajouter à l'historique
  this.memberHistory.push({
    user: userId,
    action: newRole === 'co-lead' ? 'promoted' : 'demoted',
    changedBy: promotedBy,
    timestamp: new Date()
  });
};

// Méthode pour mettre à jour les statistiques
teamSchema.methods.updateStatistics = function() {
  this.statistics.totalMembers = this.members.length;
  this.statistics.activeMembers = this.members.filter(member => member.isActive).length;
};

// Méthode pour vérifier si un utilisateur est membre actif
teamSchema.methods.isActiveMember = function(userId) {
  return this.members.some(member =>
    member.user.toString() === userId.toString() && member.isActive
  );
};

// Méthode pour vérifier si un utilisateur peut approuver les congés
teamSchema.methods.canUserApproveLeave = function(userId, requestedDays) {
  // Le manager peut toujours approuver
  if (this.manager.toString() === userId.toString()) {
    return true;
  }

  // Si l'utilisateur n'est pas membre actif, il ne peut pas approuver
  if (!this.isActiveMember(userId)) {
    return false;
  }

  // Si l'équipe ne peut pas approuver les congés
  if (!this.permissions.canApproveLeaves) {
    return false;
  }

  // Vérifier les limites de jours d'approbation
  const member = this.members.find(member => member.user.toString() === userId.toString());
  if (member && member.role === 'co-lead') {
    return requestedDays <= this.permissions.maxLeaveApprovalDays;
  }

  return false;
};

// Méthode pour obtenir la liste des approbateurs disponibles
teamSchema.methods.getAvailableApprovers = function() {
  const approvers = [];

  // Toujours inclure le manager
  if (this.manager) {
    approvers.push(this.manager);
  }

  // Inclure les co-leads actifs
  this.members
    .filter(member => member.isActive && member.role === 'co-lead')
    .forEach(member => {
      approvers.push(member.user);
    });

  return approvers;
};

// Méthode pour ajouter un objectif
teamSchema.methods.addGoal = function(goalData) {
  this.goals.push(goalData);
};

// Méthode pour mettre à jour la progression d'un objectif
teamSchema.methods.updateGoalProgress = function(goalId, newValue) {
  const goal = this.goals.id(goalId);
  if (goal) {
    goal.currentValue = newValue;

    // Mettre à jour le statut automatiquement
    if (goal.currentValue >= goal.targetValue) {
      goal.status = 'completed';
    } else if (goal.deadline < new Date()) {
      goal.status = 'overdue';
    } else {
      goal.status = 'in-progress';
    }
  }
};

// Pré-save middleware pour mettre à jour les statistiques
teamSchema.pre('save', function(next) {
  this.updateStatistics();
  next();
});

// Static method pour trouver toutes les équipes d'un manager
teamSchema.statics.findByManager = function(managerId) {
  return this.find({ manager: managerId, isActive: true });
};

// Static method pour trouver toutes les équipes d'un utilisateur
teamSchema.statics.findByMember = function(userId) {
  return this.find({
    'members.user': userId,
    'members.isActive': true,
    isActive: true
  });
};

// Static method pour trouver les équipes par département
teamSchema.statics.findByDepartment = function(department) {
  return this.find({ department, isActive: true });
};

module.exports = mongoose.model('Team', teamSchema);
