const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  identifiant: { type: String, required: true, unique: true },
  motDePasse: { type: String, required: true },
  nom: { type: String, required: true },
  email: { type: String, required: true },
  role: { type: String, enum: ['hr', 'manager', 'collaborateur'], required: true },
  soldeConges: { type: Number, default: 25 },
  autresAbsences: { type: Number, default: 0 }
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);