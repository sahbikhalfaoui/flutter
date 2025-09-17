# 4YOU HR Backend API

## Table des Matières
- [Aperçu](#aperçu)
- [Technologies](#technologies)
- [Installation](#installation)
- [Configuration](#configuration)
- [API Routes](#api-routes)
- [Modèles de Données](#modèles-de-données)
- [Authentification](#authentification)
- [Sécurité](#sécurité)

## Aperçu

Le backend de 4YOU HR est une API REST complète construite avec Node.js, Express et MongoDB. Elle fournit toutes les fonctionnalités nécessaires pour l'application mobile Flutter 4YOU HR, incluant la gestion des congés, des questions RH, des utilisateurs et des équipes.

## Technologies

- **Node.js** - Runtime JavaScript côté serveur
- **Express.js** - Framework web pour Node.js
- **MongoDB** - Base de données NoSQL
- **Mongoose** - ODM pour MongoDB
- **JWT** - Authentification basée sur les tokens
- **bcryptjs** - Hachage de mots de passe
- **CORS** - Gestion des requêtes cross-origin
- **Helmet** - Sécurité des headers HTTP
- **Multer** - Gestion des fichiers uploadés

## Installation

### Prérequis
- Node.js >= 16.0.0
- MongoDB >= 4.4
- npm ou yarn

### Étapes d'installation

1. **Cloner le dépôt**
```bash
git clone https://github.com/votre-org/4you-hr-backend.git
cd 4you-hr-backend
```

2. **Installer les dépendances**
```bash
npm install
```

3. **Configuration de l'environnement**
Copiez le fichier `.env` et configurez les variables d'environnement :
```bash
cp .env.example .env
```

4. **Démarrer MongoDB**
Assurez-vous que MongoDB est en cours d'exécution sur votre système.

5. **Démarrage du serveur**
```bash
# Mode développement
npm run dev

# Mode production
npm start

# Avec nodemon
npm run dev
```

Le serveur démarrera sur `http://localhost:5000`

## Configuration

### Variables d'environnement (.env)

```env
NODE_ENV=development
PORT=5000
MONGODB_URI=mongodb://localhost:27017/fouryou_hr
JWT_SECRET=votre_clé_secrète_très_longue_et_sécurisée
JWT_EXPIRE=30d
JWT_REFRESH_EXPIRE=7d
CLIENT_URL=http://localhost:8000
MAX_FILE_SIZE=5242880
MAX_FILES_COUNT=5
```

### Structure du projet

```
backend/
├── controllers/          # Logique métier
│   ├── authController.js
│   ├── leaveController.js
│   ├── hrController.js
│   └── teamController.js
├── middleware/           # Middleware personnalisés
│   └── auth.js
├── models/              # Schémas MongoDB
│   ├── User.js
│   ├── LeaveRequest.js
│   ├── HRQuestion.js
│   └── Team.js
├── routes/              # Définition des routes
│   ├── auth.js
│   ├── leaves.js
│   ├── hr.js
│   └── teams.js
├── config/              # Configuration
│   └── database.js
├── uploads/             # Fichiers uploadés
├── validations/         # Schémas de validation
├── utils/               # Utilitaires
├── tests/               # Tests
├── .env                 # Variables d'environnement
├── package.json
├── server.js           # Point d'entrée
└── README.md
```

## API Routes

### Authentification
- `POST /api/auth/register` - Enregistrement d'un nouvel utilisateur
- `POST /api/auth/login` - Connexion d'un utilisateur
- `POST /api/auth/refresh` - Rafraîchissement du token
- `POST /api/auth/logout` - Déconnexion
- `GET /api/auth/profile` - Récupérer le profil utilisateur
- `PUT /api/auth/profile` - Mettre à jour le profil
- `PUT /api/auth/change-password` - Changer le mot de passe

### Gestion des congés
- `GET /api/leaves` - Récupérer toutes les demandes de congé
- `POST /api/leaves` - Créer une nouvelle demande de congé
- `GET /api/leaves/:id` - Récupérer une demande spécifique
- `PUT /api/leaves/:id` - Mettre à jour une demande
- `POST /api/leaves/:id/approve` - Approuver une demande
- `POST /api/leaves/:id/reject` - Rejeter une demande
- `DELETE /api/leaves/:id` - Supprimer une demande (brouillon seulement)

### Questions RH
- `GET /api/hr-questions` - Récupérer toutes les questions
- `POST /api/hr-questions` - Créer une nouvelle question
- `GET /api/hr-questions/:id` - Récupérer une question spécifique
- `PUT /api/hr-questions/:id` - Mettre à jour une question
- `POST /api/hr-questions/:id/conversation` - Ajouter un message à la conversation
- `PUT /api/hr-questions/:id/status` - Changer le statut d'une question

### Gestion des équipes
- `GET /api/teams` - Récupérer toutes les équipes
- `POST /api/teams` - Créer une nouvelle équipe
- `GET /api/teams/:id` - Récupérer une équipe spécifique
- `PUT /api/teams/:id` - Mettre à jour une équipe
- `POST /api/teams/:id/members` - Ajouter un membre à une équipe
- `DELETE /api/teams/:id/members/:memberId` - Supprimer un membre d'une équipe

## Modèles de Données

### Utilisateur (User)
- `firstName`, `lastName` : Informations personnelles
- `email` : Adresse email (unique)
- `password` : Mot de passe hashé
- `role` : 'employee' | 'manager' | 'hr' | 'admin'
- `department`, `position` : Informations professionnelles
- `leaveBalance` : Solde de congés
- `preferences` : Préférences utilisateur

### Demande de congé (LeaveRequest)
- `employee` : Référence vers l'utilisateur
- `approver` : Référence vers l'approbateur
- `leaveType` : 'RTT' | 'CPP' | types exceptionnel avec sous-catégories
- `dates` : Tableau des dates demandées
- `status` : 'pending' | 'approved' | 'rejected' | 'cancelled'
- `justification`, `comments`, `attachments` : Documentation

### Question RH (HRQuestion)
- `user` : Utilisateur posant la question
- `category`, `subCategory` : Classification
- `title`, `description` : Contenu de la question
- `status` : Workflow des questions
- `conversations` : Échanges entre utilisateurs et RH

### Équipe (Team)
- `name`, `description` : Informations de base
- `manager` : Manager de l'équipe
- `members` : Liste des membres avec rôles
- `permissions` : Droits et permissions de l'équipe

## Authentification

L'API utilise l'authentification JWT (JSON Web Tokens). Les endpoints nécessitent généralement un token d'accès dans le header :

```
Authorization: Bearer <token>
```

### Workflow d'authentification
1. **Connexion** : L'utilisateur fournit email/mot de passe
2. **Token d'accès** : Fourni pour l'accès aux ressources protégées
3. **Token de rafraîchissement** : Permet de régénérer le token d'accès

## Sécurité

### Fonctionnalités de sécurité
- **Cryptage des mots de passe** avec bcrypt
- **JWT avec expiration** pour l'authentification
- **Rate limiting** sur les endpoints sensibles
- **Validation des entrées** avec Joi
- **Protection CSRF** et headers de sécurité
- **Logs d'activité** des utilisateurs
- **Validation des rôles** et permissions

### Headers de sécurité
- Content Security Policy (CSP)
- X-Frame-Options
- X-Content-Type-Options
- HttpOnly cookies pour JWT

## Tests

```bash
# Exécuter les tests
npm test

# Tests avec coverage
npm run test:coverage
```

## Déploiement

### Préparation pour la production
1. Définir `NODE_ENV=production`
2. Configurer les variables d'environnement de production
3. Assurer le fonctionnement de MongoDB en production
4. Configurer un reverse proxy (Nginx)
5. Activer SSL/TLS

### Commandes de déploiement
```bash
# Build pour production
npm run build

# Démarrage en production
npm run start
```

## Support et Maintenance

- **Logs** : Le serveur enregistre tous les événements importants
- **Monitoring** : Points de terminaison `/api/health` pour la surveillance
- **Rate limiting** : Protection contre les abus
- **Gestion d'erreurs** : Messages d'erreur structurés et codes

---

**Documentation technique détaillée disponible dans `/docs/api.md`**

**Pour les contributions, voir `CONTRIBUTING.md`**
