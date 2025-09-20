const express = require('express');
const Conge = require('../models/Conge');
const User = require('../models/User');
const { auth, checkRole } = require('../middleware/auth');
const upload = require('../config/multer');

const router = express.Router();

// Create leave request
router.post('/', auth, upload.single('fichier'), async (req, res) => {
  try {
    const { typeConge, dates, justification } = req.body;
    const parsedDates = JSON.parse(dates);
    const conge = new Conge({
      userId: req.user._id,
      typeConge,
      dates: parsedDates,
      justification,
      fichierJoint: req.file ? req.file.path : undefined
    });
    await conge.save();
    res.status(201).json({ message: 'Demande de congé créée avec succès', conge });
  } catch (error) {
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// Get leave requests
router.get('/', auth, async (req, res) => {
  try {
    let query = {};
    if (req.user.role === 'collaborateur') {
      query.userId = req.user._id;
    } else if (req.user.role === 'manager') {
      const users = await User.find({ role: { $in: ['collaborateur', 'manager'] } });
      const userIds = users.map(u => u._id);
      query.userId = { $in: userIds };
    }
    
    const conges = await Conge.find(query)
      .populate('userId', 'nom email')
      .populate('approvedBy', 'nom')
      .sort({ dateCreation: -1 });
    res.json(conges);
  } catch (error) {
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// Update leave request status
router.put('/:id/status', auth, checkRole(['hr', 'manager']), async (req, res) => {
  try {
    const { statut } = req.body;
    const conge = await Conge.findById(req.params.id);
    
    if (!conge) {
      return res.status(404).json({ message: 'Demande non trouvée' });
    }

    if (req.user.role === 'manager') {
      const typeConge = conge.typeConge.toLowerCase();
      if (typeConge.includes('exceptionnel') || typeConge.includes('civisme') || 
          typeConge.includes('divers') || typeConge.includes('famille') || 
          typeConge.includes('maladie') || typeConge.includes('sans solde')) {
        return res.status(403).json({ message: 'Seul HR peut traiter ce type de congé' });
      }
    }

    await Conge.findByIdAndUpdate(req.params.id, {
      statut,
      approvedBy: req.user._id,
      dateReponse: new Date()
    });

    if (statut === 'approuve') {
      const user = await User.findById(conge.userId);
      if (conge.typeConge === 'RTT' || conge.typeConge === 'CPP') {
        user.soldeConges -= conge.dates.length;
      } else {
        user.autresAbsences += conge.dates.length;
      }
      await user.save();
    }

    res.json({ message: 'Statut mis à jour avec succès' });
  } catch (error) {
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// Delete leave request
router.delete('/:id', auth, async (req, res) => {
  try {
    const conge = await Conge.findById(req.params.id);
    if (!conge) {
      return res.status(404).json({ message: 'Demande non trouvée' });
    }
    if (conge.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Accès interdit' });
    }
    if (conge.statut !== 'en_attente') {
      return res.status(400).json({ message: 'Impossible de supprimer une demande déjà traitée' });
    }
    await Conge.findByIdAndDelete(req.params.id);
    res.json({ message: 'Demande supprimée avec succès' });
  } catch (error) {
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

module.exports = router;