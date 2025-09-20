// backend/services/notificationService.js
const User = require('../models/User');
const Notification = require('../models/Notification');

// In-memory storage for WebSocket connections (use Redis in production)
const connectedClients = new Map();

const addClient = (userId, ws) => {
  connectedClients.set(userId, ws);
  console.log(`Client ${userId} connected for notifications`);
};

const removeClient = (userId) => {
  connectedClients.delete(userId);
  console.log(`Client ${userId} disconnected from notifications`);
};

const sendNotificationToUser = async (userId, notification) => {
  try {
    // Save notification to database
    await Notification.create({
      userId,
      title: notification.title,
      message: notification.message,
      type: notification.type,
      data: notification.data || {},
    });

    // Send real-time notification if user is connected
    const client = connectedClients.get(userId.toString());
    if (client && client.readyState === 1) { // WebSocket.OPEN
      client.send(JSON.stringify({
        type: 'notification',
        ...notification,
        timestamp: new Date(),
      }));
    }
  } catch (error) {
    console.error('Error sending notification:', error);
  }
};

const sendNotificationToRole = async (role, notification) => {
  try {
    const users = await User.find({ role });
    for (const user of users) {
      await sendNotificationToUser(user._id, notification);
    }
  } catch (error) {
    console.error('Error sending notification to role:', error);
  }
};

// Notification types and templates
const notificationTypes = {
  CONGE_REQUEST: 'conge_request',
  CONGE_STATUS_UPDATE: 'conge_status_update',
  QUESTION_RH_NEW: 'question_rh_new',
  QUESTION_RH_ANSWERED: 'question_rh_answered',
};

const createCongeRequestNotification = (congeData, userName) => {
  const isExceptional = ['exceptionnel', 'civisme', 'divers', 'famille', 'maladie', 'sans solde']
    .some(type => congeData.typeConge.toLowerCase().includes(type));
    
  return {
    title: `Nouvelle demande de congé ${isExceptional ? 'exceptionnel' : 'normal'}`,
    message: `${userName} a soumis une demande de congé de type ${congeData.typeConge}`,
    type: notificationTypes.CONGE_REQUEST,
    data: {
      congeId: congeData._id,
      typeConge: congeData.typeConge,
      userName,
      isExceptional,
    },
  };
};

const createCongeStatusNotification = (congeData, status, approverName) => {
  const statusText = status === 'approuve' ? 'approuvée' : 'refusée';
  return {
    title: `Demande de congé ${statusText}`,
    message: `Votre demande de congé ${congeData.typeConge} a été ${statusText} par ${approverName}`,
    type: notificationTypes.CONGE_STATUS_UPDATE,
    data: {
      congeId: congeData._id,
      status,
      approverName,
      typeConge: congeData.typeConge,
    },
  };
};

const createQuestionRHNotification = (questionData, userName) => {
  return {
    title: 'Nouvelle question RH',
    message: `${userName} a soumis une nouvelle question RH: ${questionData.titre}`,
    type: notificationTypes.QUESTION_RH_NEW,
    data: {
      questionId: questionData._id,
      titre: questionData.titre,
      userName,
      categorie: questionData.categorie,
    },
  };
};

const createQuestionRHAnsweredNotification = (questionData, reponse, repondeurName) => {
  return {
    title: 'Réponse à votre question RH',
    message: `${repondeurName} a répondu à votre question: ${questionData.titre}`,
    type: notificationTypes.QUESTION_RH_ANSWERED,
    data: {
      questionId: questionData._id,
      titre: questionData.titre,
      reponse,
      repondeurName,
    },
  };
};

module.exports = {
  addClient,
  removeClient,
  sendNotificationToUser,
  sendNotificationToRole,
  notificationTypes,
  createCongeRequestNotification,
  createCongeStatusNotification,
  createQuestionRHNotification,
  createQuestionRHAnsweredNotification,
};