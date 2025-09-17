const LeaveRequest = require('../models/LeaveRequest');
const User = require('../models/User');
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

// @desc    Obtenir toutes les demandes de congé
// @route   GET /api/leaves
// @access  Private
const getLeaves = async (req, res) => {
  try {
    const {
      status,
      leaveType,
      employee,
      startDate,
      endDate,
      page = 1,
      limit = 10,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    const userId = req.user._id;
    const userRole = req.user.role;

    // Construire le filtre de base selon le rôle
    let filter = {};

    if (userRole === 'employee') {
      // Les employés ne voient que leurs propres demandes
      filter.employee = userId;
    } else if (userRole === 'manager') {
      // Les managers voient leur équipe
      const userTeams = await require('../models/Team').find({
        $or: [
          { manager: userId },
          { 'members.user': userId, 'members.isActive': true, 'members.role': 'co-lead' }
        ]
      }).select('members.user manager');

      const managedUsers = new Set();

      userTeams.forEach(team => {
        managedUsers.add(team.manager.toString());
        team.members.forEach(member => {
          if (member.isActive) managedUsers.add(member.user.toString());
        });
      });

      // Si pas de membres gérés, montrer seulement ses propres demandes
      if (managedUsers.size > 0) {
        filter.employee = { $in: Array.from(managedUsers) };
      } else {
        filter.employee = userId;
      }
    } else if (userRole === 'hr') {
      // Les RH voient toutes les demandes (pas de filtre)
    } else if (userRole === 'admin') {
      // Les admins voient toutes les demandes (pas de filtre)
    }

    // Filtres optionnels
    if (status) {
      filter.status = Array.isArray(status) ? { $in: status } : status;
    }

    if (leaveType) {
      filter.leaveType = Array.isArray(leaveType) ? { $in: leaveType } : leaveType;
    }

    if (employee && (userRole === 'hr' || userRole === 'admin')) {
      filter.employee = employee;
    }

    // Construction des filtres de date
    if (startDate || endDate) {
      filter['dates.date'] = {};
      if (startDate) {
        filter['dates.date'].$gte = new Date(startDate);
      }
      if (endDate) {
        filter['dates.date'].$lte = new Date(endDate);
      }
    }

    // Construction du tri
    const sortOption = {};
    sortOption[sortBy] = sortOrder === 'desc' ? -1 : 1;

    // Pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Exécuter la requête
    const leavesPromise = LeaveRequest.find(filter)
      .populate('employee', 'firstName lastName email position')
      .populate('approver', 'firstName lastName email position')
      .populate('approvedBy', 'firstName lastName')
      .populate('rejectedBy', 'firstName lastName')
      .sort(sortOption)
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    const countPromise = LeaveRequest.countDocuments(filter);

    const [leaves, totalCount] = await Promise.all([leavesPromise, countPromise]);

    // Calcul du nombre de pages
    const totalPages = Math.ceil(totalCount / parseInt(limit));

    // Statistiques supplémentaires
    const stats = await LeaveRequest.aggregate([
      { $match: filter },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalDays: { $sum: '$totalDays' }
        }
      }
    ]);

    res.json({
      success: true,
      data: {
        leaves,
        pagination: {
          currentPage: parseInt(page),
          totalPages,
          totalCount,
          hasNextPage: parseInt(page) < totalPages,
          hasPreviousPage: parseInt(page) > 1
        },
        stats,
        filters: {
          status,
          leaveType,
          employee,
          startDate,
          endDate
        }
      }
    });

  } catch (error) {
    console.error('Erreur lors de la récupération des congés:', error);

    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des demandes de congé',
      code: 'GET_LEAVES_ERROR'
    });
  }
};

// @desc    Créer une nouvelle demande de congé
// @route   POST /api/leaves
// @access  Private
const createLeave = async (req, res) => {
  try {
    const {
      leaveType,
      subCategory,
      dates,
      justification,
      priority = 'normal',
      responseDeadline,
      isSharedLeave = false
    } = req.body;

    const employeeId = req.user._id;

    // Validation de base
    if (!leaveType || !dates || !Array.isArray(dates) || dates.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Type de congé et dates sont requis',
        code: 'MISSING_REQUIRED_FIELDS'
      });
    }

    // Validation des dates
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const validatedDates = dates.map(dateObj => {
      const date = new Date(dateObj.date);
      date.setHours(0, 0, 0, 0);

      // Vérifier que la date n'est pas dans le passé
      if (date < today && leaveType !== 'GTA') { // GTA peut être rétrospectif
        throw new Error(`Date invalide: ${dateObj.date} est dans le passé`);
      }

      return {
        date,
        isHalfDay: dateObj.isHalfDay || false,
        halfDayType: dateObj.halfDayType || null
      };
    });

    // Déterminer l'approbateur
    let approverId;
    const employee = await User.findById(employeeId).populate('manager team');

    if (req.user.role === 'admin' || req.user.role === 'hr') {
      // Pour les admins et RH, l'approbateur peut être spécifié ou automatique
      approverId = req.body.approver || employee.manager?._id;
    } else {
      // Pour les employés réguliers, utiliser le manager ou manager d'équipe
      if (employee.manager) {
        approverId = employee.manager._id;
      } else if (employee.team) {
        const team = await require('../models/Team').findById(employee.team);
        if (team && team.manager) {
          approverId = team.manager;
        }
      }

      // Si aucun approbateur n'est trouvé, trouver un manager ou RH
      if (!approverId) {
        const defaultApprover = await User.findOne({
          role: { $in: ['hr', 'manager', 'admin'] },
          isActive: true
        });
        approverId = defaultApprover?._id;
      }
    }

    if (!approverId) {
      return res.status(400).json({
        success: false,
        message: 'Aucun approbateur disponible pour valider cette demande',
        code: 'NO_APPROVER_FOUND'
      });
    }

    // Calculer le nombre total de jours
    const totalDays = validatedDates.reduce((total, dateObj) => {
      return total + (dateObj.isHalfDay ? 0.5 : 1);
    }, 0);

    // Vérifier le solde disponible (sauf pour les congés exceptionnels non payés)
    const isExceptionLeave = !['RTT', 'CPP'].includes(leaveType);
    if (!isExceptionLeave) {
      const userLeaveBalance = employee.leaveBalance || {};

      if (leaveType === 'RTT' && userLeaveBalance.RTTBalance < totalDays) {
        return res.status(400).json({
          success: false,
          message: `Solde RTT insuffisant (${userLeaveBalance.RTTBalance} jour(s) disponible(s))`,
          code: 'INSUFFICIENT_RTT_BALANCE'
        });
      }

      if (leaveType === 'CPP' && userLeaveBalance.CPPBalance < totalDays) {
        return res.status(400).json({
          success: false,
          message: `Solde CPP insuffisant (${userLeaveBalance.CPPBalance} jour(s) disponible(s))`,
          code: 'INSUFFICIENT_CPP_BALANCE'
        });
      }
    }

    // Créer la demande de congé
    const leaveRequestData = {
      employee: employeeId,
      approver: approverId,
      leaveType,
      subCategory: subCategory || null,
      dates: validatedDates,
      totalDays,
      justification,
      priority,
      responseDeadline: responseDeadline ? new Date(responseDeadline) : null,
      isSharedLeave,
      leaveBalanceSnapshot: {
        totalLeaves: employee.leaveBalance?.totalLeaves || 0,
        usedLeaves: employee.leaveBalance?.usedLeaves || 0,
        availableLeaves: employee.leaveBalance?.availableLeaves || 0,
        RTTBalance: employee.leaveBalance?.RTTBalance || 0,
        CPPBalance: employee.leaveBalance?.CPPBalance || 0
      }
    };

    const leave = await LeaveRequest.create(leaveRequestData);

    // Peupler les champs de référence
    await leave.populate([
      { path: 'employee', select: 'firstName lastName email position' },
      { path: 'approver', select: 'firstName lastName email position' }
    ]);

    res.status(201).json({
      success: true,
      message: 'Demande de congé créée avec succès',
      data: {
        leave
      }
    });

  } catch (error) {
    console.error('Erreur lors de la création du congé:', error);

    if (error.message.includes('Date invalide')) {
      return res.status(400).json({
        success: false,
        message: error.message,
        code: 'INVALID_DATE'
      });
    }

    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        message: 'Erreur de validation',
        errors,
        code: 'VALIDATION_ERROR'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Erreur lors de la création de la demande de congé',
      code: 'CREATE_LEAVE_ERROR'
    });
  }
};

// @desc    Obtenir une demande de congé spécifique
// @route   GET /api/leaves/:id
// @access  Private
const getLeave = async (req, res) => {
  try {
    const leave = await LeaveRequest.findById(req.params.id)
      .populate('employee', 'firstName lastName email position department')
      .populate('approver', 'firstName lastName email position department')
      .populate('approvedBy', 'firstName lastName email position')
      .populate('rejectedBy', 'firstName lastName email position')
      .populate('comments.author', 'firstName lastName email position')
      .populate('attachments.uploadedBy', 'firstName lastName email');

    if (!leave) {
      return res.status(404).json({
        success: false,
        message: 'Demande de congé non trouvée',
        code: 'LEAVE_NOT_FOUND'
      });
    }

    res.json({
      success: true,
      data: {
        leave
      }
    });

  } catch (error) {
    console.error('Erreur lors de la récupération du congé:', error);

    if (error.name === 'CastError') {
      return res.status(400).json({
        success: false,
        message: 'ID de congé invalide',
        code: 'INVALID_LEAVE_ID'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération de la demande de congé',
      code: 'GET_LEAVE_ERROR'
    });
  }
};

// @desc    Mettre à jour une demande de congé
// @route   PUT /api/leaves/:id
// @access  Private
const updateLeave = async (req, res) => {
  try {
    const {
      leaveType,
      subCategory,
      dates,
      justification,
      priority
    } = req.body;

    const leave = req.leaveRequest;
    const userId = req.user._id;

    // Vérifier les permissions
    const canUpdate = (
      leave.employee.toString() === userId || // Propriétaire
      req.user.role === 'hr' || // HR
      req.user.role === 'admin' // Admin
    );

    if (!canUpdate) {
      return res.status(403).json({
        success: false,
        message: 'Vous n\'avez pas l\'autorisation de modifier cette demande',
        code: 'UPDATE_LEAVE_PERMISSION_DENIED'
      });
    }

    // Ne pas permettre la modification d'une demande approuvée ou rejetée (sauf admin)
    if (leave.status !== 'pending' && req.user.role !== 'admin') {
      return res.status(400).json({
        success: false,
        message: 'Une demande approuvée ou rejetée ne peut pas être modifiée',
        code: 'LEAVE_ALREADY_PROCESSED'
      });
    }

    // Créer un historique de modification
    const oldValues = {
      leaveType: leave.leaveType,
      subCategory: leave.subCategory,
      dates: leave.dates,
      justification: leave.justification,
      priority: leave.priority
    };

    // Mettre à jour les champs
    if (leaveType !== undefined) leave.leaveType = leaveType;
    if (subCategory !== undefined) leave.subCategory = subCategory;
    if (dates !== undefined) leave.dates = dates;
    if (justification !== undefined) leave.justification = justification;
    if (priority !== undefined) leave.priority = priority;

    // Recalculer le nombre total de jours si les dates ont changé
    if (dates !== undefined) {
      leave.totalDays = dates.reduce((total, dateObj) => {
        return total + (dateObj.isHalfDay ? 0.5 : 1);
      }, 0);
    }

    // Ajouter à l'historique des modifications
    leave.changeHistory.push({
      changedBy: userId,
      changeType: 'update',
      changes: {
        from: oldValues,
        to: {
          leaveType,
          subCategory,
          dates: dates ? 'modified' : undefined,
          justification,
          priority
        }
      },
      reason: 'Modification de la demande par l\'utilisateur'
    });

    await leave.save();

    // Peupler les données pour la réponse
    await leave.populate([
      { path: 'employee', select: 'firstName lastName email position' },
      { path: 'approver', select: 'firstName lastName email position' }
    ]);

    res.json({
      success: true,
      message: 'Demande de congé mise à jour avec succès',
      data: {
        leave
      }
    });

  } catch (error) {
    console.error('Erreur lors de la mise à jour du congé:', error);

    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        message: 'Erreur de validation',
        errors,
        code: 'VALIDATION_ERROR'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Erreur lors de la mise à jour de la demande de congé',
      code: 'UPDATE_LEAVE_ERROR'
    });
  }
};

// @desc    Approuver une demande de congé
// @route   POST /api/leaves/:id/approve
// @access  Private
const approveLeave = async (req, res) => {
  try {
    const { comments } = req.body;
    const leave = req.leaveRequest;
    const approverId = req.user._id;

    // Vérifier si l'utilisateur peut approuver
    if (leave.approver.toString() !== approverId && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Vous n\'êtes pas autorisé à approuver cette demande',
        code: 'APPROVE_PERMISSION_DENIED'
      });
    }

    if (leave.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: 'Cette demande n\'est plus en attente',
        code: 'LEAVE_NOT_PENDING'
      });
    }

    // Approuver la demande
    leave.approve(approverId, comments);

    // Mettre à jour le solde de l'employé
    const employee = await User.findById(leave.employee);
    if (employee) {
      employee.updateLeaveBalance(leave.totalDays);
      await employee.save();
    }

    await leave.save();

    // Peupler les données pour la réponse
    await leave.populate([
      { path: 'employee', select: 'firstName lastName email position' },
      { path: 'approver', select: 'firstName lastName email position' }
    ]);

    res.json({
      success: true,
      message: 'Demande de congé approuvée avec succès',
      data: {
        leave
      }
    });

  } catch (error) {
    console.error('Erreur lors de l\'approbation du congé:', error);

    res.status(500).json({
      success: false,
      message: 'Erreur lors de l\'approbation de la demande',
      code: 'APPROVE_LEAVE_ERROR'
    });
  }
};

// @desc    Rejeter une demande de congé
// @route   POST /api/leaves/:id/reject
// @access  Private
const rejectLeave = async (req, res) => {
  try {
    const { reason, comments } = req.body;
    const leave = req.leaveRequest;
    const rejectorId = req.user._id;

    // Vérifier si l'utilisateur peut rejeter
    if (leave.approver.toString() !== rejectorId && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Vous n\'êtes pas autorisé à rejeter cette demande',
        code: 'REJECT_PERMISSION_DENIED'
      });
    }

    if (!reason || reason.trim().length < 10) {
      return res.status(400).json({
        success: false,
        message: 'Une raison détaillée est requise (10 caractères minimum)',
        code: 'REASON_TOO_SHORT'
      });
    }

    if (leave.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: 'Cette demande n\'est plus en attente',
        code: 'LEAVE_NOT_PENDING'
      });
    }

    // Rejeter la demande
    leave.reject(rejectorId, reason, comments);

    await leave.save();

    // Peupler les données pour la réponse
    await leave.populate([
      { path: 'employee', select: 'firstName lastName email position' },
      { path: 'approver', select: 'firstName lastName email position' }
    ]);

    res.json({
      success: true,
      message: 'Demande de congé rejetée',
      data: {
        leave
      }
    });

  } catch (error) {
    console.error('Erreur lors du rejet du congé:', error);

    res.status(500).json({
      success: false,
      message: 'Erreur lors du rejet de la demande',
      code: 'REJECT_LEAVE_ERROR'
    });
  }
};

// @desc    Annuler une demande de congé
// @route   POST /api/leaves/:id/cancel
// @access  Private
const cancelLeave = async (req, res) => {
  try {
    const leave = req.leaveRequest;
    const cancellorId = req.user._id;
    const { reason } = req.body;

    // Vérifier les permissions
    const canCancel = (
      leave.employee.toString() === cancellorId || // Propriétaire
      req.user.role === 'hr' || // HR
      req.user.role === 'admin' // Admin
    );

    if (!canCancel) {
      return res.status(403).json({
        success: false,
        message: 'Vous n\'avez pas l\'autorisation d\'annuler cette demande',
        code: 'CANCEL_PERMISSION_DENIED'
      });
    }

    if (leave.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: 'Seules les demandes en attente peuvent être annulées',
        code: 'LEAVE_NOT_PENDING'
      });
    }

    // Annuler la demande
    leave.cancel(cancellorId, reason);

    await leave.save();

    // Peupler les données pour la réponse
    await leave.populate([
      { path: 'employee', select: 'firstName lastName email position' }
    ]);

    res.json({
      success: true,
      message: 'Demande de congé annulée',
      data: {
        leave
      }
    });

  } catch (error) {
    console.error('Erreur lors de l\'annulation du congé:', error);

    res.status(500).json({
      success: false,
      message: 'Erreur lors de l\'annulation de la demande',
      code: 'CANCEL_LEAVE_ERROR'
    });
  }
};

// @desc    Supprimer une demande de congé brouillon
// @route   DELETE /api/leaves/:id
// @access  Private
const deleteLeave = async (req, res) => {
  try {
    const leave = req.leaveRequest;
    const userId = req.user._id;

    // Vérifier les permissions
    const canDelete = (
      leave.employee.toString() === userId || // Propriétaire
      req.user.role === 'admin' // Admin
    );

    if (!canDelete) {
      return res.status(403).json({
        success: false,
        message: 'Vous n\'avez pas l\'autorisation de supprimer cette demande',
        code: 'DELETE_PERMISSION_DENIED'
      });
    }

    // Ne permettre la suppression que pour les brouillons
    if (leave.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: 'Seules les demandes brouillon peuvent être supprimées',
        code: 'LEAVE_NOT_DRAFT'
      });
    }

    // Supprimer les fichiers joints
    if (leave.attachments && leave.attachments.length > 0) {
      for (const attachment of leave.attachments) {
        const filePath = path.join(__dirname, '..', 'uploads', attachment.filename);
        try {
          fs.unlinkSync(filePath);
        } catch (err) {
          console.warn(`Erreur lors de la suppression du fichier ${attachment.filename}:`, err);
        }
      }
    }

    await LeaveRequest.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: 'Demande de congé supprimée avec succès'
    });

  } catch (error) {
    console.error('Erreur lors de la suppression du congé:', error);

    res.status(500).json({
      success: false,
      message: 'Erreur lors de la suppression de la demande de congé',
      code: 'DELETE_LEAVE_ERROR'
    });
  }
};

// @desc    Ajouter un commentaire à une demande de congé
// @route   POST /api/leaves/:id/comments
// @access  Private
const addComment = async (req, res) => {
  try {
    const { content, isPrivate = false } = req.body;
    const leave = req.leaveRequest;
    const authorId = req.user._id;

    if (!content || content.trim().length < 3) {
      return res.status(400).json({
        success: false,
        message: 'Le commentaire doit contenir au moins 3 caractères',
        code: 'COMMENT_TOO_SHORT'
      });
    }

    // Ajouter le commentaire
    leave.addComment(authorId, content.trim(), isPrivate);

    await leave.save();

    // Peupler l'auteur pour la réponse
    await leave.populate('comments.author', 'firstName lastName email position');

    res.status(201).json({
      success: true,
      message: 'Commentaire ajouté avec succès',
      data: {
        comment: leave.comments[leave.comments.length - 1]
      }
    });

  } catch (error) {
    console.error('Erreur lors de l\'ajout du commentaire:', error);

    res.status(500).json({
      success: false,
      message: 'Erreur lors de l\'ajout du commentaire',
      code: 'ADD_COMMENT_ERROR'
    });
  }
};

// @desc    Téléverser un fichier joint
// @route   POST /api/leaves/:id/attachments
// @access  Private
const uploadAttachment = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Aucun fichier n\'a été fourni',
        code: 'NO_FILE_UPLOADED'
      });
    }

    const leave = req.leaveRequest;
    const uploaderId = req.user._id;

    // Créer l'entrée d'attachment
    const attachment = {
      originalName: req.file.originalname,
      filename: req.file.filename,
      mimeType: req.file.mimetype,
      size: req.file.size,
      uploadedBy: uploaderId,
      uploadedAt: new Date()
    };

    // Ajouter au congé
    leave.addAttachment(attachment);

    await leave.save();

    res.status(201).json({
      success: true,
      message: 'Fichier téléversé avec succès',
      data: {
        attachment
      }
    });

  } catch (error) {
    console.error('Erreur lors du téléversement du fichier:', error);

    res.status(500).json({
      success: false,
      message: 'Erreur lors du téléversement du fichier',
      code: 'UPLOAD_ATTACHMENT_ERROR'
    });
  }
};

// @desc    Obtenir les demandes de congé d'un employé
// @route   GET /api/leaves/:employeeId/history
// @access  Private
const getLeaveHistory = async (req, res) => {
  try {
    const { employeeId } = req.params;
    const { year } = req.query;

    // Vérifier les permissions
    const canViewHistory = (
      employeeId === req.user._id.toString() || // Ses propres congés
      req.user.role === 'hr' || // HR
      req.user.role === 'admin' // Admin
    );

    if (!canViewHistory) {
      // Vérifier si l'utilisateur est manager de cette personne
      const employee = await User.findById(employeeId);
      if (employee?.manager?.toString() === req.user._id.toString()) {
        // OK, c'est son manager
      } else {
        return res.status(403).json({
          success: false,
          message: 'Accès non autorisé à l\'historique de cette personne',
          code: 'HISTORY_ACCESS_DENIED'
        });
      }
    }

    // Construire le filtre
    let dateFilter = {};
    if (year) {
      const startDate = new Date(`${year}-01-01`);
      const endDate = new Date(`${parseInt(year) + 1}-01-01`);
      dateFilter = { 'dates.date': { $gte: startDate, $lt: endDate } };
    }

    const leaves = await LeaveRequest.find({
      employee: employeeId,
      ...dateFilter
    })
      .populate('approver', 'firstName lastName')
      .populate('approvedBy', 'firstName lastName')
      .populate('rejectedBy', 'firstName lastName')
      .sort({ 'dates.date': -1 })
      .lean();

    // Statistiques de l'année
    const stats = await LeaveRequest.aggregate([
      {
        $match: {
          employee: mongoose.Types.ObjectId(employeeId),
          ...dateFilter
        }
      },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalDays: { $sum: '$totalDays' }
        }
      }
    ]);

    res.json({
      success: true,
      data: {
        leaves,
        stats
      }
    });

  } catch (error) {
    console.error('Erreur lors de la récupération de l\'historique:', error);

    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération de l\'historique des congés',
      code: 'GET_LEAVE_HISTORY_ERROR'
    });
  }
};

module.exports = {
  getLeaves,
  createLeave,
  getLeave,
  updateLeave,
  approveLeave,
  rejectLeave,
  cancelLeave,
  deleteLeave,
  addComment,
  uploadAttachment,
  getLeaveHistory
};
