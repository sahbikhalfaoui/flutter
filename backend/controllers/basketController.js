const LeaveBasket = require('../models/LeaveBasket');
const LeaveRequest = require('../models/LeaveRequest');
const User = require('../models/User');

// @desc    Get user's leave basket (matches _getBasketContents in frontend)
// @route   GET /api/basket
// @access  Private
const getBasket = async (req, res) => {
  try {
    const userId = req.user._id;

    // Get basket summary
    const basketData = await LeaveBasket.getBasketSummary(userId);

    // Get user's current leave balances
    const user = await User.findById(userId).select('leaveBalance');

    res.json({
      success: true,
      data: {
        basket: basketData,
        balances: {
          RTT: user?.leaveBalance?.RTTBalance || 0,
          CPP: user?.leaveBalance?.CPPBalance || 0,
          annual: user?.leaveBalance?.totalLeaves || 0,
          available: user?.leaveBalance?.availableLeaves || 0
        },
        supportedTypes: {
          'Congé': {
            'RTT': [],
            'CPP': []
          },
          'Congé exceptionnel': getExceptionalLeaveTypes()
        }
      }
    });

  } catch (error) {
    console.error('Erreur lors de la récupération du panier:', error);

    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération du panier',
      code: 'GET_BASKET_ERROR'
    });
  }
};

// @desc    Add item to basket (_ajouterAuPanier in CongePage)
// @route   POST /api/basket/items
// @access  Private
const addItemToBasket = async (req, res) => {
  try {
    const {
      mainCategory,
      subCategory,
      specificType,
      dates,
      justification
    } = req.body;

    const userId = req.user._id;

    // Validation des champs requis
    if (!mainCategory || !subCategory || !dates || !Array.isArray(dates) || dates.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Catégorie principale, sous-catégorie et dates sont requis',
        code: 'MISSING_REQUIRED_FIELDS'
      });
    }

    // Pour les congés exceptionnels avec subtypes, vérifier que specificType est fourni
    const exceptionalTypes = getExceptionalLeaveTypes();
    if (mainCategory === 'Congé exceptionnel' &&
        exceptionalTypes[subCategory] &&
        exceptionalTypes[subCategory].length > 0 &&
        !specificType) {
      return res.status(400).json({
        success: false,
        message: 'Sous-type spécifique requis pour cette catégorie',
        code: 'SPECIFIC_TYPE_REQUIRED'
      });
    }

    // Validation des dates (pas dans le passé)
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);

    for (const dateObj of dates) {
      const selectedDate = new Date(dateObj.date);
      selectedDate.setHours(0, 0, 0, 0);

      if (mainCategory === 'Congé exceptionnel' && selectedDate < now) {
        // Pour congés exceptionnels, dates passées peuvent être valides
        continue;
      }

      if (mainCategory === 'Congé' && selectedDate < tomorrow) {
        return res.status(400).json({
          success: false,
          message: `Date invalide: ${dateObj.date} est dans le passé`,
          code: 'PAST_DATE_NOT_ALLOWED'
        });
      }
    }

    // Obtenir ou créer le panier
    const basket = await LeaveBasket.getOrCreateBasket(userId);

    // Ajouter l'item au panier
    const itemData = {
      mainCategory,
      subCategory,
      specificType: specificType || null,
      dates,
      justification: justification || ''
    };

    const newItem = basket.addItem(itemData);

    await basket.save();

    // Retourner le panier mis à jour
    const updatedBasket = await LeaveBasket.getBasketSummary(userId);

    res.json({
      success: true,
      message: 'Congé(s) ajouté(s) au panier',
      data: {
        basket: updatedBasket,
        addedItem: {
          id: newItem._id.toString(),
          mainCategory,
          subCategory,
          specificType,
          totalDays: newItem.totalDays
        }
      }
    });

  } catch (error) {
    console.error('Erreur lors de l\'ajout au panier:', error);

    if (error.message === 'Invalid leave type combination') {
      return res.status(400).json({
        success: false,
        message: 'Combinaison de type de congé invalide',
        code: 'INVALID_LEAVE_TYPE'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Erreur lors de l\'ajout au panier',
      code: 'ADD_TO_BASKET_ERROR'
    });
  }
};

// @desc    Edit basket item (_showEditDialog in CongePage)
// @route   PUT /api/basket/items/:itemIndex
// @access  Private
const editBasketItem = async (req, res) => {
  try {
    const itemIndex = parseInt(req.params.itemIndex);
    const updates = req.body;

    const basket = await LeaveBasket.getOrCreateBasket(req.user._id);

    if (itemIndex < 0 || itemIndex >= basket.items.length) {
      return res.status(400).json({
        success: false,
        message: 'Index d\'item invalide',
        code: 'INVALID_ITEM_INDEX'
      });
    }

    // Modifier l'item
    const updatedItem = basket.editItem(itemIndex, updates);
    await basket.save();

    // Retourner le panier mis à jour
    const updatedBasket = await LeaveBasket.getBasketSummary(req.user._id);

    res.json({
      success: true,
      message: 'Demande modifiée avec succès',
      data: {
        basket: updatedBasket,
        updatedItem: {
          index: itemIndex,
          mainCategory: updatedItem.mainCategory,
          subCategory: updatedItem.subCategory,
          specificType: updatedItem.specificType,
          totalDays: updatedItem.totalDays
        }
      }
    });

  } catch (error) {
    console.error('Erreur lors de la modification:', error);

    if (error.message === 'Invalid leave type combination') {
      return res.status(400).json({
        success: false,
        message: 'Combinaison de type de congé invalide',
        code: 'INVALID_LEAVE_TYPE'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Erreur lors de la modification',
      code: 'EDIT_BASKET_ITEM_ERROR'
    });
  }
};

// @desc    Remove item from basket (delete icon in CongePage)
// @route   DELETE /api/basket/items/:itemIndex
// @access  Private
const removeBasketItem = async (req, res) => {
  try {
    const itemIndex = parseInt(req.params.itemIndex);

    const basket = await LeaveBasket.findOne({
      employee: req.user._id,
      status: 'active'
    });

    if (!basket) {
      return res.status(404).json({
        success: false,
        message: 'Panier non trouvé',
        code: 'BASKET_NOT_FOUND'
      });
    }

    basket.removeItem(itemIndex);
    await basket.save();

    // Retourner le panier mis à jour
    const updatedBasket = await LeaveBasket.getBasketSummary(req.user._id);

    res.json({
      success: true,
      message: 'Demande supprimée du panier',
      data: {
        basket: updatedBasket
      }
    });

  } catch (error) {
    console.error('Erreur lors de la suppression:', error);

    res.status(500).json({
      success: false,
      message: 'Erreur lors de la suppression d\'élément',
      code: 'REMOVE_BASKET_ITEM_ERROR'
    });
  }
};

// @desc    Clear entire basket (_viderPanier in CongePage)
// @route   DELETE /api/basket
// @access  Private
const clearBasket = async (req, res) => {
  try {
    const basket = await LeaveBasket.findOne({
      employee: req.user._id,
      status: 'active'
    });

    if (!basket) {
      return res.status(404).json({
        success: false,
        message: 'Panier non trouvé',
        code: 'BASKET_NOT_FOUND'
      });
    }

    basket.clearBasket();
    await basket.save();

    res.json({
      success: true,
      message: 'Panier vidé avec succès',
      data: {
        basket: {
          items: [],
          summary: basket.summary
        }
      }
    });

  } catch (error) {
    console.error('Erreur lors du vidage du panier:', error);

    res.status(500).json({
      success: false,
      message: 'Erreur lors du vidage du panier',
      code: 'CLEAR_BASKET_ERROR'
    });
  }
};

// @desc    Add justification to basket item (_showJustificationDialog)
// @route   PUT /api/basket/items/:itemIndex/justification
// @access  Private
const updateItemJustification = async (req, res) => {
  try {
    const itemIndex = parseInt(req.params.itemIndex);
    const { justification } = req.body;

    if (!justification || justification.trim().length < 3) {
      return res.status(400).json({
        success: false,
        message: 'Justification doit contenir au moins 3 caractères',
        code: 'JUSTIFICATION_TOO_SHORT'
      });
    }

    const basket = await LeaveBasket.getOrCreateBasket(req.user._id);

    const updatedItem = basket.updateItemJustification(itemIndex, justification);
    await basket.save();

    res.json({
      success: true,
      message: 'Justification ajoutée avec succès',
      data: {
        updatedItem: {
          index: itemIndex,
          justification: updatedItem.justification
        }
      }
    });

  } catch (error) {
    console.error('Erreur lors de la mise à jour de la justification:', error);

    res.status(500).json({
      success: false,
      message: 'Erreur lors de la mise à jour de la justification',
      code: 'UPDATE_JUSTIFICATION_ERROR'
    });
  }
};

// @desc    Upload attachment to basket item (_showAttachFileDialog)
// @route   POST /api/basket/items/:itemIndex/attachments
// @access  Private
const uploadBasketAttachment = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Aucun fichier n\'a été fourni',
        code: 'NO_FILE_UPLOADED'
      });
    }

    const itemIndex = parseInt(req.params.itemIndex);
    const basket = await LeaveBasket.getOrCreateBasket(req.user._id);

    if (itemIndex < 0 || itemIndex >= basket.items.length) {
      return res.status(400).json({
        success: false,
        message: 'Index d\'item invalide',
        code: 'INVALID_ITEM_INDEX'
      });
    }

    // Créer l'entrée d'attachment
    const attachment = {
      originalName: req.file.originalname,
      filename: req.file.filename,
      mimeType: req.file.mimetype,
      size: req.file.size,
      uploadedBy: req.user._id,
      uploadedAt: new Date()
    };

    // Ajouter à l'item du panier
    basket.addAttachmentToItem(itemIndex, attachment);
    await basket.save();

    res.json({
      success: true,
      message: 'Fichier téléversé avec succès',
      data: {
        itemIndex,
        attachment
      }
    });

  } catch (error) {
    console.error('Erreur lors du téléversement:', error);

    res.status(500).json({
      success: false,
      message: 'Erreur lors du téléversement du fichier',
      code: 'UPLOAD_ATTACHMENT_ERROR'
    });
  }
};

// @desc    Submit basket contents (_envoyerDemandes in CongePage)
// @route   POST /api/basket/submit
// @access  Private
const submitBasket = async (req, res) => {
  try {
    const basket = await LeaveBasket.findOne({
      employee: req.user._id,
      status: 'active'
    });

    if (!basket || basket.items.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Le panier est vide',
        code: 'EMPTY_BASKET'
      });
    }

    // Créer une demande de congé pour chaque item du panier
    const createdRequests = [];

    for (const item of basket.items) {
      // Détermine l'approbateur basé sur le type de congé
      let approverId = null;
      const employee = await User.findById(req.user._id).populate('manager team');

      if (req.user.role === 'admin') {
        approverId = req.user._id; // Admin s'approuve lui-même
      } else {
        // Trouver un manager disponible
        approverId = employee.manager?._id ||
                    await User.findOne({ role: 'hr', isActive: true }).select('_id').lean();
      }

      // Créer la demande de congé
      const leaveRequest = await LeaveRequest.create({
        employee: req.user._id,
        approver: approverId,
        leaveType: item.specificType ?
          `${item.subCategory} - ${item.specificType}` :
          item.mainCategory === 'Congé' ? item.subCategory : item.subCategory,
        dates: item.dates,
        totalDays: item.totalDays,
        justification: item.justification,
        attachments: item.attachments,
        status: 'pending'
      });

      createdRequests.push(leaveRequest._id);
    }

    // Marquer le panier comme soumis
    basket.submitBasket();
    await basket.save();

    res.json({
      success: true,
      message: `${createdRequests.length} demande(s) envoyée(s)!`,
      data: {
        submittedCount: createdRequests.length,
        requestIds: createdRequests,
        message: 'Vos demandes sont en attente d\'approbation.'
      }
    });

  } catch (error) {
    console.error('Erreur lors de la soumission:', error);

    res.status(500).json({
      success: false,
      message: 'Erreur lors de la soumission des demandes',
      code: 'SUBMIT_BASKET_ERROR'
    });
  }
};

// Helper function to get exceptional leave types (matches CongePage exactly)
function getExceptionalLeaveTypes() {
  return {
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
      'Juré d\'assises',
      'Participation aux opérations de secours',
      'Période militaire de réservéistes',
      'Représentant du comité d\'entreprise',
      'Représentation d\'association',
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
  };
}

module.exports = {
  getBasket,
  addItemToBasket,
  editBasketItem,
  removeBasketItem,
  clearBasket,
  updateItemJustification,
  uploadBasketAttachment,
  submitBasket
};
