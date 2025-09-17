const express = require('express');
const router = express.Router();

// Import controllers
const {
  register,
  login,
  refreshToken,
  logout,
  getProfile,
  updateProfile,
  changePassword
} = require('../controllers/authController');

// Import middleware
const {
  protect,
  rateLimitByUser,
  logActivity,
  validateObjectId
} = require('../middleware/auth');

// Routes publiques
router.post('/register', rateLimitByUser(5, '1h'), register);
router.post('/login', rateLimitByUser(10, '15m'), login);
router.post('/refresh', refreshToken);

// Routes protégées
router.use(protect); // Toutes les routes suivantes sont protégées

router.post('/logout',
  logActivity('logout', 'Déconnexion utilisateur'),
  logout
);

router.get('/profile',
  logActivity('profile_access', 'Accès au profil utilisateur'),
  getProfile
);

router.put('/profile',
  logActivity('profile_update', 'Mise à jour du profil utilisateur'),
  updateProfile
);

router.put('/change-password',
  logActivity('password_change', 'Changement de mot de passe'),
  changePassword
);

module.exports = router;
