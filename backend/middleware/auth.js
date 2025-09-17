const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Middleware pour vérifier le token JWT
const protect = async (req, res, next) => {
  try {
    let token;

    // Vérifier si le token est présent dans le header Authorization
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    // Vérifier si un token de rafraîchissement est présent
    if (!token && req.cookies.refreshToken) {
      token = req.cookies.refreshToken;
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Accès refusé. Aucun token fourni.',
        code: 'TOKEN_MISSING'
      });
    }

    try {
      // Vérifier le token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // Récupérer l'utilisateur complet
      const user = await User.findById(decoded.id).select('-password');
      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'Token invalide. Utilisateur introuvable.',
          code: 'USER_NOT_FOUND'
        });
      }

      // Vérifier si l'utilisateur est actif
      if (!user.isActive) {
        return res.status(401).json({
          success: false,
          message: 'Votre compte a été désactivé.',
          code: 'ACCOUNT_INACTIVE'
        });
      }

      // Ajouter l'utilisateur à la requête
      req.user = user;
      next();

    } catch (tokenError) {
      return res.status(401).json({
        success: false,
        message: 'Token invalide ou expiré.',
        code: 'TOKEN_INVALID'
      });
    }

  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Erreur lors de la vérification du token.',
      code: 'AUTH_ERROR'
    });
  }
};

// Middleware pour vérifier les rôles
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Rôle ${req.user.role} non autorisé pour cette action`,
        code: 'ROLE_NOT_AUTHORIZED',
        requiredRoles: roles
      });
    }
    next();
  };
};

// Middleware pour vérifier les permissions spécifiques
const checkPermission = (requiredPermissions) => {
  return (req, res, next) => {
    const userPermissions = req.user.permissions || {};

    // Vérifier si toutes les permissions requises sont présentes
    const hasAllPermissions = requiredPermissions.every(permission => {
      return userPermissions[permission] === true;
    });

    if (!hasAllPermissions) {
      return res.status(403).json({
        success: false,
        message: 'Permissions insuffisantes pour cette action',
        code: 'PERMISSIONS_INSUFFICIENT',
        requiredPermissions,
        userPermissions
      });
    }

    next();
  };
};

// Middleware pour vérifier la propriété des ressources
const resourceOwner = (resourceField = 'user') => {
  return (req, res, next) => {
    const resourceId = req.params.id || req.body[resourceField];
    const userId = req.user._id.toString();

    // Les administrateurs peuvent accéder à toutes les ressources
    if (req.user.role === 'admin') {
      return next();
    }

    // Les ressources personnelles ou les ressources dont l'utilisateur est propriétaire
    if (resourceId === userId) {
      return next();
    }

    // Pour les autres cas, vérifier si l'utilisateur a les droits nécessaires
    return res.status(403).json({
      success: false,
      message: 'Accès non autorisé à cette ressource',
      code: 'RESOURCE_ACCESS_DENIED'
    });
  };
};

// Middleware pour vérifier les droits sur les demandes de congés
const canModifyLeaveRequest = async (req, res, next) => {
  try {
    const LeaveRequest = require('../models/LeaveRequest');
    const leaveRequest = await LeaveRequest.findById(req.params.id)
      .populate('employee')
      .populate('approver');

    if (!leaveRequest) {
      return res.status(404).json({
        success: false,
        message: 'Demande de congé non trouvée',
        code: 'LEAVE_REQUEST_NOT_FOUND'
      });
    }

    const userId = req.user._id.toString();

    // L'administrateur peut tout faire
    if (req.user.role === 'admin') {
      req.leaveRequest = leaveRequest;
      return next();
    }

    // L'employé peut voir et modifier sa propre demande
    if (leaveRequest.employee._id.toString() === userId) {
      req.leaveRequest = leaveRequest;
      return next();
    }

    // L'approbateur désigné peut approuver/rejeter
    if (leaveRequest.approver._id.toString() === userId) {
      req.leaveRequest = leaveRequest;
      return next();
    }

    // Les managers peuvent voir les demandes de leurs équipes
    if (req.user.role === 'manager' || req.user.role === 'hr') {
      const userTeams = await require('../models/Team').find({
        $or: [
          { manager: userId },
          { 'members.user': userId, 'members.isActive': true, 'members.role': 'co-lead' }
        ]
      });

      const hasAccess = userTeams.some(team =>
        team.members.some(member => member.user.toString() === leaveRequest.employee._id.toString())
      );

      if (hasAccess) {
        req.leaveRequest = leaveRequest;
        return next();
      }
    }

    return res.status(403).json({
      success: false,
      message: 'Accès non autorisé à cette demande de congé',
      code: 'LEAVE_REQUEST_ACCESS_DENIED'
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Erreur lors de la vérification des droits',
      code: 'CAN_MODIFY_LEAVE_ERROR'
    });
  }
};

// Middleware pour vérifier les droits sur les questions RH
const canViewHRQuestion = async (req, res, next) => {
  try {
    const HRQuestion = require('../models/HRQuestion');
    const question = await HRQuestion.findById(req.params.id)
      .populate('user')
      .populate('assignedTo');

    if (!question) {
      return res.status(404).json({
        success: false,
        message: 'Question RH non trouvée',
        code: 'HR_QUESTION_NOT_FOUND'
      });
    }

    const userId = req.user._id.toString();

    // L'administrateur peut tout faire
    if (req.user.role === 'admin') {
      req.hrQuestion = question;
      return next();
    }

    // L'utilisateur auteur peut voir sa propre question
    if (question.user._id.toString() === userId) {
      req.hrQuestion = question;
      return next();
    }

    // L'utilisateur assigné peut voir la question
    if (question.assignedTo && question.assignedTo._id.toString() === userId) {
      req.hrQuestion = question;
      return next();
    }

    // Le personnel RH peut voir toutes les questions
    if (req.user.role === 'hr') {
      req.hrQuestion = question;
      return next();
    }

    return res.status(403).json({
      success: false,
      message: 'Accès non autorisé à cette question RH',
      code: 'HR_QUESTION_ACCESS_DENIED'
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Erreur lors de la vérification des droits',
      code: 'CAN_VIEW_HR_QUESTION_ERROR'
    });
  }
};

// Middleware de rate limiting personnalisé
const rateLimitByUser = (maxRequests, windowMs) => {
  const requests = new Map();

  return (req, res, next) => {
    const userId = req.user ? req.user._id.toString() : req.ip;
    const now = Date.now();
    const windowStart = now - windowMs;

    // Nettoyer les anciennes requêtes
    for (const [key, timestamps] of requests) {
      requests.set(key, timestamps.filter(timestamp => timestamp > windowStart));
    }

    // Obtenir les timestamps pour cet utilisateur
    let userRequests = requests.get(userId) || [];
    requests.set(userId, userRequests);

    // Vérifier le taux limite
    if (userRequests.length >= maxRequests) {
      return res.status(429).json({
        success: false,
        message: 'Trop de requêtes. Veuillez réessayer plus tard.',
        code: 'RATE_LIMIT_EXCEEDED',
        retryAfter: Math.ceil((userRequests[0] + windowMs - now) / 1000)
      });
    }

    // Ajouter le timestamp actuel
    userRequests.push(now);

    // Garder seulement les dernières requêtes nécessaires
    if (userRequests.length > maxRequests) {
      userRequests = userRequests.slice(-maxRequests);
    }

    requests.set(userId, userRequests);
    next();
  };
};

// Middleware pour logger les activités des utilisateurs
const logActivity = (action, description) => {
  return (req, res, next) => {
    // Enregistrer l'activité après la réponse
    res.on('finish', () => {
      if (req.user) {
        req.user.logActivity(
          action,
          {
            description,
            method: req.method,
            url: req.url,
            userAgent: req.get('User-Agent'),
            ip: req.ip || req.connection.remoteAddress
          },
          req.ip,
          req.get('User-Agent')
        );

        // Sauvegarder silencieusement (ne pas attendre)
        req.user.save({ validateBeforeSave: false }).catch(err => {
          console.error('Erreur lors de la sauvegarde des logs d\'activité:', err);
        });
      }
    });

    next();
  };
};

// Middleware de validation générale pour les IDs MongoDB
const validateObjectId = (req, res, next) => {
  const params = req.params;
  const body = req.body;

  // Fonction pour valider un ID MongoDB
  const isValidId = (id) => {
    return /^[0-9a-fA-F]{24}$/.test(id);
  };

  // Vérifier tous les IDs dans les paramètres
  for (const [key, value] of Object.entries(params)) {
    if (key.includes('Id') || key.includes('ID') || key === 'id') {
      if (!isValidId(value)) {
        return res.status(400).json({
          success: false,
          message: `ID invalide: ${key}`,
          code: 'INVALID_OBJECT_ID',
          field: key
        });
      }
    }
  }

  // Vérifier les IDs dans le body si nécessaire (optionnel)
  if (body && typeof body === 'object') {
    const idFields = Object.keys(body).filter(key =>
      key.includes('Id') || key.includes('ID') || key === 'user' || key === 'employee'
    );

    for (const field of idFields) {
      if (body[field] && !isValidId(body[field])) {
        return res.status(400).json({
          success: false,
          message: `ID invalide dans le champ: ${field}`,
          code: 'INVALID_OBJECT_ID',
          field
        });
      }
    }
  }

  next();
};

// Middleware pour gérer les erreurs d'authentification
const handleAuthError = (req, res, next) => {
  // Si l'utilisateur n'est pas authentifié pour certaines routes critiques
  const criticalRoutes = ['/api/leaves', '/api/users/profile', '/api/hr-questions'];

  const isCriticalRoute = criticalRoutes.some(route =>
    req.path.startsWith(route) && req.method !== 'GET'
  );

  if (isCriticalRoute && !req.user) {
    return res.status(401).json({
      success: false,
      message: 'Authentification requise pour cette action',
      code: 'AUTH_REQUIRED'
    });
  }

  next();
};

module.exports = {
  protect,
  authorize,
  checkPermission,
  resourceOwner,
  canModifyLeaveRequest,
  canViewHRQuestion,
  rateLimitByUser,
  logActivity,
  validateObjectId,
  handleAuthError
};
