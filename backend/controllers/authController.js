const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const User = require('../models/User');

// Générer un token JWT
const generateToken = (userId) => {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || '30d'
  });
};

// Générer un token de rafraîchissement
const generateRefreshToken = (userId) => {
  const refreshToken = jwt.sign({ id: userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_REFRESH_EXPIRE || '7d'
  });

  // Hasher le token de rafraîchissement pour le stockage
  const hashedToken = crypto.createHash('sha256').update(refreshToken).digest('hex');

  return { refreshToken, hashedToken };
};

// @desc    Enregistrer un nouvel utilisateur
// @route   POST /api/auth/register
// @access  Public
const register = async (req, res) => {
  try {
    const {
      firstName,
      lastName,
      email,
      password,
      department,
      position,
      manager,
      team,
      role = 'employee'
    } = req.body;

    // Validation de base
    if (!firstName || !lastName || !email || !password || !department || !position) {
      return res.status(400).json({
        success: false,
        message: 'Tous les champs requis doivent être remplis',
        code: 'MISSING_REQUIRED_FIELDS'
      });
    }

    // Vérifier si l'utilisateur existe déjà
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: 'Un utilisateur avec cet email existe déjà',
        code: 'USER_EXISTS'
      });
    }

    // Créer l'utilisateur
    const userData = {
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      email: email.toLowerCase().trim(),
      password,
      department: department.trim(),
      position: position.trim(),
      role
    };

    // Ajouter le manager et l'équipe si fournis
    if (manager) {
      userData.manager = manager;
    }

    if (team) {
      userData.team = team;
    }

    const user = await User.create(userData);

    // Générer le token
    const token = generateToken(user._id);

    // Générer et stocker le token de rafraîchissement
    const { refreshToken, hashedToken } = generateRefreshToken(user._id);
    user.addRefreshToken(hashedToken);
    await user.save();

    // Réponse avec l'utilisateur (sans le mot de passe) et le token
    res.status(201).json({
      success: true,
      message: 'Utilisateur créé avec succès',
      data: {
        user: {
          _id: user._id,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          role: user.role,
          department: user.department,
          position: user.position,
          isActive: user.isActive,
          profilePicture: user.profilePicture,
          leaveBalance: user.leaveBalance,
          preferences: user.preferences
        },
        token,
        refreshToken
      }
    });

  } catch (error) {
    console.error('Erreur lors de l\'inscription:', error);

    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        message: 'Erreur de validation',
        errors,
        code: 'VALIDATION_ERROR'
      });
    }

    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: 'Cet email est déjà utilisé',
        code: 'DUPLICATE_EMAIL'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Erreur lors de la création de l\'utilisateur',
      code: 'REGISTRATION_ERROR'
    });
  }
};

// @desc    Connecter un utilisateur
// @route   POST /api/auth/login
// @access  Public
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validation de base
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email et mot de passe sont requis',
        code: 'MISSING_CREDENTIALS'
      });
    }

    // Trouver l'utilisateur avec son mot de passe (inclus seulement pour la vérification)
    const user = await User.findOne({ email: email.toLowerCase() }).select('+password');
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Email ou mot de passe incorrect',
        code: 'INVALID_CREDENTIALS'
      });
    }

    // Vérifier si l'utilisateur est actif
    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Votre compte a été désactivé',
        code: 'ACCOUNT_INACTIVE'
      });
    }

    // Vérifier le mot de passe
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Email ou mot de passe incorrect',
        code: 'INVALID_CREDENTIALS'
      });
    }

    // Mettre à jour la dernière connexion
    user.lastLogin = new Date();
    await user.save();

    // Générer les tokens
    const token = generateToken(user._id);
    const { refreshToken, hashedToken } = generateRefreshToken(user._id);

    // Ajouter et sauvegarder le token de rafraîchissement
    user.addRefreshToken(hashedToken);
    await user.save();

    // Enregistrer l'activité de connexion
    user.logActivity('login', 'Connexion de l\'utilisateur', req.ip, req.get('User-Agent'));
    await user.save();

    res.json({
      success: true,
      message: 'Connexion réussie',
      data: {
        user: {
          _id: user._id,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          role: user.role,
          department: user.department,
          position: user.position,
          isActive: user.isActive,
          profilePicture: user.profilePicture,
          leaveBalance: user.leaveBalance,
          preferences: user.preferences
        },
        token,
        refreshToken
      }
    });

  } catch (error) {
    console.error('Erreur lors de la connexion:', error);

    res.status(500).json({
      success: false,
      message: 'Erreur lors de la connexion',
      code: 'LOGIN_ERROR'
    });
  }
};

// @desc    Rafraîchir le token d'accès
// @route   POST /api/auth/refresh
// @access  Public
const refreshToken = async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({
        success: false,
        message: 'Token de rafraîchissement requis',
        code: 'REFRESH_TOKEN_MISSING'
      });
    }

    // Hasher le token reçu pour la comparaison
    const hashedToken = crypto.createHash('sha256').update(refreshToken).digest('hex');

    // Vérifier le token
    const decoded = jwt.verify(refreshToken, process.env.JWT_SECRET);

    // Trouver l'utilisateur avec le token de rafraîchissement
    const user = await User.findOne({
      _id: decoded.id,
      'refreshTokens.token': hashedToken,
      'refreshTokens.expiresAt': { $gt: new Date() }
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Token de rafraîchissement invalide ou expiré',
        code: 'INVALID_REFRESH_TOKEN'
      });
    }

    // Générer un nouveau token d'accès
    const newAccessToken = generateToken(user._id);

    // Générer un nouveau token de rafraîchissement
    const { refreshToken: newRefreshToken, hashedToken: newHashedToken } = generateRefreshToken(user._id);

    // Nettoyer les tokens expirés
    user.cleanExpiredTokens();

    // Remplacer l'ancien token
    user.refreshTokens = user.refreshTokens.filter(t => t.token !== hashedToken);
    user.addRefreshToken(newHashedToken);

    await user.save();

    res.json({
      success: true,
      message: 'Token rafraîchi avec succès',
      data: {
        token: newAccessToken,
        refreshToken: newRefreshToken
      }
    });

  } catch (error) {
    console.error('Erreur lors du rafraîchissement du token:', error);

    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Token de rafraîchissement invalide',
        code: 'INVALID_REFRESH_TOKEN'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Erreur lors du rafraîchissement du token',
      code: 'REFRESH_TOKEN_ERROR'
    });
  }
};

// @desc    Se déconnecter
// @route   POST /api/auth/logout
// @access  Private
const logout = async (req, res) => {
  try {
    const userId = req.user._id;

    // Supprimer tous les tokens de rafraîchissement de l'utilisateur
    await User.updateOne(
      { _id: userId },
      { $set: { refreshTokens: [] } }
    );

    // Enregistrer l'activité
    const user = await User.findById(userId);
    if (user) {
      user.logActivity('logout', 'Déconnexion de l\'utilisateur', req.ip, req.get('User-Agent'));
      await user.save();
    }

    res.json({
      success: true,
      message: 'Déconnexion réussie'
    });

  } catch (error) {
    console.error('Erreur lors de la déconnexion:', error);

    res.status(500).json({
      success: false,
      message: 'Erreur lors de la déconnexion',
      code: 'LOGOUT_ERROR'
    });
  }
};

// @desc    Obtenir le profil de l'utilisateur actuel
// @route   GET /api/auth/profile
// @access  Private
const getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .select('-password -refreshTokens')
      .populate('manager', 'firstName lastName email position')
      .populate('team', 'name department color');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Utilisateur non trouvé',
        code: 'USER_NOT_FOUND'
      });
    }

    res.json({
      success: true,
      data: {
        user: {
          ...user.toObject(),
          leaveSummary: {
            availableLeave: user.leaveBalance.availableLeaves,
            usedLeave: user.leaveBalance.usedLeaves,
            totalLeave: user.leaveBalance.totalLeaves,
            upcomingLeave: await getUpcomingLeaveCount(user._id)
          }
        }
      }
    });

  } catch (error) {
    console.error('Erreur lors de la récupération du profil:', error);

    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération du profil',
      code: 'PROFILE_ERROR'
    });
  }
};

// @desc    Mettre à jour le profil de l'utilisateur
// @route   PUT /api/auth/profile
// @access  Private
const updateProfile = async (req, res) => {
  try {
    const allowedFields = [
      'firstName', 'lastName', 'phone', 'profilePicture', 'preferences',
      'beneficiaryInfo' // Pour les RH qui peuvent mettre à jour les informations des bénéficiaires
    ];

    const updates = {};

    // Filtrer seulement les champs autorisés
    allowedFields.forEach(field => {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    });

    // Validation spécifique pour les préférences
    if (updates.preferences) {
      const allowedPreferences = ['language', 'theme', 'notifications'];
      const filteredPreferences = {};

      allowedPreferences.forEach(pref => {
        if (updates.preferences[pref] !== undefined) {
          filteredPreferences[pref] = updates.preferences[pref];
        }
      });

      updates.preferences = { ...req.user.preferences.toObject(), ...filteredPreferences };
    }

    const updatedUser = await User.findByIdAndUpdate(
      req.user._id,
      updates,
      {
        new: true,
        runValidators: true,
        select: '-password -refreshTokens'
      }
    );

    if (!updatedUser) {
      return res.status(404).json({
        success: false,
        message: 'Utilisateur non trouvé',
        code: 'USER_NOT_FOUND'
      });
    }

    // Enregistrer l'activité
    updatedUser.logActivity('profile_update', 'Profil mis à jour', req.ip, req.get('User-Agent'));
    await updatedUser.save();

    res.json({
      success: true,
      message: 'Profil mis à jour avec succès',
      data: {
        user: updatedUser
      }
    });

  } catch (error) {
    console.error('Erreur lors de la mise à jour du profil:', error);

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
      message: 'Erreur lors de la mise à jour du profil',
      code: 'PROFILE_UPDATE_ERROR'
    });
  }
};

// @desc    Changer le mot de passe
// @route   PUT /api/auth/change-password
// @access  Private
const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Mot de passe actuel et nouveau mot de passe sont requis',
        code: 'MISSING_PASSWORDS'
      });
    }

    // Vérifier la longueur du nouveau mot de passe
    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Le nouveau mot de passe doit contenir au moins 6 caractères',
        code: 'PASSWORD_TOO_SHORT'
      });
    }

    // Vérifier le mot de passe actuel
    const user = await User.findById(req.user._id).select('+password');
    const isCurrentPasswordValid = await user.comparePassword(currentPassword);

    if (!isCurrentPasswordValid) {
      return res.status(400).json({
        success: false,
        message: 'Mot de passe actuel incorrect',
        code: 'INVALID_CURRENT_PASSWORD'
      });
    }

    // Mettre à jour le mot de passe
    user.password = newPassword;
    await user.save();

    // Enregistrer l'activité
    user.logActivity('password_change', 'Mot de passe changé', req.ip, req.get('User-Agent'));
    await user.save();

    res.json({
      success: true,
      message: 'Mot de passe changé avec succès'
    });

  } catch (error) {
    console.error('Erreur lors du changement de mot de passe:', error);

    res.status(500).json({
      success: false,
      message: 'Erreur lors du changement de mot de passe',
      code: 'PASSWORD_CHANGE_ERROR'
    });
  }
};

// Fonction utilitaire pour compter les congés à venir
async function getUpcomingLeaveCount(userId) {
  const LeaveRequest = require('../models/LeaveRequest');
  const upcomingLeaves = await LeaveRequest.find({
    employee: userId,
    status: 'approved',
    'dates.date': { $gte: new Date() }
  });

  return upcomingLeaves.length;
}

module.exports = {
  register,
  login,
  refreshToken,
  logout,
  getProfile,
  updateProfile,
  changePassword
};
