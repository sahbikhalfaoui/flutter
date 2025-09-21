// backend/services/emailService.js
const nodemailer = require('nodemailer');

// Create transporter using Gmail (FIXED: createTransport instead of createTransporter)
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER, // Your Gmail address
    pass: process.env.GMAIL_APP_PASSWORD, // Gmail App Password (not regular password)
  },
});

// Verify connection configuration
transporter.verify(function (error, success) {
  if (error) {
    console.log('Email service error:', error);
  } else {
    console.log('Email service ready to send messages');
  }
});

const sendEmail = async (to, subject, html) => {
  try {
    const mailOptions = {
      from: process.env.GMAIL_USER,
      to: to,
      subject: subject,
      html: html,
    };

    const result = await transporter.sendMail(mailOptions);
    console.log('Email sent successfully:', result.messageId);
    return result;
  } catch (error) {
    console.error('Error sending email:', error);
    throw error;
  }
};

// Email templates
const emailTemplates = {
  questionRHNotification: (beneficiaireName, questionTitle, userName) => {
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #8E44AD;">Nouvelle Question RH</h2>
        <p>Bonjour ${beneficiaireName},</p>
        <p>Vous avez reçu une nouvelle question RH de la part de <strong>${userName}</strong>.</p>
        <div style="background-color: #f8f9fa; padding: 15px; border-radius: 8px; margin: 20px 0;">
          <h3 style="color: #333; margin-top: 0;">Titre: ${questionTitle}</h3>
          <p>Veuillez vous connecter à l'application pour consulter les détails de la question.</p>
        </div>
        <p>Cordialement,<br>Système RH</p>
      </div>
    `;
  },

  congeStatusUpdate: (userName, congeType, status, approverName) => {
    const statusText = status === 'approuve' ? 'approuvée' : 'refusée';
    const statusColor = status === 'approuve' ? '#28a745' : '#dc3545';
    
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #8E44AD;">Mise à jour de votre demande de congé</h2>
        <p>Bonjour ${userName},</p>
        <p>Votre demande de congé de type <strong>${congeType}</strong> a été <span style="color: ${statusColor}; font-weight: bold;">${statusText}</span>.</p>
        <div style="background-color: #f8f9fa; padding: 15px; border-radius: 8px; margin: 20px 0;">
          <p><strong>Traitée par:</strong> ${approverName}</p>
          <p><strong>Date de traitement:</strong> ${new Date().toLocaleDateString('fr-FR')}</p>
        </div>
        <p>Veuillez vous connecter à l'application pour plus de détails.</p>
        <p>Cordialement,<br>Système RH</p>
      </div>
    `;
  },

  questionRHResponse: (userName, questionTitle, reponse, repondeurName) => {
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #8E44AD;">Réponse à votre question RH</h2>
        <p>Bonjour ${userName},</p>
        <p>Vous avez reçu une réponse à votre question RH: <strong>${questionTitle}</strong></p>
        <div style="background-color: #f8f9fa; padding: 15px; border-radius: 8px; margin: 20px 0;">
          <h3 style="color: #333; margin-top: 0;">Réponse:</h3>
          <p>${reponse}</p>
          <p><strong>Répondu par:</strong> ${repondeurName}</p>
        </div>
        <p>Cordialement,<br>Système RH</p>
      </div>
    `;
  },
};

module.exports = {
  sendEmail,
  emailTemplates,
};