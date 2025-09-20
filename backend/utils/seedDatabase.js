const bcrypt = require('bcryptjs');
const User = require('../models/User');

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

module.exports = seedDatabase;