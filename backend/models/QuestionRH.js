const mongoose = require('mongoose');

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

module.exports = mongoose.model('QuestionRH', questionRHSchema);