const express = require('express');
const router = express.Router();

// Import controllers
const {
  getHRQuestions,
  createHRQuestion,
  getHRQuestion,
  updateHRQuestion,
  updateHRQuestionStatus,
  addConversationMessage,
  uploadHRAttachment,
  deleteHRQuestion,
  getHRQuestionStats
} = require('../controllers/hrController');

// Import middleware
const {
  protect,
  authorize,
  logActivity,
  validateObjectId
} = require('../middleware/auth');

// All routes require authentication
router.use(protect);

// @desc    Get all HR questions (with filters, pagination)
router.get('/', getHRQuestions);

// @desc    Create a new HR question
router.post('/',
  logActivity('hr_question_create', 'Création d\'une question RH'),
  createHRQuestion
);

// @desc    Get a specific HR question
router.get('/:id', validateObjectId, getHRQuestion);

// @desc    Update an HR question
router.put('/:id',
  validateObjectId,
  logActivity('hr_question_update', 'Mise à jour d\'une question RH'),
  updateHRQuestion
);

// @desc    Update HR question status (HR/Admin only)
router.put('/:id/status',
  authorize('hr', 'admin'),
  validateObjectId,
  logActivity('hr_question_status_update', 'Changement de statut d\'une question RH'),
  updateHRQuestionStatus
);

// @desc    Add conversation message to HR question
router.post('/:id/conversation',
  validateObjectId,
  logActivity('hr_question_message', 'Ajout d\'un message à la conversation'),
  addConversationMessage
);

// @desc    Upload attachment to HR question
router.post('/:id/attachments',
  validateObjectId,
  (req, res, next) => {
    req.uploadFiles(req, res, (err) => {
      if (err) {
        return res.status(400).json({
          success: false,
          message: 'Erreur lors du téléversement du fichier',
          code: 'UPLOAD_ERROR'
        });
      }
      next();
    });
  },
  logActivity('hr_question_attachment', 'Téléversement d\'une pièce jointe'),
  uploadHRAttachment
);

// @desc    Delete HR question (draft only)
router.delete('/:id',
  validateObjectId,
  logActivity('hr_question_delete', 'Suppression d\'une question RH'),
  deleteHRQuestion
);

// @desc    Get HR questions statistics (HR/Admin only)
router.get('/stats/overview',
  authorize('hr', 'admin'),
  getHRQuestionStats
);

module.exports = router;
