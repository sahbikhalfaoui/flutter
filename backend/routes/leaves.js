const express = require('express');
const router = express.Router();

// Import controllers
const {
  getLeaves,
  createLeave,
  getLeave,
  updateLeave,
  approveLeave,
  rejectLeave,
  cancelLeave,
  deleteLeave,
  addComment,
  uploadAttachment,
  getLeaveHistory
} = require('../controllers/leaveController');

// Import middleware
const {
  protect,
  authorize,
  logActivity,
  validateObjectId
} = require('../middleware/auth');

// All routes require authentication
router.use(protect);

// @desc    Get all leave requests (with filters, pagination)
router.get('/', getLeaves);

// @desc    Create a new leave request
router.post('/',
  logActivity('leave_create', 'Création d\'une demande de congé'),
  createLeave
);

// @desc    Get a specific leave request
router.get('/:id', validateObjectId, getLeave);

// @desc    Update a leave request
router.put('/:id',
  validateObjectId,
  logActivity('leave_update', 'Mise à jour d\'une demande de congé'),
  updateLeave
);

// @desc    Approve a leave request (Manager/HR/Admin only)
router.post('/:id/approve',
  authorize('manager', 'hr', 'admin'),
  validateObjectId,
  logActivity('leave_approve', 'Approbation d\'une demande de congé'),
  approveLeave
);

// @desc    Reject a leave request (Manager/HR/Admin only)
router.post('/:id/reject',
  authorize('manager', 'hr', 'admin'),
  validateObjectId,
  logActivity('leave_reject', 'Rejet d\'une demande de congé'),
  rejectLeave
);

// @desc    Cancel a leave request
router.post('/:id/cancel',
  validateObjectId,
  logActivity('leave_cancel', 'Annulation d\'une demande de congé'),
  cancelLeave
);

// @desc    Delete a draft leave request
router.delete('/:id',
  validateObjectId,
  logActivity('leave_delete', 'Suppression d\'une demande de congé'),
  deleteLeave
);

// @desc    Add comment to leave request
router.post('/:id/comments',
  validateObjectId,
  logActivity('leave_comment', 'Ajout d\'un commentaire à une demande de congé'),
  addComment
);

// @desc    Upload attachment to leave request
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
  logActivity('leave_attachment', 'Ajout d\'une pièce jointe à une demande de congé'),
  uploadAttachment
);

// @desc    Get leave history for a user
router.get('/:userId/history',
  validateObjectId,
  getLeaveHistory
);

module.exports = router;
