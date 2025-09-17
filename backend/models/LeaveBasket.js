const mongoose = require('mongoose');

const leaveBasketSchema = new mongoose.Schema({
  // Employee who owns the basket
  employee: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },

  // Basket items - each represents a potential leave request
  items: [{
    // Leave type classification (from CongePage dropdown hierarchy)
    mainCategory: {
      type: String,
      enum: ['Congé', 'Congé exceptionnel'],
      required: true
    },

    subCategory: {
      type: String,
      required: true
    },

    specificType: {
      type: String, // For exceptional leaves with deeper hierarchies
      default: null
    },

    // Dates selected from calendar
    dates: [{
      date: {
        type: Date,
        required: true
      },
      isHalfDay: {
        type: Boolean,
        default: false
      },
      halfDayType: {
        type: String,
        enum: ['morning', 'afternoon'],
        default: null
      }
    }],

    // Justification for this leave item
    justification: {
      type: String,
      maxlength: 500,
      trim: true
    },

    // Files attached to this specific leave request
    attachments: [{
      originalName: {
        type: String,
        required: true
      },
      filename: {
        type: String,
        required: true
      },
      mimeType: {
        type: String,
        required: true
      },
      size: {
        type: Number,
        required: true
      },
      uploadedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
      },
      uploadedAt: {
        type: Date,
        default: Date.now
      }
    }],

    // Calculated total days for this item
    totalDays: {
      type: Number,
      required: true,
      min: 0.5,
      max: 365
    },

    // Item created timestamp
    createdAt: {
      type: Date,
      default: Date.now
    },

    // Item last modified
    updatedAt: {
      type: Date,
      default: Date.now
    }
  }],

  // Basket status
  status: {
    type: String,
    enum: ['active', 'submitted', 'cleared'],
    default: 'active'
  },

  // When the basket was submitted (all items processed)
  submittedAt: Date,

  // Summary statistics for the basket
  summary: {
    totalItems: { type: Number, default: 0 },
    totalDaysRequested: { type: Number, default: 0 },
    itemsWithAttachments: { type: Number, default: 0 },
    itemsWithJustifications: { type: Number, default: 0 }
  },

  // Which leave balance this basket represents
  balanceSnapshot: {
    RTTRemaining: { type: Number, default: 0 },
    CPPRemaining: { type: Number, default: 0 },
    annualLeaveRemaining: { type: Number, default: 0 },
    snapshotTakenAt: { type: Date, default: Date.now }
  }

}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Index for quick employee basket lookup
leaveBasketSchema.index({ employee: 1, status: 1 });
leaveBasketSchema.index({ employee: 1, 'items.createdAt': -1 });

// Virtual for total basket value
leaveBasketSchema.virtual('basketValue').get(function() {
  return this.summary.totalDaysRequested;
});

// Method to add item to basket (from CongePage 'Ajouter au panier')
leaveBasketSchema.methods.addItem = function(itemData) {
  // Validate leave type exists in our supported types
  const supportedTypes = this.getSupportedLeaveTypes();
  const isValidType = this.validateLeaveType(
    itemData.mainCategory,
    itemData.subCategory,
    itemData.specificType
  );

  if (!isValidType) {
    throw new Error('Invalid leave type combination');
  }

  // Calculate total days
  const totalDays = itemData.dates.reduce((total, dateObj) => {
    return total + (dateObj.isHalfDay ? 0.5 : 1);
  }, 0);

  // Create new basket item
  const newItem = {
    mainCategory: itemData.mainCategory,
    subCategory: itemData.subCategory,
    specificType: itemData.specificType,
    dates: itemData.dates.map(dateObj => ({
      date: new Date(dateObj.date),
      isHalfDay: dateObj.isHalfDay || false,
      halfDayType: dateObj.halfDayType || null
    })),
    justification: itemData.justification || '',
    attachments: itemData.attachments || [],
    totalDays,
    createdAt: new Date(),
    updatedAt: new Date()
  };

  this.items.push(newItem);
  this.updateSummary();

  return newItem;
};

// Method to remove item from basket (delete icon in CongePage)
leaveBasketSchema.methods.removeItem = function(itemIndex) {
  if (itemIndex < 0 || itemIndex >= this.items.length) {
    throw new Error('Invalid item index');
  }

  // Remove associated files from filesystem
  const item = this.items[itemIndex];
  if (item.attachments && item.attachments.length > 0) {
    const fs = require('fs');
    const path = require('path');

    item.attachments.forEach(attachment => {
      const filePath = path.join(__dirname, '..', 'uploads', attachment.filename);
      try {
        fs.unlinkSync(filePath);
      } catch (error) {
        console.warn(`Could not delete file: ${filePath}`, error);
      }
    });
  }

  this.items.splice(itemIndex, 1);
  this.updateSummary();
};

// Method to edit item in basket (edit dialog in CongePage)
leaveBasketSchema.methods.editItem = function(itemIndex, updates) {
  if (itemIndex < 0 || itemIndex >= this.items.length) {
    throw new Error('Invalid item index');
  }

  const item = this.items[itemIndex];

  // Validate updated leave type
  if (updates.mainCategory || updates.subCategory || updates.specificType) {
    const isValidType = this.validateLeaveType(
      updates.mainCategory || item.mainCategory,
      updates.subCategory || item.subCategory,
      updates.specificType || item.specificType
    );

    if (!isValidType) {
      throw new Error('Invalid leave type combination');
    }
  }

  // Update fields
  if (updates.justification !== undefined) {
    item.justification = updates.justification;
  }

  if (updates.dates && Array.isArray(updates.dates)) {
    item.dates = updates.dates.map(dateObj => ({
      date: new Date(dateObj.date),
      isHalfDay: dateObj.isHalfDay || false,
      halfDayType: dateObj.halfDayType || null
    }));

    // Recalculate total days
    item.totalDays = item.dates.reduce((total, dateObj) => {
      return total + (dateObj.isHalfDay ? 0.5 : 1);
    }, 0);
  }

  if (updates.mainCategory) item.mainCategory = updates.mainCategory;
  if (updates.subCategory) item.subCategory = updates.subCategory;
  if (updates.specificType !== undefined) item.specificType = updates.specificType;

  item.updatedAt = new Date();

  this.updateSummary();

  return item;
};

// Method to submit all basket items (send demandes button)
leaveBasketSchema.methods.submitBasket = function() {
  if (this.items.length === 0) {
    throw new Error('Cannot submit empty basket');
  }

  this.status = 'submitted';
  this.submittedAt = new Date();

  // Here you would typically create LeaveRequest documents
  // from each basket item, but we'll do that in the controller
};

// Method to clear basket (vider panier button)
leaveBasketSchema.methods.clearBasket = function() {
  // Remove all associated files
  const fs = require('fs');
  const path = require('path');

  this.items.forEach(item => {
    if (item.attachments && item.attachments.length > 0) {
      item.attachments.forEach(attachment => {
        const filePath = path.join(__dirname, '..', 'uploads', attachment.filename);
        try {
          fs.unlinkSync(filePath);
        } catch (error) {
          console.warn(`Could not delete file: ${filePath}`, error);
        }
      });
    }
  });

  this.items = [];
  this.status = 'cleared';
  this.updateSummary();
};

// Method to get supported leave types (matches CongePage exactly)
leaveBasketSchema.methods.getSupportedLeaveTypes = function() {
  return {
    'Congé': {
      'RTT': [],
      'CPP': []
    },
    'Congé exceptionnel': {
      'Civisme': [
        'Activité civique(campagne électorale)',
        'Activité civique(mandat électral)',
        'C.H.S.C.T',
        'Citoyen assesseur',
        'Commission administrateur caisses retraite & prévention',
        'Congé des réservistes',
        'Conseil prud homal',
        'Délégué du personnel',
        'Délégué syndical',
        'Formation conseiller prud homal',
        'Juré d’assises',
        'Participation aux opérations de secours',
        'Période militaire de réservéistes',
        'Représentant du comité d’entreprise',
        'Représentation d’association',
        'Réserve dans la sécurité civile',
        'Réserve sanitaire'
      ],
      'Divers': [
        'Absence catastrophe naturelle',
        'Absence diverses',
        'Acquisition de la nationalité francaise',
        'Chomage technique',
        'Contrepartie obligatoire repos',
        'Don d\'ovocyte',
        'Remplacement(déplacement d\'heures)',
        'Repos compensateur',
        'Retard',
        'Solidarité internationale'
      ],
      'Evolution professionnelle': [
        'Bilan de compétences',
        'Congé d\'enseignement ou de recherche',
        'Congé de création d\'entreprise',
        'Congé de formation économique soc. et syndic',
        'Congé de mobilité',
        'Congé de reclassement',
        'Congé éducation ouvrière',
        'Congé formation cadres et d\'animateur',
        'Congé individuel de formation',
        'Congé mutualiste formation',
        'Congé pour examen',
        'DIF dans le temps de travail',
        'Formation (interne ou externe)',
        'Période de professionalisation',
        'Plan de formation',
        'Promotion sociale',
        'Recherche emploi',
        'Validation des acquis de l\'experience'
      ],
      'Famille': [
        'Absence Enfant malade',
        'Absence adoption',
        'Absence paternité',
        'Congé de présence parentale',
        'Congé de solidarité familiale',
        'Congé de soutien familial',
        'Congé parental d\'éducation',
        'Congés événement familial',
        'Congés naissance'
      ],
      'GTA': [
        'Absence à tort',
        'Activité normale',
        'Astreinte libre',
        'Astreinte non libre',
        'Chômé',
        'Déjeuner',
        'Férié',
        'Férié chômé',
        'Grève',
        'Pont',
        'Présence à tort'
      ],
      'Handicap': [
        'Inaptitude non professionnelle',
        'Inaptitude professionnelle'
      ],
      'Heures': [
        'Heures à créditer',
        'Heures à débiter',
        'Heures à ignorer',
        'Heures à majorer',
        'Heures à payer',
        'Heures à récupérer',
        'Heures d\'intervention à payer',
        'Heures d\'intervention à récupérer',
        'Heures de récupération',
        'Heures supplémentaires et complémentaires',
        'Visite médicale',
        'Visite médicale grossesse'
      ],
      'Maladie / Accident': [
        'Absence accident de trajet',
        'Absence accident de travail',
        'Absence maladie',
        'Absence maladie professionnelle',
        'Absence maternité'
      ],
      'Sans solde': [
        'Congé sabbatique',
        'Congé sans solde'
      ]
    }
  };
};

// Method to validate leave type combination
leaveBasketSchema.methods.validateLeaveType = function(mainCategory, subCategory, specificType) {
  const supportedTypes = this.getSupportedLeaveTypes();

  // Validate main category
  if (!['Congé', 'Congé exceptionnel'].includes(mainCategory)) {
    return false;
  }

  // For regular leaves, just check main and sub
  if (mainCategory === 'Congé') {
    if (subCategory !== 'RTT' && subCategory !== 'CPP') {
      return false;
    }
  }
  // For exceptional leaves, check sub category exists and specific type is valid
  else if (mainCategory === 'Congé exceptionnel') {
    if (!supportedTypes[mainCategory][subCategory]) {
      return false;
    }

    const subTypes = supportedTypes[mainCategory][subCategory];

    // If sub-types exist and specific type provided, validate it
    if (subTypes.length > 0 && specificType) {
      return subTypes.includes(specificType);
    }

    // If no sub-types, specific type should be null
    if (subTypes.length === 0) {
      return specificType === null || specificType === undefined;
    }
  }

  return true;
};

// Method to update summary statistics
leaveBasketSchema.methods.updateSummary = function() {
  this.summary = {
    totalItems: this.items.length,
    totalDaysRequested: this.items.reduce((total, item) => total + item.totalDays, 0),
    itemsWithAttachments: this.items.filter(item => item.attachments && item.attachments.length > 0).length,
    itemsWithJustifications: this.items.filter(item => item.justification && item.justification.trim().length > 0).length
  };
};

// Method to add attachment to specific item
leaveBasketSchema.methods.addAttachmentToItem = function(itemIndex, attachment) {
  if (itemIndex < 0 || itemIndex >= this.items.length) {
    throw new Error('Invalid item index');
  }

  if (!this.items[itemIndex].attachments) {
    this.items[itemIndex].attachments = [];
  }

  this.items[itemIndex].attachments.push(attachment);
  this.updateSummary();
};

// Method to add justification to item (_showJustificationDialog)
leaveBasketSchema.methods.updateItemJustification = function(itemIndex, justification) {
  if (itemIndex < 0 || itemIndex >= this.items.length) {
    throw new Error('Invalid item index');
  }

  this.items[itemIndex].justification = justification.trim();
  this.items[itemIndex].updatedAt = new Date();
  this.updateSummary();

  return this.items[itemIndex];
};

// Static method to get or create basket for user
leaveBasketSchema.statics.getOrCreateBasket = async function(employeeId) {
  let basket = await this.findOne({
    employee: employeeId,
    status: { $ne: 'cleared' } // Don't return cleared baskets
  });

  if (!basket) {
    // Create new basket
    basket = new this({
      employee: employeeId,
      items: [],
      status: 'active',
      summary: {
        totalItems: 0,
        totalDaysRequested: 0,
        itemsWithAttachments: 0,
        itemsWithJustifications: 0
      }
    });
    await basket.save();
  }

  return basket;
};

// Static method to get basket contents with items parsed for frontend
leaveBasketSchema.statics.getBasketSummary = async function(employeeId) {
  const basket = await this.findOne({
    employee: employeeId,
    status: 'active'
  });

  if (!basket) {
    return {
      items: [],
      summary: { totalItems: 0, totalDaysRequested: 0, itemsWithAttachments: 0, itemsWithJustifications: 0 }
    };
  }

  // Convert items to display format (matches CongePage expectation)
  const displayItems = basket.items.map(item => {
    const typeString = item.specificType
      ? `${item.subCategory} - ${item.specificType}`
      : item.mainCategory === 'Congé'
        ? item.subCategory
        : item.subCategory;

    const datesString = item.dates
      .map(dateObj => {
        const formattedDate = dateObj.date.toLocaleDateString('fr-FR');
        return dateObj.isHalfDay
          ? `${formattedDate} (${dateObj.halfDayType === 'morning' ? 'matin' : 'après-midi'})`
          : formattedDate;
      })
      .join(', ');

    return {
      id: item._id.toString(),
      type: typeString,
      dates: datesString,
      totalDays: item.totalDays,
      justification: item.justification,
      hasAttachments: item.attachments && item.attachments.length > 0,
      attachmentsCount: item.attachments ? item.attachments.length : 0
    };
  });

  return {
    basketId: basket._id,
    items: displayItems,
    summary: basket.summary
  };
};

module.exports = mongoose.model('LeaveBasket', leaveBasketSchema);
