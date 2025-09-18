const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = 'your-secret-key';

app.use(cors());
app.use(express.json());
app.use('/uploads', express.static('uploads'));

if (!fs.existsSync('uploads')) {
  fs.mkdirSync('uploads');
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/');
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + '-' + file.originalname);
  }
});
const upload = multer({ storage: storage });

mongoose.connect('mongodb://localhost:27017/hr_app', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const userSchema = new mongoose.Schema({
  identifiant: { type: String, required: true, unique: true },
  motDePasse: { type: String, required: true },
  nom: { type: String, required: true },
  email: { type: String, required: true },
  role: { type: String, enum: ['hr', 'manager', 'collaborateur'], required: true },
  soldeConges: { type: Number, default: 25 },
  autresAbsences: { type: Number, default: 0 }
}, { timestamps: true });

const congeSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  typeConge: { type: String, required: true },
  dates: [{ type: Date, required: true }],
  statut: { type: String, enum: ['en_attente', 'approuve', 'refuse'], default: 'en_attente' },
  justification: String,
  fichierJoint: String,
  approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  dateCreation: { type: Date, default: Date.now },
  dateReponse: Date
}, { timestamps: true });

const questionRHSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  beneficiaire: { type: String, required: true },
  categorie: { type: String, required: true },
  sousCategorie: String,
  titre: { type: String, required: true },
  description: { type: String, required: true },
  pieceJointe: String,
  informerBeneficiaire: { type: Boolean, default: false },
  statut: { type: String, enum: ['brouillon', 'en_cours_validation', 'repondu'], default: 'brouillon' },
  reponse: String,
  reponduPar: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  dateReponse: Date
}, { timestamps: true });

const User = mongoose.model('User', userSchema);
const Conge = mongoose.model('Conge', congeSchema);
const QuestionRH = mongoose.model('QuestionRH', questionRHSchema);

const auth = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ message: 'Accès non autorisé' });
    }
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(401).json({ message: 'Utilisateur non trouvé' });
    }
    req.user = user;
    next();
  } catch (error) {
    res.status(401).json({ message: 'Token invalide' });
  }
};

const checkRole = (roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Accès interdit' });
    }
    next();
  };
};

app.post('/api/login', async (req, res) => {
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

app.get('/api/profile', auth, async (req, res) => {
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

app.post('/api/users', auth, checkRole(['hr']), async (req, res) => {
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

app.get('/api/users', auth, checkRole(['hr']), async (req, res) => {
  try {
    const users = await User.find({}, '-motDePasse');
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

app.put('/api/users/:id', auth, checkRole(['hr']), async (req, res) => {
  try {
    const { nom, email, role, soldeConges } = req.body;
    await User.findByIdAndUpdate(req.params.id, { nom, email, role, soldeConges });
    res.json({ message: 'Utilisateur mis à jour avec succès' });
  } catch (error) {
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

app.delete('/api/users/:id', auth, checkRole(['hr']), async (req, res) => {
  try {
    await User.findByIdAndDelete(req.params.id);
    res.json({ message: 'Utilisateur supprimé avec succès' });
  } catch (error) {
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

app.post('/api/conges', auth, upload.single('fichier'), async (req, res) => {
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

app.get('/api/conges', auth, async (req, res) => {
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

app.put('/api/conges/:id/status', auth, checkRole(['hr', 'manager']), async (req, res) => {
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

app.delete('/api/conges/:id', auth, async (req, res) => {
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

app.post('/api/questions-rh', auth, upload.single('pieceJointe'), async (req, res) => {
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

app.get('/api/questions-rh', auth, async (req, res) => {
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

app.put('/api/questions-rh/:id', auth, upload.single('pieceJointe'), async (req, res) => {
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

app.put('/api/questions-rh/:id/repondre', auth, checkRole(['hr']), async (req, res) => {
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

app.delete('/api/questions-rh/:id', auth, async (req, res) => {
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

app.get('/api/dashboard-stats', auth, async (req, res) => {
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

const seedDatabase = async () => {
  try {
    const userCount = await User.countDocuments();
    if (userCount === 0) {
      const users = [
        {
          identifiant: 'admin',
          motDePasse: await bcrypt.hash('admin123', 10),
          nom: 'Admin HR',
          email: 'admin@company.com',
          role: 'hr',
          soldeConges: 25,
          autresAbsences: 0
        },
        {
          identifiant: 'manager1',
          motDePasse: await bcrypt.hash('manager123', 10),
          nom: 'Jean Manager',
          email: 'manager@company.com',
          role: 'manager',
          soldeConges: 25,
          autresAbsences: 2
        },
        {
          identifiant: 'emp1',
          motDePasse: await bcrypt.hash('emp123', 10),
          nom: 'Marie Employee',
          email: 'marie@company.com',
          role: 'collaborateur',
          soldeConges: 20,
          autresAbsences: 1
        },
        {
          identifiant: 'emp2',
          motDePasse: await bcrypt.hash('emp123', 10),
          nom: 'Pierre Employee',
          email: 'pierre@company.com',
          role: 'collaborateur',
          soldeConges: 22,
          autresAbsences: 0
        }
      ];

      await User.insertMany(users);
      console.log('Base de données initialisée avec des utilisateurs de test');
    }
  } catch (error) {
    console.error('Erreur lors de l\'initialisation:', error);
  }
};

mongoose.connection.once('open', async () => {
  console.log('Connecté à MongoDB');
  await seedDatabase();
});

app.listen(PORT, () => {
  console.log(`Serveur démarré sur le port ${PORT}`);
});

module.exports = app;