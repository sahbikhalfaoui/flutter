// backend/routes/questions.js (Updated)
const express = require('express');
const QuestionRH = require('../models/QuestionRH');
const User = require('../models/User');
const { auth, checkRole } = require('../middleware/auth');
const upload = require('../config/multer');
const { sendEmail, emailTemplates } = require('../services/emailService');
const { 
  sendNotificationToRole, 
  sendNotificationToUser,
  createQuestionRHNotification,
  createQuestionRHAnsweredNotification 
} = require('../services/notificationService');

const router = express.Router();

// Get HR users for beneficiary selection
router.get('/hr-users', auth, async (req, res) => {
  try {
    const hrUsers = await User.find({ role: 'hr' }, 'nom email _id');
    res.json(hrUsers);
  } catch (error) {
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// Create HR question
router.post('/', auth, upload.single('pieceJointe'), async (req, res) => {
  try {
    const { beneficiaireId, categorie, sousCategorie, titre, description, informerBeneficiaire, statut } = req.body;
    
    // Get beneficiary details
    const beneficiaire = await User.findById(beneficiaireId);
    if (!beneficiaire) {
      return res.status(400).json({ message: 'Bénéficiaire non trouvé' });
    }

    const question = new QuestionRH({
      userId: req.user._id,
      beneficiaire: beneficiaire.nom,
      beneficiaireId: beneficiaireId,
      categorie,
      sousCategorie,
      titre,
      description,
      informerBeneficiaire: informerBeneficiaire === 'true',
      statut: statut || 'brouillon',
      pieceJointe: req.file ? req.file.path : undefined
    });
    
    await question.save();

    // Send notifications and email if question is submitted for validation
    if (statut === 'en_cours_validation') {
      // Send notification to HR role
      const notification = createQuestionRHNotification(question, req.user.nom);
      await sendNotificationToRole('hr', notification);

      // Send email to beneficiary if requested
      if (informerBeneficiaire === 'true') {
        try {
          const emailContent = emailTemplates.questionRHNotification(
            beneficiaire.nom,
            question.titre,
            req.user.nom
          );
          await sendEmail(
            beneficiaire.email,
            'Nouvelle Question RH',
            emailContent
          );
        } catch (emailError) {
          console.error('Error sending email:', emailError);
          // Don't fail the request if email fails
        }
      }
    }

    res.status(201).json({ message: 'Question créée avec succès', question });
  } catch (error) {
    console.error('Create question error:', error);
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

    const { beneficiaireId, categorie, sousCategorie, titre, description, informerBeneficiaire, statut } = req.body;
    
    let beneficiaire;
    if (beneficiaireId) {
      beneficiaire = await User.findById(beneficiaireId);
      if (!beneficiaire) {
        return res.status(400).json({ message: 'Bénéficiaire non trouvé' });
      }
    }

    const updateData = {
      beneficiaire: beneficiaire ? beneficiaire.nom : question.beneficiaire,
      beneficiaireId: beneficiaireId || question.beneficiaireId,
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

    const updatedQuestion = await QuestionRH.findByIdAndUpdate(req.params.id, updateData, { new: true });

    // Send notifications if status changed to validation
    if (statut === 'en_cours_validation' && question.statut !== 'en_cours_validation') {
      const notification = createQuestionRHNotification(updatedQuestion, req.user.nom);
      await sendNotificationToRole('hr', notification);

      // Send email to beneficiary if requested
      if (informerBeneficiaire === 'true' && beneficiaire) {
        try {
          const emailContent = emailTemplates.questionRHNotification(
            beneficiaire.nom,
            updatedQuestion.titre,
            req.user.nom
          );
          await sendEmail(
            beneficiaire.email,
            'Nouvelle Question RH',
            emailContent
          );
        } catch (emailError) {
          console.error('Error sending email:', emailError);
        }
      }
    }

    res.json({ message: 'Question mise à jour avec succès' });
  } catch (error) {
    console.error('Update question error:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// Answer HR question (HR only)
router.put('/:id/repondre', auth, checkRole(['hr']), async (req, res) => {
  try {
    const { reponse } = req.body;
    const question = await QuestionRH.findById(req.params.id).populate('userId', 'nom email');
    
    if (!question) {
      return res.status(404).json({ message: 'Question non trouvée' });
    }

    await QuestionRH.findByIdAndUpdate(req.params.id, {
      reponse,
      statut: 'repondu',
      reponduPar: req.user._id,
      dateReponse: new Date()
    });

    // Send notification to question author
    const notification = createQuestionRHAnsweredNotification(question, reponse, req.user.nom);
    await sendNotificationToUser(question.userId._id, notification);

    // Send email notification
    try {
      const emailContent = emailTemplates.questionRHResponse(
        question.userId.nom,
        question.titre,
        reponse,
        req.user.nom
      );
      await sendEmail(
        question.userId.email,
        'Réponse à votre question RH',
        emailContent
      );
    } catch (emailError) {
      console.error('Error sending email:', emailError);
    }

    res.json({ message: 'Réponse ajoutée avec succès' });
  } catch (error) {
    console.error('Answer question error:', error);
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