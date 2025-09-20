// backend/models/Notification.js
const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  userId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  title: { 
    type: String, 
    required: true 
  },
  message: { 
    type: String, 
    required: true 
  },
  type: { 
    type: String, 
    required: true,
    enum: ['conge_request', 'conge_status_update', 'question_rh_new', 'question_rh_answered']
  },
  data: { 
    type: mongoose.Schema.Types.Mixed, 
    default: {} 
  },
  isRead: { 
    type: Boolean, 
    default: false 
  },
  readAt: Date,
}, { timestamps: true });

// Add index for better query performance
notificationSchema.index({ userId: 1, createdAt: -1 });
notificationSchema.index({ userId: 1, isRead: 1 });

module.exports = mongoose.model('Notification', notificationSchema);