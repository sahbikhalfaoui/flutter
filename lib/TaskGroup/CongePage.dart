import 'package:flutter/material.dart';
import 'package:font_awesome_flutter/font_awesome_flutter.dart';
import 'package:intl/intl.dart';
import 'package:file_picker/file_picker.dart';
import 'dart:io';
import 'package:table_calendar/table_calendar.dart';


const Color primaryPurple = Color(0xFF8E44AD);
const Color purpleCent = Colors.deepPurpleAccent;
const Color secondaryPurple = Color(0xFF9B59B6);
const Color accentYellow = Color(0xFFFFDA63);
const Color lightGrey = Color(0xFFE0E0E0);
const Color darkGrey = Color(0xFF757575);

class AnimatedGradientAddToCartButton extends StatefulWidget {
  
  final VoidCallback? onPressed;
  final String text;

  const AnimatedGradientAddToCartButton({
    super.key,
    required this.onPressed,
    required this.text,
  });

  @override
  State<AnimatedGradientAddToCartButton> createState() => _AnimatedGradientAddToCartButtonState();
}

class _AnimatedGradientAddToCartButtonState extends State<AnimatedGradientAddToCartButton>
    with SingleTickerProviderStateMixin {
  late AnimationController _animationController;
  late Animation<double> _scaleAnimation;
  bool _isPressed = false;

  @override
  void initState() {
    super.initState();
    _animationController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 300),
    );
    _scaleAnimation = Tween<double>(begin: 1.0, end: 1.05).animate(
      CurvedAnimation(parent: _animationController, curve: Curves.easeInOut),
    );
  }

  @override
  void dispose() {
    _animationController.dispose();
    super.dispose();
  }

  void _handleTapDown(TapDownDetails _) {
    setState(() {
      _isPressed = true;
      _animationController.forward();
    });
  }

  void _handleTapUp(TapUpDetails _) {
    setState(() {
      _isPressed = false;
      _animationController.reverse();
    });
    widget.onPressed?.call();
  }

  void _handleTapCancel() {
    setState(() {
      _isPressed = false;
      _animationController.reverse();
    });
  }

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTapDown: _handleTapDown,
      onTapUp: _handleTapUp,
      onTapCancel: _handleTapCancel,
      child: ScaleTransition(
        scale: _scaleAnimation,
        child: Container(
          decoration: BoxDecoration(
            gradient: LinearGradient(
              colors: [const Color.fromARGB(255, 200, 148, 221), const Color.fromARGB(255, 192, 93, 234)],
              begin: Alignment.centerLeft,
              end: Alignment.centerRight,
            ),
            borderRadius: BorderRadius.circular(20),
            boxShadow: _isPressed
                ? [
                    BoxShadow(
                      color: Colors.black.withOpacity(0.1),
                      spreadRadius: 1,
                      blurRadius: 3,
                      offset: const Offset(0, 2),
                    ),
                  ]
                : [
                    BoxShadow(
                      color: Colors.black.withOpacity(0.2),
                      spreadRadius: 1,
                      blurRadius: 5,
                      offset: const Offset(0, 3),
                    ),
                  ],
          ),
          child: ElevatedButton(
            onPressed: null, // Handled by GestureDetector
            style: ElevatedButton.styleFrom(
              backgroundColor: Colors.transparent,
              foregroundColor: Colors.white,
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 10),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
              elevation: 0,
            ),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                const Icon(FontAwesomeIcons.plus , color: Colors.white),
                const SizedBox(width: 8),
                Text(widget.text, style: const TextStyle(fontWeight: FontWeight.w500, fontSize: 16)),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class AnimatedGradientViderPanierButton extends StatefulWidget {
  final VoidCallback? onPressed;

  const AnimatedGradientViderPanierButton({super.key, required this.onPressed});

  @override
  State<AnimatedGradientViderPanierButton> createState() => _AnimatedGradientViderPanierButtonState();
}

class _AnimatedGradientViderPanierButtonState extends State<AnimatedGradientViderPanierButton>
    with SingleTickerProviderStateMixin {
  late AnimationController _animationController;
  late Animation<double> _slideAnimation;
  bool _isPressed = false;

  @override
  void initState() {
    super.initState();
    _animationController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 200),
    );
    _slideAnimation = Tween<double>(begin: 0.0, end: -8.0).animate(
      CurvedAnimation(parent: _animationController, curve: Curves.easeInOut),
    );
  }

  @override
  void dispose() {
    _animationController.dispose();
    super.dispose();
  }

  void _handleTapDown(TapDownDetails _) {
    setState(() {
      _isPressed = true;
      _animationController.forward();
    });
  }

  void _handleTapUp(TapUpDetails _) {
    setState(() {
      _isPressed = false;
      _animationController.reverse();
    });
    widget.onPressed?.call();
  }

  void _handleTapCancel() {
    setState(() {
      _isPressed = false;
      _animationController.reverse();
    });
  }

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTapDown: _handleTapDown,
      onTapUp: _handleTapUp,
      onTapCancel: _handleTapCancel,
      child: Container(
        decoration: BoxDecoration(
          gradient: LinearGradient(
            colors: [Colors.redAccent.shade400, Colors.redAccent.shade700],
            begin: Alignment.centerLeft,
            end: Alignment.centerRight,
          ),
          borderRadius: BorderRadius.circular(20),
          boxShadow: _isPressed
              ? [
                  BoxShadow(
                    color: Colors.black.withOpacity(0.1),
                    spreadRadius: 1,
                    blurRadius: 3,
                    offset: const Offset(0, 2),
                  ),
                ]
              : [
                  BoxShadow(
                    color: Colors.black.withOpacity(0.2),
                    spreadRadius: 1,
                    blurRadius: 5,
                    offset: const Offset(0, 3),
                  ),
                ],
        ),
        child: ElevatedButton(
          onPressed: null, 
          style: ElevatedButton.styleFrom(
            backgroundColor: Colors.transparent,
            foregroundColor: Colors.white,
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 10),
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
            elevation: 0,
          ),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              AnimatedBuilder(
                animation: _animationController,
                builder: (context, child) {
                  return Transform.translate(
                    offset: Offset(_slideAnimation.value, 0),
                    child: const Icon(Icons.delete_outline, color: Colors.white),
                  );
                },
              ),
              const SizedBox(width: 8),
              const Text('Vider le panier', style: TextStyle(fontWeight: FontWeight.w500, fontSize: 16)),
            ],
          ),
        ),
      ),
    );
  }
}

class AnimatedGradientEnvoyerButton extends StatefulWidget {
  final VoidCallback? onPressed;

  const AnimatedGradientEnvoyerButton({super.key, required this.onPressed});

  @override
  State<AnimatedGradientEnvoyerButton> createState() => _AnimatedGradientEnvoyerButtonState();
}

class _AnimatedGradientEnvoyerButtonState extends State<AnimatedGradientEnvoyerButton>
    with SingleTickerProviderStateMixin {
  late AnimationController _animationController;
  late Animation<double> _scaleAnimation;
  bool _isPressed = false;

  @override
  void initState() {
    super.initState();
    _animationController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 150),
    );
    _scaleAnimation = Tween<double>(begin: 1.0, end: 1.05).animate(
      CurvedAnimation(parent: _animationController, curve: Curves.easeInOut),
    );
  }

  @override
  void dispose() {
    _animationController.dispose();
    super.dispose();
  }

  void _handleTapDown(TapDownDetails _) {
    setState(() {
      _isPressed = true;
      _animationController.forward();
    });
  }

  void _handleTapUp(TapUpDetails _) {
    setState(() {
      _isPressed = false;
      _animationController.reverse();
    });
    widget.onPressed?.call();
  }

  void _handleTapCancel() {
    setState(() {
      _isPressed = false;
      _animationController.reverse();
    });
  }

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTapDown: _handleTapDown,
      onTapUp: _handleTapUp,
      onTapCancel: _handleTapCancel,
      child: ScaleTransition(
        scale: _scaleAnimation,
        child: Container(
          decoration: BoxDecoration(
            gradient: LinearGradient(
              colors: [const Color.fromARGB(255, 200, 148, 221), const Color.fromARGB(255, 192, 93, 234)],
              begin: Alignment.centerLeft,
              end: Alignment.centerRight,
            ),
            borderRadius: BorderRadius.circular(20),
            boxShadow: _isPressed
                ? [
                    BoxShadow(
                      color: Colors.black.withOpacity(0.1),
                      spreadRadius: 1,
                      blurRadius: 3,
                      offset: const Offset(0, 2),
                    ),
                  ]
                : [
                    BoxShadow(
                      color: Colors.black.withOpacity(0.2),
                      spreadRadius: 1,
                      blurRadius: 5,
                      offset: const Offset(0, 3),
                    ),
                  ],
          ),
          child: ElevatedButton(
            onPressed: null, // Handled by GestureDetector
            style: ElevatedButton.styleFrom(
              backgroundColor: Colors.transparent,
              foregroundColor: Colors.white,
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 10),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
              elevation: 0,
            ),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                const Icon(Icons.send_outlined, color: Colors.white),
                const SizedBox(width: 8),
                const Text('Envoyer les demandes', style: TextStyle(fontWeight: FontWeight.w500, fontSize: 16),selectionColor: Colors.black,),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class CongesPage extends StatefulWidget {
  const CongesPage({super.key});

  @override
  State<CongesPage> createState() => _CongesPageState();
}

class _CongesPageState extends State<CongesPage> {
  CalendarFormat _calendarFormat = CalendarFormat.month;
  DateTime _focusedDay = DateTime.now();
  DateTime? _selectedDay;
  Set<DateTime> _selectedDays = {};
  String? _selectedMainCongesType; // To hold either 'Congé' or 'Congé exceptionnel'
  String? _selectedSubCongesCategory; // Sub-category for both types
  String? _selectedSpecificExceptionnelType;
  List<String> _panierConges = [];
  Map<String, String> _justifications = {};
  Map<String, File?> _attachedFiles = {};
  String? _editingMainCategory;
  String? _editingSubCategory;
  String? _selectedCongesExceptionnel;

  final Map<String, List<String>> _congesOptions = {
    'RTT': [], 
    'CPP': [], 
  };

  final Map<String, List<String>> _congesExceptionnelsOptions = {
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
      'Période militaire de réservistes',
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
      'Don d’ovocyte',
      'Remplacement(déplacement d’heures)',
      'Repos compensateur',
      'Retard',
      'Solidarité internationale'
    ],
    'Evolution professionnelle': [
      'Bilan de compétences',
      'Congé d’enseignement ou de recherche',
      'Congé de création d’entreprise',
      'Congé de formation économique soc. et syndic',
      'Congé de mobilité',
      'Congé de reclassement',
      'Congé éducation ouvrière',
      'Congé formation cadres et d’animateur',
      'Congé individuel de formation',
      'Congé mutualiste formation',
      'Congé pour examen',
      'DIF dans le temps de travail',
      'Formation (interne ou externe)',
      'Période de professionalisation',
      'Plan de formation',
      'Promotion sociale',
      'Recherche emploi',
      'Validation des acquis de l’experience'
    ],
    'Famille': [
      'Absence Enfant malade',
      'Absence adoption',
      'Absence paternité',
      'Congé de présence parentale',
      'Congé de solidarité familiale',
      'Congé de soutien familial',
      'Congé parental d’éducation',
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
      'Heures d’intervention à payer',
      'Heures d’intervention à récupérer',
      'Heures de récupération',
      'Heures supplémentaires et complémentaires',
      'Visite médicale',
      'Visite médicale grossesse'],
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
    ],
  };

  
  late final Map<String, Map<String, List<String>>> _allLeaveTypes;

  @override
  void initState() {
    super.initState();
    _allLeaveTypes = {
      'Congé': {
        'RTT': [],
        'CPP': [],
      },
      'Congé exceptionnel': _congesExceptionnelsOptions,
    };
  }

  Future<void> _showAttachFileDialog(BuildContext context, String congeItem) async {
    FilePickerResult? result = await FilePicker.platform.pickFiles();

    if (result != null && result.files.isNotEmpty) {
      PlatformFile file = result.files.first;
      String? filePath = file.path;

      if (filePath != null) {
        setState(() {
          _attachedFiles[congeItem] = File(filePath);
        });

        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Fichier joint pour $congeItem: ${file.name}')),
        );
      }
    } else {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Sélection de fichier annulée.')),
      );
    }
  }

  Future<void> _showEditDialog(BuildContext context, String congeItem) async {
    final parts = congeItem.split(' - ');
    // Handle cases where the item might be "Civisme - Activité civique - Dates" or "RTT - Dates"
    String currentTypeWithSub = parts.sublist(0, parts.length - 1).join(' - ');
    String currentDates = parts.last;

    String? initialMainCategory;
    String? initialSubCategory; // This will hold 'RTT', 'CPP', or 'Civisme', 'Divers', etc.
    String? initialSpecificSubCategory; // This will hold 'Activité civique', 'Absence catastrophe naturelle', etc.

    // Determine the main category ('Congé' or 'Congé exceptionnel')
    if (currentTypeWithSub == 'RTT' || currentTypeWithSub == 'CPP') {
      initialMainCategory = 'Congé';
      initialSubCategory = currentTypeWithSub;
    } else {
      initialMainCategory = 'Congé exceptionnel';
      // Now, try to find the specific sub-category within 'Congé exceptionnel'
      bool foundSpecific = false;
      for (var mainCatKey in _congesExceptionnelsOptions.keys) {
        if (_congesExceptionnelsOptions[mainCatKey]!.contains(currentTypeWithSub)) {
          // This means currentTypeWithSub is a specific sub-type (e.g., "Activité civique")
          initialSubCategory = mainCatKey;
          initialSpecificSubCategory = currentTypeWithSub;
          foundSpecific = true;
          break;
        }
      }
      if (!foundSpecific) {
        // If currentTypeWithSub is not a specific sub-type, it must be a main sub-category (e.g., "Civisme")
        if (_congesExceptionnelsOptions.containsKey(currentTypeWithSub)) {
          initialSubCategory = currentTypeWithSub;
          initialSpecificSubCategory = null; // No further sub-category
        } else {
          // This handles cases like "Civisme - Activité civique" where currentTypeWithSub would be "Civisme - Activité civique"
          // We need to parse it to get both the main sub-category and the specific sub-type
          final subParts = currentTypeWithSub.split(' - ');
          if (subParts.length == 2 && _congesExceptionnelsOptions.containsKey(subParts[0]) && _congesExceptionnelsOptions[subParts[0]]!.contains(subParts[1])) {
            initialSubCategory = subParts[0];
            initialSpecificSubCategory = subParts[1];
          }
        }
      }
    }
    _editingMainCategory = initialMainCategory;
    _editingSubCategory = initialSubCategory;
    String? _editingSpecificSubCategory = initialSpecificSubCategory; // New state for the deepest level

    TextEditingController datesController = TextEditingController(text: currentDates);

    return showDialog<void>(
      context: context,
      builder: (BuildContext dialogContext) {
        return StatefulBuilder(
          builder: (context, setState) {
            return AlertDialog(
              title: const Text('Modifier la demande'),
              content: SingleChildScrollView(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: <Widget>[
                    const Text('Catégorie principale:', style: TextStyle(fontWeight: FontWeight.bold)),
                    DropdownButton<String>(
                      isExpanded: true,
                      hint: const Text('Choisissez un type de congé'),
                      value: _editingMainCategory,
                      items: _allLeaveTypes.keys.map((String value) {
                        return DropdownMenuItem<String>(
                          value: value,
                          child: Text(value),
                        );
                      }).toList(),
                      onChanged: (newValue) {
                        setState(() {
                          _editingMainCategory = newValue;
                          _editingSubCategory = null;
                          _editingSpecificSubCategory = null;
                        });
                      },
                    ),
                    if (_editingMainCategory != null)
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const SizedBox(height: 16),
                          const Text('Sous-catégorie:', style: TextStyle(fontWeight: FontWeight.bold)),
                          DropdownButton<String>(
                            isExpanded: true,
                            hint: Text(_editingMainCategory == 'Congé' ? 'Choisissez RTT ou CPP' : 'Choisissez une catégorie'),
                            value: _editingSubCategory,
                            items: _allLeaveTypes[_editingMainCategory]!.keys.map((String value) {
                              return DropdownMenuItem<String>(
                                value: value,
                                child: Text(value),
                              );
                            }).toList(),
                            onChanged: (newValue) {
                              setState(() {
                                _editingSubCategory = newValue;
                                _editingSpecificSubCategory = null; // Reset specific sub-category when main sub-category changes
                              });
                            },
                          ),
                        ],
                      ),
                    // Conditionally show the third dropdown for "Congé exceptionnel" sub-options
                    if (_editingMainCategory == 'Congé exceptionnel' && _editingSubCategory != null && _congesExceptionnelsOptions[_editingSubCategory]!.isNotEmpty)
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const SizedBox(height: 16),
                          const Text('Sous-catégorie spécifique:', style: TextStyle(fontWeight: FontWeight.bold)),
                          DropdownButton<String>(
                            isExpanded: true,
                            hint: const Text('Choisissez un sous-type spécifique'),
                            value: _editingSpecificSubCategory, // Bind this dropdown's value
                            items: _congesExceptionnelsOptions[_editingSubCategory]!.map((String value) {
                              return DropdownMenuItem<String>(
                                value: value,
                                child: Text(value),
                              );
                            }).toList(),
                            onChanged: (newValue) {
                              setState(() {
                                _editingSpecificSubCategory = newValue;
                              });
                            },
                          ),
                        ],
                      ),
                    const SizedBox(height: 16),
                    const Text('Dates:', style: TextStyle(fontWeight: FontWeight.bold)),
                    TextField(
                      controller: datesController,
                      decoration: const InputDecoration(hintText: 'e.g., 01/01/2023, 02/01/2023'),
                      enabled: false,
                    ),
                    const SizedBox(height: 8),
                    const Text('Fonctionnalité d\'édition des dates non implémentée ici.'),
                  ],
                ),
              ),
              actions: <Widget>[
                TextButton(
                  onPressed: () => Navigator.of(dialogContext).pop(),
                  child: const Text('Annuler'),
                ),
                TextButton(
                  onPressed: () {
                    String newCongeType = '';
                    if (_editingMainCategory != null) {
                      if (_editingMainCategory == 'Congé') {
                        if (_editingSubCategory != null) {
                          newCongeType = _editingSubCategory!; // For 'Congé', the sub-category is the actual type (RTT/CPP)
                        } else {
                          ScaffoldMessenger.of(context).showSnackBar(
                            const SnackBar(content: Text('Veuillez sélectionner RTT ou CPP.')),
                          );
                          return;
                        }
                      } else if (_editingMainCategory == 'Congé exceptionnel') {
                        if (_editingSpecificSubCategory != null) {
                          // If a specific sub-type is selected, combine it with the main sub-category
                          newCongeType = '${_editingSubCategory!} - ${_editingSpecificSubCategory!}';
                        } else if (_editingSubCategory != null) {
                          // If only a main sub-category is selected (and it has no specific sub-types)
                          newCongeType = _editingSubCategory!;
                        } else {
                          ScaffoldMessenger.of(context).showSnackBar(
                            const SnackBar(content: Text('Veuillez sélectionner un type de congé exceptionnel.')),
                          );
                          return;
                        }
                      }
                    }

                    if (newCongeType.isEmpty) {
                      ScaffoldMessenger.of(context).showSnackBar(
                        const SnackBar(content: Text('Veuillez sélectionner un type de congé.')),
                      );
                      return;
                    }

                    String newCongeItem = '$newCongeType - ${datesController.text}';
                    this.setState(() {
                      final index = _panierConges.indexOf(congeItem);
                      if (index != -1) {
                        _panierConges[index] = newCongeItem;
                        // Transfer justifications and attached files to the new item string
                        _justifications[newCongeItem] = _justifications[congeItem] ?? '';
                        _attachedFiles[newCongeItem] = _attachedFiles[congeItem];
                        _justifications.remove(congeItem);
                        _attachedFiles.remove(congeItem);
                      }
                    });
                    ScaffoldMessenger.of(context).showSnackBar(
                      SnackBar(content: Text('Demande modifiée vers $newCongeItem')),
                    );
                    Navigator.of(dialogContext).pop();
                  },
                  child: const Text('Enregistrer'),
                ),
              ],
            );
          },
        );
      },
    );
  }

  Future<void> _showJustificationDialog(BuildContext context, String congeItem) async {
    TextEditingController justificationController = TextEditingController(text: _justifications[congeItem]);
    return showDialog<void>(
      context: context,
      builder: (BuildContext context) {
        return AlertDialog(
          title: const Text('Ajouter une justification'),
          content: TextField(
            controller: justificationController,
            decoration: const InputDecoration(hintText: 'Entrez votre justification'),
            maxLines: 3,
          ),
          actions: <Widget>[
            TextButton(
              onPressed: () => Navigator.of(context).pop(),
              child: const Text('Annuler'),
            ),
            TextButton(
              onPressed: () {
                String justification = justificationController.text;
                setState(() {
                  _justifications[congeItem] = justification;
                });
                ScaffoldMessenger.of(context).showSnackBar(
                  SnackBar(content: Text('Justification ajoutée pour $congeItem')),
                );
                Navigator.of(context).pop();
              },
              child: const Text('Enregistrer'),
            ),
          ],
        );
      },
    );
  }

  void _ajouterAuPanier() {
    String? selectedTypeForPanier;

    if (_selectedMainCongesType == 'Congé') {
      selectedTypeForPanier = _selectedSubCongesCategory;
    } else if (_selectedMainCongesType == 'Congé exceptionnel') {
      if (_selectedSpecificExceptionnelType != null) {
        // If a specific sub-type is chosen, combine it with the main sub-category
        selectedTypeForPanier = '${_selectedSubCongesCategory!} - ${_selectedSpecificExceptionnelType!}';
      } else if (_selectedSubCongesCategory != null && _congesExceptionnelsOptions[_selectedSubCongesCategory!]!.isEmpty) {
        // If only a main sub-category is chosen and it has no further sub-types
        selectedTypeForPanier = _selectedSubCongesCategory;
      } else {
        // If 'Congé exceptionnel' is chosen but no sub-category or specific type
        selectedTypeForPanier = null;
      }
    }
    if (selectedTypeForPanier != null && _selectedDays.isNotEmpty) {
      final congeDates = _selectedDays.map((date) => DateFormat('dd/MM/yyyy').format(date)).toList().join(', ');
      final congeItem = '$selectedTypeForPanier - $congeDates';

      setState(() {
        _panierConges.add(congeItem);
        _selectedMainCongesType = null;
        _selectedSubCongesCategory = null;
        _selectedSpecificExceptionnelType = null; // Reset the specific type
        _selectedDays.clear();
      });
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Congé(s) ajouté(s) au panier.')),
      );
    } else if (selectedTypeForPanier == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Veuillez sélectionner un type de congé.')),
      );
    } else { // _selectedDays.isEmpty
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Veuillez sélectionner au moins un jour dans le calendrier.')),
      );
    }
  }


  void _viderPanier() {
    setState(() {
      _panierConges.clear();
      _justifications.clear();
      _attachedFiles.clear();
    });
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text('Panier vidé')),
    );
  }

  void _envoyerDemandes() {
    if (_panierConges.isNotEmpty) {
      for (var item in _panierConges) {
        print('- $item');
        if (_justifications.containsKey(item)) {
          print('   Justification: ${_justifications[item]}');
        }
        if (_attachedFiles.containsKey(item) && _attachedFiles[item] != null) {
          print('   Fichier joint: ${_attachedFiles[item]!.path}');
        }
      }
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Demande de congés envoyée! (Fonctionnalité d\'envoi réelle non implémentée)')),
      );
      setState(() {
        _panierConges.clear();
        _justifications.clear();
        _attachedFiles.clear();
      });
    } else {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Votre panier de congés est vide.')),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Mes congés', style: TextStyle(color: Colors.white)),
        leading: const BackButton(color: Colors.white),
        actions: const [
          Icon(Icons.search, color: Colors.white),
          SizedBox(width: 16),
          Icon(Icons.help_outline, color: Colors.white),
          SizedBox(width: 16),
          Icon(Icons.settings, color: Colors.white),
          SizedBox(width: 16),
        ],
        elevation: 2,
        flexibleSpace: Container(
          decoration: BoxDecoration(
            gradient: LinearGradient(
              colors: [secondaryPurple, primaryPurple],
              begin: Alignment.centerLeft,
              end: Alignment.centerRight,
            ),
          ),
        ),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text('Sélectionner les jours:', style: TextStyle(fontSize: 18, fontWeight: FontWeight.w500, color: darkGrey)),
            const SizedBox(height: 10),
            TableCalendar(
              firstDay: DateTime.utc(DateTime.now().year - 1, 1, 1),
              lastDay: DateTime.utc(DateTime.now().year + 1, 12, 31),
              focusedDay: _focusedDay,
              calendarFormat: _calendarFormat,
              selectedDayPredicate: (day) => _selectedDays.contains(day),
              onDaySelected: (selectedDay, focusedDay) {
                setState(() {
                  _focusedDay = focusedDay;
                  if (_selectedDays.contains(selectedDay)) {
                    _selectedDays.remove(selectedDay);
                  } else {
                    _selectedDays.add(selectedDay);
                  }
                });
              },
              onFormatChanged: (format) {
                setState(() {
                  _calendarFormat = format;
                });
              },
              onPageChanged: (focusedDay) {
                _focusedDay = focusedDay;
              },
            ),
            const SizedBox(height: 20),
            const Text('Sélectionner le type de congé:', style: TextStyle(fontSize: 18, fontWeight: FontWeight.w500, color: darkGrey)),
            const SizedBox(height: 10),
            DropdownButton<String>(
              isExpanded: true,
              hint: const Text('Choisissez une catégorie principale'),
              value: _selectedMainCongesType,
              items: _allLeaveTypes.keys.map((String value) {
                return DropdownMenuItem<String>(
                  value: value,
                  child: Text(value),
                );
              }).toList(),
              onChanged: (newValue) {
                setState(() {
                  _selectedMainCongesType = newValue;
                  _selectedSubCongesCategory = null; 
                   _selectedSpecificExceptionnelType = null;
                });
              },
            ),
            if (_selectedMainCongesType != null)
              DropdownButton<String>(
                isExpanded: true,
                hint: Text(_selectedMainCongesType == 'Congé' ? 'Choisissez RTT ou CPP' : 'Choisissez un sous-type'),
                value: _selectedSubCongesCategory,
                items: _allLeaveTypes[_selectedMainCongesType]!.keys.map((String value) {
                  return DropdownMenuItem<String>(
                    value: value,
                    child: Text(value),
                  );
                }).toList(),
                onChanged: (newValue) {
                  setState(() {
                    _selectedSubCongesCategory = newValue;
                    _selectedSpecificExceptionnelType = null; 
                  });
                },
              ),
            // Conditionally show the third dropdown for "Congé exceptionnel" sub-options
            if (_selectedMainCongesType == 'Congé exceptionnel' && _selectedSubCongesCategory != null && _congesExceptionnelsOptions[_selectedSubCongesCategory]!.isNotEmpty)
              DropdownButton<String>(
                isExpanded: true,
                hint: const Text('Choisissez un sous-type spécifique'),
                value: _selectedSpecificExceptionnelType, // This dropdown's value isn't directly bound to _selectedSubConges, but rather to the actual specific sub-category
                items: _congesExceptionnelsOptions[_selectedSubCongesCategory]!.map((String value) {
                  return DropdownMenuItem<String>(
                    value: value,
                    child: Text(value),
                  );
                }).toList(),
                onChanged: (newValue) {
                  setState(() {
                  
                    _selectedSpecificExceptionnelType = newValue;
                  });
                },
              ),
            const SizedBox(height: 20),
            AnimatedGradientAddToCartButton(
              onPressed: _ajouterAuPanier,
              text: 'Ajouter au panier',
            ),
            const SizedBox(height: 20),
            const Text('Panier de congés:', style: TextStyle(fontSize: 18, fontWeight: FontWeight.w500, color: darkGrey)),
            const SizedBox(height: 10),
            if (_panierConges.isEmpty)
              const Center(
                child: Text('Votre panier est vide.', style: TextStyle(color: darkGrey)),
              ),
            for (var item in _panierConges)
              Card(
                margin: const EdgeInsets.symmetric(vertical: 8.0),
                elevation: 2,
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                child: Padding(
                  padding: const EdgeInsets.all(8.0),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        item,
                        style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
                      ),
                      if (_justifications[item] != null && _justifications[item]!.isNotEmpty)
                        Padding(
                          padding: const EdgeInsets.only(top: 4.0),
                          child: Text(
                            'Justification: ${_justifications[item]}',
                            style: const TextStyle(fontStyle: FontStyle.italic, color: darkGrey),
                          ),
                        ),
                      if (_attachedFiles[item] != null)
                        Padding(
                          padding: const EdgeInsets.only(top: 4.0),
                          child: Text(
                            'Fichier joint: ${_attachedFiles[item]!.path.split('/').last}',
                            style: const TextStyle(color: darkGrey),
                          ),
                        ),
                      Row(
                        mainAxisAlignment: MainAxisAlignment.end,
                        children: [
                          IconButton(
                            icon: const Icon(Icons.edit, color: primaryPurple),
                            tooltip: 'Modifier la demande',
                            onPressed: () => _showEditDialog(context, item),
                          ),
                          IconButton(
                            icon: const Icon(Icons.note_add, color: primaryPurple),
                            tooltip: 'Ajouter une justification',
                            onPressed: () => _showJustificationDialog(context, item),
                          ),
                          IconButton(
                            icon: const Icon(Icons.attach_file, color: primaryPurple),
                            tooltip: 'Joindre un fichier',
                            onPressed: () => _showAttachFileDialog(context, item),
                          ),
                          IconButton(
                            icon: const Icon(Icons.delete_forever, color: Colors.red),
                            tooltip: 'Supprimer la demande',
                            onPressed: () {
                              setState(() {
                                _panierConges.remove(item);
                                _justifications.remove(item);
                                _attachedFiles.remove(item);
                              });
                              ScaffoldMessenger.of(context).showSnackBar(
                                const SnackBar(content: Text('Demande supprimée du panier.')),
                              );
                            },
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
              ),
            const SizedBox(height: 20),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                AnimatedGradientViderPanierButton(onPressed: _viderPanier),
                AnimatedGradientEnvoyerButton(onPressed: _envoyerDemandes),
              ],
            ),
          ],
        ),
      ),
    );
  }
}