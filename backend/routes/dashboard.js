const express = require('express');
const User = require('../models/User');
const Conge = require('../models/Conge');
const QuestionRH = require('../models/QuestionRH');
const { auth } = require('../middleware/auth');

const router = express.Router();

// Get dashboard statistics
router.get('/stats', auth, async (req, res) => {
  try {
    let stats = {};
    
    if (req.user.role === 'hr') {
      const totalUsers = await User.countDocuments();
      const pendingConges = await Conge.countDocuments({ statut: 'en_attente' });
      const pendingQuestions = await QuestionRH.countDocuments({ statut: 'en_cours_validation' });
      stats = { totalUsers, pendingConges, pendingQuestions };
    } else {
      const userConges = await Conge.countDocuments({ userId: req.user._id });
      const userQuestions = await QuestionRH.countDocuments({ userId: req.user._id });
      stats = { userConges, userQuestions, soldeConges: req.user.soldeConges };
    }
    
    res.json(stats);
  } catch (error) {
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

module.exports = router;