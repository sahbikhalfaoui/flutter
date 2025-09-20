const express = require('express');
const QuestionRH = require('../models/QuestionRH');
const { auth, checkRole } = require('../middleware/auth');
const upload = require('../config/multer');

const router = express.Router();

// Create HR question
router.post('/', auth, upload.single('pieceJointe'), async (req, res) => {
  try {
    const { beneficiaire, categorie, sousCategorie, titre, description, informerBeneficiaire, statut } = req.body;
    const question = new QuestionRH({
      userId: req.user._id,
      beneficiaire,
      categorie,
      sousCategorie,
      titre,
      description,
      informerBeneficiaire: informerBeneficiaire === 'true',
      statut: statut || 'brouillon',
      pieceJointe: req.file ? req.file.path : undefined
    });
    await question.save();
    res.status(201).json({ message: 'Question créée avec succès', question });
  } catch (error) {
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// Get HR questions
router.get('/', auth, async (req, res) => {
  try {
    let query = {};
    if (req.user.role !== 'hr') {
      query.userId = req.user._id;
    }
    
    const questions = await QuestionRH.find(query)
      .populate('userId', 'nom email')
      .populate('reponduPar', 'nom')
      .sort({ createdAt: -1 });
    res.json(questions);
  } catch (error) {
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// Update HR question
router.put('/:id', auth, upload.single('pieceJointe'), async (req, res) => {
  try {
    const question = await QuestionRH.findById(req.params.id);
    if (!question) {
      return res.status(404).json({ message: 'Question non trouvée' });
    }
    if (question.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Accès interdit' });
    }

    const { beneficiaire, categorie, sousCategorie, titre, description, informerBeneficiaire, statut } = req.body;
    const updateData = {
      beneficiaire,
      categorie,
      sousCategorie,
      titre,
      description,
      informerBeneficiaire: informerBeneficiaire === 'true',
      statut: statut || question.statut
    };

    if (req.file) {
      updateData.pieceJointe = req.file.path;
    }

    await QuestionRH.findByIdAndUpdate(req.params.id, updateData);
    res.json({ message: 'Question mise à jour avec succès' });
  } catch (error) {
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// Answer HR question (HR only)
router.put('/:id/repondre', auth, checkRole(['hr']), async (req, res) => {
  try {
    const { reponse } = req.body;
    await QuestionRH.findByIdAndUpdate(req.params.id, {
      reponse,
      statut: 'repondu',
      reponduPar: req.user._id,
      dateReponse: new Date()
    });
    res.json({ message: 'Réponse ajoutée avec succès' });
  } catch (error) {
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// Delete HR question
router.delete('/:id', auth, async (req, res) => {
  try {
    const question = await QuestionRH.findById(req.params.id);
    if (!question) {
      return res.status(404).json({ message: 'Question non trouvée' });
    }
    if (question.userId.toString() !== req.user._id.toString() && req.user.role !== 'hr') {
      return res.status(403).json({ message: 'Accès interdit' });
    }
    await QuestionRH.findByIdAndDelete(req.params.id);
    res.json({ message: 'Question supprimée avec succès' });
  } catch (error) {
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

module.exports = router;