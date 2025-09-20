const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { auth } = require('../middleware/auth');

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// Login
router.post('/login', async (req, res) => {
  try {
    const { identifiant, motDePasse } = req.body;
    const user = await User.findOne({ identifiant });
    if (!user) {
      return res.status(401).json({ message: 'Identifiants invalides' });
    }
    const isMatch = await bcrypt.compare(motDePasse, user.motDePasse);
    if (!isMatch) {
      return res.status(401).json({ message: 'Identifiants invalides' });
    }
    const token = jwt.sign({ id: user._id }, JWT_SECRET);
    res.json({
      token,
      user: {
        id: user._id,
        identifiant: user.identifiant,
        nom: user.nom,
        email: user.email,
        role: user.role,
        soldeConges: user.soldeConges,
        autresAbsences: user.autresAbsences
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// Get profile
router.get('/profile', auth, async (req, res) => {
  try {
    res.json({
      id: req.user._id,
      identifiant: req.user.identifiant,
      nom: req.user.nom,
      email: req.user.email,
      role: req.user.role,
      soldeConges: req.user.soldeConges,
      autresAbsences: req.user.autresAbsences
    });
  } catch (error) {
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

module.exports = router;