const HRQuestion = require('../models/HRQuestion');
const User = require('../models/User');
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

// @desc    Obtenir toutes les questions RH
// @route   GET /api/hr-questions
// @access  Private
const getHRQuestions = async (req, res) => {
  try {
    const {
      status,
      category,
      subCategory,
      assignedTo,
      user,
      priority,
      page = 1,
      limit = 10,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      search
    } = req.query;

    const userId = req.user._id;
    const userRole = req.user.role;

    // Construire le filtre de base selon le rôle
    let filter = {};

    if (userRole === 'employee') {
      // Les employés ne voient que leurs propres questions
      filter.$or = [
        { user: userId }, // Leurs propres questions
        { beneficiary: userId, 'contactPreferences.notifyBeneficiary': true } // Questions où ils sont bénéficiaires
      ];
    } else if (userRole === 'hr') {
      // Les RH voient toutes les questions non assignées ou assignées à d'autres RH
      filter.$or = [
        { assignedTo: { $exists: false } },
        { assignedTo: userId }
      ];
    } else if (userRole === 'admin') {
      // Les admins voient toutes les questions
    }

    // Filtres optionnels
    if (status) {
      filter.status = Array.isArray(status) ? { $in: status } : status;
    }

    if (category) {
      filter.category = Array.isArray(category) ? { $in: category } : category;
    }

    if (subCategory) {
      filter.subCategory = Array.isArray(subCategory) ? { $in: subCategory } : subCategory;
    }

    if (priority) {
      filter.priority = Array.isArray(priority) ? { $in: priority } : priority;
    }

    if (user && (userRole === 'hr' || userRole === 'admin')) {
      filter.user = user;
    }

    if (assignedTo && (userRole === 'hr' || userRole === 'admin')) {
      filter.assignedTo = assignedTo;
    }

    // Recherche textuelle
    if (search) {
      filter.$or = filter.$or || [];
      filter.$or.push(
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { category: { $regex: search, $options: 'i' } },
        { subCategory: { $regex: search, $options: 'i' } }
      );
    }

    // Verification des échéances
    if (status === 'overdue') {
      const now = new Date();
      filter.responseDeadline = { $lt: now };
      filter.status = { $ne: 'closed' };
    }

    // Construction du tri
    const sortOption = {};
    sortOption[sortBy] = sortOrder === 'desc' ? -1 : 1;

    // Pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Exécuter la requête
    const questionsPromise = HRQuestion.find(filter)
      .populate('user', 'firstName lastName email position department')
      .populate('beneficiary', 'firstName lastName email')
      .populate('assignedTo', 'firstName lastName email position')
      .populate('conversations.author', 'firstName lastName email position')
      .populate('attachments.uploadedBy', 'firstName lastName')
      .sort(sortOption)
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    const countPromise = HRQuestion.countDocuments(filter);

    const [questions, totalCount] = await Promise.all([questionsPromise, countPromise]);

    // Calcul du nombre de pages
    const totalPages = Math.ceil(totalCount / parseInt(limit));

    // Statistiques supplémentaires
    const stats = await HRQuestion.aggregate([
      { $match: filter },
      {
        $group: {
          _id: {
            status: '$status',
            priority: '$priority'
          },
          count: { $sum: 1 },
          overDue: {
            $sum: {
              $cond: [
                { $and: [
                  { $lt: ['$responseDeadline', new Date()] },
                  { $ne: ['$status', 'closed'] }
                ]},
                1,
                0
              ]
            }
          }
        }
      }
    ]);

    // Calcul du temps de réponse moyen
    const avgResponseTime = await HRQuestion.aggregate([
      {
        $match: {
          ...filter,
          answeredAt: { $exists: true }
        }
      },
      {
        $project: {
          responseTime: {
            $divide: [
              { $subtract: ['$answeredAt', '$submittedAt'] },
              1000 * 60 // minutes
            ]
          }
        }
      },
      {
        $group: {
          _id: null,
          avgResponseTime: { $avg: '$responseTime' }
        }
      }
    ]);

    res.json({
      success: true,
      data: {
        questions,
        pagination: {
          currentPage: parseInt(page),
          totalPages,
          totalCount,
          hasNextPage: parseInt(page) < totalPages,
          hasPreviousPage: parseInt(page) > 1
        },
        stats,
        metrics: {
          averageResponseTime: avgResponseTime[0]?.avgResponseTime || null,
          filters: {
            status, category, subCategory, assignedTo, user, priority, search
          }
        }
      }
    });

  } catch (error) {
    console.error('Erreur lors de la récupération des questions RH:', error);

    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des questions RH',
      code: 'GET_HR_QUESTIONS_ERROR'
    });
  }
};

// @desc    Créer une nouvelle question RH
// @route   POST /api/hr-questions
// @access  Private
const createHRQuestion = async (req, res) => {
  try {
    const {
      category,
      subCategory,
      title,
      description,
      beneficiary,
      beneficiaryInfo,
      priority = 'normal',
      contactPreferences,
      tags = []
    } = req.body;

    const userId = req.user._id;

    // Validation de base
    if (!category || !subCategory || !title || !description) {
      return res.status(400).json({
        success: false,
        message: 'Catégorie, sous-catégorie, titre et description sont requis',
        code: 'MISSING_REQUIRED_FIELDS'
      });
    }

    // Vérifier que le bénéficiaire existe (si spécifié)
    let beneficiaryDoc = null;
    if (beneficiary) {
      beneficiaryDoc = await User.findById(beneficiary);
      if (!beneficiaryDoc) {
        return res.status(404).json({
          success: false,
          message: 'Bénéficiaire non trouvé',
          code: 'BENEFICIARY_NOT_FOUND'
        });
      }
    }

    // Créer la question RH
    const questionData = {
      user: userId,
      category,
      subCategory,
      title: title.trim(),
      description: description.trim(),
      priority,
      tags: Array.isArray(tags) ? tags.map(tag => tag.trim()) : [],
      metadata: {
        source: 'web', // ou detecté automatiquement
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      }
    };

    // Ajouter le bénéficiaire si spécifié
    if (beneficiary) {
      questionData.beneficiary = beneficiary;
    }

    // Ajouter les informations du bénéficiaire si fourni
    if (beneficiaryInfo) {
      questionData.beneficiaryInfo = {
        name: beneficiaryInfo.name?.trim(),
        email: beneficiaryInfo.email?.trim(),
        phone: beneficiaryInfo.phone?.trim()
      };
    }

    // Ajouter les préférences de contact
    if (contactPreferences) {
      questionData.contactPreferences = {
        notifyBeneficiary: contactPreferences.notifyBeneficiary || false,
        emailNotifications: contactPreferences.emailNotifications !== false
      };
    }

    // Déterminer l'utilisateur assigné automatiquement
    const assignedUser = await User.findOne({
      role: 'hr',
      isActive: true
    }).sort({ createdAt: -1 });

    if (assignedUser) {
      questionData.assignedTo = assignedUser._id;
    }

    const question = await HRQuestion.create(questionData);

    // Peupler les données pour la réponse
    await question.populate([
      { path: 'user', select: 'firstName lastName email position' },
      { path: 'beneficiary', select: 'firstName lastName email' },
      { path: 'assignedTo', select: 'firstName lastName email position' }
    ]);

    res.status(201).json({
      success: true,
      message: 'Question RH créée et soumise avec succès',
      data: {
        question
      }
    });

  } catch (error) {
    console.error('Erreur lors de la création de la question RH:', error);

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
      message: 'Erreur lors de la création de la question RH',
      code: 'CREATE_HR_QUESTION_ERROR'
    });
  }
};

// @desc    Obtenir une question RH spécifique
// @route   GET /api/hr-questions/:id
// @access  Private
const getHRQuestion = async (req, res) => {
  try {
    const question = await HRQuestion.findById(req.params.id)
      .populate('user', 'firstName lastName email position department')
      .populate('beneficiary', 'firstName lastName email position')
      .populate('assignedTo', 'firstName lastName email position')
      .populate('beneficiaryInfo')
      .populate('conversations.author', 'firstName lastName email position')
      .populate('attachments.uploadedBy', 'firstName lastName')
      .populate('statusHistory.changedBy', 'firstName lastName')
      .populate('closureInfo.closedBy', 'firstName lastName');

    if (!question) {
      return res.status(404).json({
        success: false,
        message: 'Question RH non trouvée',
        code: 'HR_QUESTION_NOT_FOUND'
      });
    }

    res.json({
      success: true,
      data: {
        question
      }
    });

  } catch (error) {
    console.error('Erreur lors de la récupération de la question RH:', error);

    if (error.name === 'CastError') {
      return res.status(400).json({
        success: false,
        message: 'ID de question invalide',
        code: 'INVALID_HR_QUESTION_ID'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération de la question RH',
      code: 'GET_HR_QUESTION_ERROR'
    });
  }
};

// @desc    Mettre à jour une question RH
// @route   PUT /api/hr-questions/:id
// @access  Private
const updateHRQuestion = async (req, res) => {
  try {
    const updates = req.body;
    const question = req.hrQuestion;
    const userId = req.user._id;

    // Vérifier les permissions
    const canUpdate = (
      question.user.toString() === userId || // Propietaire
      req.user.role === 'hr' || // HR
      req.user.role === 'admin' // Admin
    );

    if (!canUpdate) {
      return res.status(403).json({
        success: false,
        message: 'Vous n\'êtes pas autorisé à modifier cette question',
        code: 'UPDATE_HR_PERMISSION_DENIED'
      });
    }

    // Champs autorisés selon le rôle
    let allowedFields = ['title', 'description', 'tags'];

    if (req.user.role === 'hr' || req.user.role === 'admin') {
      allowedFields = allowedFields.concat([
        'category', 'subCategory', 'priority', 'assignedTo', 'responseDeadline'
      ]);
    }

    // Filtrer les champs autorisés
    const filteredUpdates = {};
    allowedFields.forEach(field => {
      if (updates[field] !== undefined) {
        filteredUpdates[field] = updates[field];
      }
    });

    // Validation de la priorité si mise à jour
    if (filteredUpdates.priority && !['low', 'normal', 'high', 'urgent'].includes(filteredUpdates.priority)) {
      return res.status(400).json({
        success: false,
        message: 'Priorité invalide',
        code: 'INVALID_PRIORITY'
      });
    }

    // Validation des tags
    if (filteredUpdates.tags) {
      filteredUpdates.tags = Array.isArray(filteredUpdates.tags)
        ? filteredUpdates.tags.map(tag => tag.trim()).filter(tag => tag.length > 0)
        : [];
    }

    // Mettre à jour la question
    Object.assign(question, filteredUpdates);

    // Ajouter à l'historique des modifications
    if (Object.keys(filteredUpdates).length > 0) {
      question.statusHistory.push({
        fromStatus: question.status,
        toStatus: question.status, // Le statut n'a pas changé
        changedBy: userId,
        reason: 'Modification des détails de la question'
      });
    }

    await question.save();

    // Peupler les données pour la réponse
    await question.populate([
      { path: 'user', select: 'firstName lastName email position' },
      { path: 'beneficiary', select: 'firstName lastName email' },
      { path: 'assignedTo', select: 'firstName lastName email position' }
    ]);

    res.json({
      success: true,
      message: 'Question RH mise à jour avec succès',
      data: {
        question
      }
    });

  } catch (error) {
    console.error('Erreur lors de la mise à jour de la question RH:', error);

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
      message: 'Erreur lors de la mise à jour de la question RH',
      code: 'UPDATE_HR_QUESTION_ERROR'
    });
  }
};

// @desc    Changer le statut d'une question RH
// @route   PUT /api/hr-questions/:id/status
// @access  Private
const updateHRQuestionStatus = async (req, res) => {
  try {
    const { status, reason } = req.body;
    const question = req.hrQuestion;
    const userId = req.user._id;

    // Vérifier les permissions
    const canChangeStatus = (
      req.user.role === 'hr' || // HR
      req.user.role === 'admin' // Admin
    );

    if (!canChangeStatus) {
      return res.status(403).json({
        success: false,
        message: 'Vous n\'êtes pas autorisé à changer le statut de cette question',
        code: 'STATUS_CHANGE_PERMISSION_DENIED'
      });
    }

    // Statuts autorisés
    const allowedStatuses = ['draft', 'submitted', 'in-review', 'answered', 'closed', 'cancelled'];
    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Statut invalide',
        code: 'INVALID_STATUS'
      });
    }

    // Transition d'état invalide
    const invalidTransitions = {
      'closed': ['draft', 'submitted', 'in-review'], // Une question fermée ne peut pas revenir à ces statuts
      'cancelled': ['draft', 'submitted', 'in-review', 'answered'] // Une question annulée ne peut pas être réouverte
    };

    if (invalidTransitions[question.status] && invalidTransitions[question.status].includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Transition de statut invalide: ${question.status} → ${status}`,
        code: 'INVALID_STATUS_TRANSITION'
      });
    }

    const oldStatus = question.status;

    // Mettre à jour le statut
    question.changeStatus(status, userId, reason);

    await question.save();

    // Peupler les données pour la réponse
    await question.populate([
      { path: 'user', select: 'firstName lastName email position' },
      { path: 'assignedTo', select: 'firstName lastName email position' }
    ]);

    res.json({
      success: true,
      message: `Statut de la question changé: ${oldStatus} → ${status}`,
      data: {
        question
      }
    });

  } catch (error) {
    console.error('Erreur lors du changement de statut:', error);

    res.status(500).json({
      success: false,
      message: 'Erreur lors du changement de statut',
      code: 'UPDATE_STATUS_ERROR'
    });
  }
};

// @desc    Ajouter un message à la conversation
// @route   POST /api/hr-questions/:id/conversation
// @access  Private
const addConversationMessage = async (req, res) => {
  try {
    const { message, isInternal = false } = req.body;
    const question = req.hrQuestion;
    const authorId = req.user._id;

    if (!message || message.trim().length < 3) {
      return res.status(400).json({
        success: false,
        message: 'Le message doit contenir au moins 3 caractères',
        code: 'MESSAGE_TOO_SHORT'
      });
    }

    // Vérifier les permissions pour les messages internes
    if (isInternal && req.user.role !== 'hr' && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Vous n\'êtes pas autorisé à envoyer des messages internes',
        code: 'INTERNAL_MESSAGE_PERMISSION_DENIED'
      });
    }

    // Ajouter le message
    question.addMessage(authorId, message.trim(), isInternal);

    // Si c'est un message RH et la question était 'submitted', passer à 'in-review'
    if ((req.user.role === 'hr' || req.user.role === 'admin') && question.status === 'submitted') {
      question.changeStatus('in-review', authorId, 'Prise en charge par le service RH');
    }

    // Si c'est un message de l'utilisateur, recalculer les deadlines
    if (question.user.toString() === authorId.toString()) {
      const newDeadline = new Date();
      newDeadline.setDate(newDeadline.getDate() + 7);
      question.responseDeadline = newDeadline;
    }

    await question.save();

    // Peupler l'auteur pour la réponse
    await question.populate('conversations.author', 'firstName lastName email position');

    const newMessage = question.conversations[question.conversations.length - 1];

    res.status(201).json({
      success: true,
      message: 'Message ajouté à la conversation',
      data: {
        message: newMessage
      }
    });

  } catch (error) {
    console.error('Erreur lors de l\'ajout du message:', error);

    res.status(500).json({
      success: false,
      message: 'Erreur lors de l\'ajout du message à la conversation',
      code: 'ADD_CONVERSATION_MESSAGE_ERROR'
    });
  }
};

// @desc    Téléverser un fichier joint à une question RH
// @route   POST /api/hr-questions/:id/attachments
// @access  Private
const uploadHRAttachment = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Aucun fichier n\'a été fourni',
        code: 'NO_FILE_UPLOADED'
      });
    }

    const question = req.hrQuestion;
    const uploaderId = req.user._id;

    // Vérifier les permissions
    if (question.user.toString() !== uploaderId && req.user.role !== 'hr' && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Vous n\'êtes pas autorisé à ajouter des fichiers à cette question',
        code: 'UPLOAD_PERMISSION_DENIED'
      });
    }

    // Créer l'entrée d'attachment
    const attachment = {
      originalName: req.file.originalname,
      filename: req.file.filename,
      mimeType: req.file.mimetype,
      size: req.file.size,
      uploadedBy: uploaderId,
      uploadedAt: new Date()
    };

    // Ajouter à la question
    question.attachments.push(attachment);

    await question.save();

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

// @desc    Supprimer une question RH
// @route   DELETE /api/hr-questions/:id
// @access  Private
const deleteHRQuestion = async (req, res) => {
  try {
    const question = req.hrQuestion;
    const userId = req.user._id;

    // Vérifier les permissions
    const canDelete = (
      question.user.toString() === userId || // Propriétaire
      req.user.role === 'admin' // Admin
    );

    if (!canDelete) {
      return res.status(403).json({
        success: false,
        message: 'Vous n\'avez pas l\'autorisation de supprimer cette question',
        code: 'DELETE_PERMISSION_DENIED'
      });
    }

    // Ne permettre la suppression que pour les brouillons
    if (question.status !== 'draft') {
      return res.status(400).json({
        success: false,
        message: 'Seules les questions brouillon peuvent être supprimées',
        code: 'QUESTION_NOT_DRAFT'
      });
    }

    // Supprimer les fichiers joints
    if (question.attachments && question.attachments.length > 0) {
      for (const attachment of question.attachments) {
        const filePath = path.join(__dirname, '..', 'uploads', attachment.filename);
        try {
          fs.unlinkSync(filePath);
        } catch (err) {
          console.warn(`Erreur lors de la suppression du fichier ${attachment.filename}:`, err);
        }
      }
    }

    await HRQuestion.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: 'Question RH supprimée avec succès'
    });

  } catch (error) {
    console.error('Erreur lors de la suppression de la question RH:', error);

    res.status(500).json({
      success: false,
      message: 'Erreur lors de la suppression de la question RH',
      code: 'DELETE_HR_QUESTION_ERROR'
    });
  }
};

// @desc    Obtenir les statistiques des questions RH
// @route   GET /api/hr-questions/stats
// @access  Private
const getHRQuestionStats = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    const dateFilter = {};
    if (startDate && endDate) {
      dateFilter.submittedAt = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }

    // Statistiques générales
    const generalStats = await HRQuestion.aggregate([
      { $match: dateFilter },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    // Statistiques par catégorie
    const categoryStats = await HRQuestion.aggregate([
      { $match: dateFilter },
      {
        $group: {
          _id: '$category',
          count: { $sum: 1 },
          avgResponseTime: {
            $avg: {
              $divide: [
                { $subtract: ['$answeredAt', '$submittedAt'] },
                1000 * 60 // en minutes
              ]
            }
          }
        }
      }
    ]);

    // Statistiques par priorité
    const priorityStats = await HRQuestion.aggregate([
      { $match: dateFilter },
      {
        $group: {
          _id: '$priority',
          count: { $sum: 1 }
        }
      }
    ]);

    // Statistiques de performance RH
    const hrPerformance = await HRQuestion.aggregate([
      {
        $match: {
          ...dateFilter,
          answeredAt: { $exists: true }
        }
      },
      {
        $project: {
          responseTime: {
            $divide: [
              { $subtract: ['$answeredAt', '$submittedAt'] },
              1000 * 60 * 60 * 24 // en jours
            ]
          },
          satisfactionRating: '$closureInfo.satisfactionRating'
        }
      },
      {
        $group: {
          _id: null,
          avgResponseTime: { $avg: '$responseTime' },
          avgSatisfaction: { $avg: '$satisfactionRating' },
          totalQuestions: { $sum: 1 }
        }
      }
    ]);

    res.json({
      success: true,
      data: {
        general: generalStats,
        categories: categoryStats,
        priorities: priorityStats,
        performance: hrPerformance[0] || null,
        timeRange: { startDate, endDate }
      }
    });

  } catch (error) {
    console.error('Erreur lors de la récupération des statistiques:', error);

    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des statistiques',
      code: 'GET_STATS_ERROR'
    });
  }
};

module.exports = {
  getHRQuestions,
  createHRQuestion,
  getHRQuestion,
  updateHRQuestion,
  updateHRQuestionStatus,
  addConversationMessage,
  uploadHRAttachment,
  deleteHRQuestion,
  getHRQuestionStats
};
