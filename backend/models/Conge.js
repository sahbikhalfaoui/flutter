const mongoose = require('mongoose');

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

module.exports = mongoose.model('Conge', congeSchema);