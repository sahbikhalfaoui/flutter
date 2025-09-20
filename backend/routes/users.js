const express = require('express');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const { auth, checkRole } = require('../middleware/auth');

const router = express.Router();

// Create user (HR only)
router.post('/', auth, checkRole(['hr']), async (req, res) => {
  try {
    const { identifiant, motDePasse, nom, email, role } = req.body;
    const hashedPassword = await bcrypt.hash(motDePasse, 10);
    const user = new User({
      identifiant,
      motDePasse: hashedPassword,
      nom,
      email,
      role
    });
    await user.save();
    res.status(201).json({ message: 'Utilisateur créé avec succès' });
  } catch (error) {
    if (error.code === 11000) {
      res.status(400).json({ message: 'Cet identifiant existe déjà' });
    } else {
      res.status(500).json({ message: 'Erreur serveur' });
    }
  }
});

// Get all users (HR only)
router.get('/', auth, checkRole(['hr']), async (req, res) => {
  try {
    const users = await User.find({}, '-motDePasse');
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// Update user (HR only)
router.put('/:id', auth, checkRole(['hr']), async (req, res) => {
  try {
    const { nom, email, role, soldeConges } = req.body;
    await User.findByIdAndUpdate(req.params.id, { nom, email, role, soldeConges });
    res.json({ message: 'Utilisateur mis à jour avec succès' });
  } catch (error) {
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// Delete user (HR only)
router.delete('/:id', auth, checkRole(['hr']), async (req, res) => {
  try {
    await User.findByIdAndDelete(req.params.id);
    res.json({ message: 'Utilisateur supprimé avec succès' });
  } catch (error) {
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

module.exports = router;