import 'package:flutter/material.dart';
import 'package:file_picker/file_picker.dart';
import 'package:flutter_application_4you/TaskGroup/CongePage.dart';
import 'dart:io';
import '../services/api_service.dart';
import 'package:intl/intl.dart';

const Color primaryPurple = Color(0xFF8E44AD);
const Color secondaryPurple = Color(0xFF9B59B6);
const Color lightGrey = Color(0xFFE0E0E0);
const Color darkGrey = Color(0xFF757575);
const Color actionColor = Colors.blueAccent;
const Color purpleCent = Color(0xFF8E44AD);

class QuestionsRHPage extends StatefulWidget {
  const QuestionsRHPage({super.key});

  @override
  State<QuestionsRHPage> createState() => _QuestionsRHPageState();
}

class _QuestionsRHPageState extends State<QuestionsRHPage> {
  final _formKey = GlobalKey<FormState>();
  TextEditingController _beneficiaireController = TextEditingController();
  String? _selectedCategorie;
  String? _selectedSousCategorie;
  TextEditingController _titreController = TextEditingController();
  TextEditingController _descriptionController = TextEditingController();
  File? _pieceJointe;
  bool _informerBeneficiaire = false;
  bool _isLoading = false;

  final List<String> _categories = ['Attestations', 'Congés', 'Données administratives', 'Données contractuelles','Données personnelles','Maladie','Autre'];
  final Map<String, List<String>> _sousCategories = {
    'Attestations': ['Attestation', 'Autre'],
    'Congés': ['Congés', 'Congés exceptionnels','Autre'],
    'Données administratives': ['Demande de badge', 'Déménagement','Mode de transport','Autre'],
    'Données contractuelles': ['Période d\'essai','Temps de travail','Autre'],
    'Données personnelles': ['Changement d\'adresse','Enfants à charge','Etat civil','Personnes à contacter','Photo','Situation familiale','Autre'],
    'Maladie':['Arret de travail','Autre'],
    'Autre':['Autre']
  };

  // Lists to store questions from backend
  List<Map<String, dynamic>> _questions = [];
  List<Map<String, dynamic>> _brouillonQuestions = [];
  List<Map<String, dynamic>> _enCoursValidationQuestions = [];
  List<Map<String, dynamic>> _historiqueQuestions = [];

  @override
  void initState() {
    super.initState();
    _loadQuestions();
  }

  Future<void> _loadQuestions() async {
    try {
      setState(() {
        _isLoading = true;
      });
      
      final questions = await ApiService.getQuestions();
      setState(() {
        _questions = List<Map<String, dynamic>>.from(questions);
        _filterQuestionsByStatus();
      });
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Erreur lors du chargement des questions: $e')),
      );
    } finally {
      setState(() {
        _isLoading = false;
      });
    }
  }

  void _filterQuestionsByStatus() {
    _brouillonQuestions = _questions.where((q) => q['statut'] == 'brouillon').toList();
    _enCoursValidationQuestions = _questions.where((q) => q['statut'] == 'en_cours_validation').toList();
    _historiqueQuestions = _questions.where((q) => q['statut'] == 'repondu').toList();
  }

  Future<void> _pickFile() async {
    FilePickerResult? result = await FilePicker.platform.pickFiles();
    if (result != null) {
      setState(() {
        _pieceJointe = File(result.files.single.path!);
      });
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Fichier joint: ${result.files.single.name}')),
      );
    }
  }

  Future<void> _sauvegarderQuestion({String? editingId}) async {
    if (_formKey.currentState!.validate()) {
      try {
        setState(() {
          _isLoading = true;
        });

        Map<String, dynamic> questionData = {
          'beneficiaire': _beneficiaireController.text,
          'categorie': _selectedCategorie,
          'sousCategorie': _selectedSousCategorie,
          'titre': _titreController.text.isNotEmpty ? _titreController.text : 'Brouillon',
          'description': _descriptionController.text,
          'informerBeneficiaire': _informerBeneficiaire,
          'statut': 'brouillon',
        };

        if (editingId != null) {
          // Update existing question
          await ApiService.updateQuestion(editingId, questionData, _pieceJointe);
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Brouillon mis à jour avec succès.')),
          );
        } else {
          // Create new question
          await ApiService.createQuestion(questionData, _pieceJointe);
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Question sauvegardée en brouillon.')),
          );
        }

        _clearForm();
        await _loadQuestions(); // Reload questions
      } catch (e) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Erreur: $e')),
        );
      } finally {
        setState(() {
          _isLoading = false;
        });
      }
    }
  }

  Future<void> _envoyerQuestion() async {
    if (_formKey.currentState!.validate()) {
      try {
        setState(() {
          _isLoading = true;
        });

        Map<String, dynamic> questionData = {
          'beneficiaire': _beneficiaireController.text,
          'categorie': _selectedCategorie,
          'sousCategorie': _selectedSousCategorie,
          'titre': _titreController.text.isNotEmpty ? _titreController.text : 'En validation',
          'description': _descriptionController.text,
          'informerBeneficiaire': _informerBeneficiaire,
          'statut': 'en_cours_validation',
        };

        await ApiService.createQuestion(questionData, _pieceJointe);
        
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Question envoyée pour validation.')),
        );
        
        _clearForm();
        await _loadQuestions(); // Reload questions
      } catch (e) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Erreur: $e')),
        );
      } finally {
        setState(() {
          _isLoading = false;
        });
      }
    }
  }

  void _supprimerQuestion() {
    setState(() {
      _clearForm();
    });
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text('Formulaire supprimé.')),
    );
  }

  void _clearForm() {
    _beneficiaireController.clear();
    _selectedCategorie = null;
    _selectedSousCategorie = null;
    _titreController.clear();
    _descriptionController.clear();
    _pieceJointe = null;
    _informerBeneficiaire = false;
  }

  void _editQuestion(Map<String, dynamic> question) {
    setState(() {
      _beneficiaireController.text = question['beneficiaire'] ?? '';
      _selectedCategorie = question['categorie'];
      _selectedSousCategorie = question['sousCategorie'];
      _titreController.text = question['titre'] ?? '';
      _descriptionController.text = question['description'] ?? '';
      _informerBeneficiaire = question['informerBeneficiaire'] ?? false;
      // Note: Can't restore file from server, user will need to re-upload if needed
      _pieceJointe = null;
    });
  }

  Future<void> _deleteBrouillonQuestion(Map<String, dynamic> question) async {
    try {
      await ApiService.deleteQuestion(question['_id']);
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Question "${question['titre']}" supprimée.')),
      );
      await _loadQuestions(); // Reload questions
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Erreur lors de la suppression: $e')),
      );
    }
  }

  Future<void> _cancelValidationQuestion(Map<String, dynamic> question) async {
    try {
      Map<String, dynamic> updateData = {
        'beneficiaire': question['beneficiaire'],
        'categorie': question['categorie'],
        'sousCategorie': question['sousCategorie'],
        'titre': question['titre'],
        'description': question['description'],
        'informerBeneficiaire': question['informerBeneficiaire'],
        'statut': 'brouillon',
      };
      
      await ApiService.updateQuestion(question['_id'], updateData, null);
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Question "${question['titre']}" retirée de la validation.')),
      );
      await _loadQuestions(); // Reload questions
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Erreur: $e')),
      );
    }
  }

  void _viewQuestion(Map<String, dynamic> question) {
    showDialog(
      context: context,
      builder: (BuildContext context) {
        return AlertDialog(
          title: const Text('Détails de la Question'),
          content: SingleChildScrollView(
            child: ListBody(
              children: <Widget>[
                Text('ID: ${question['_id']}'),
                Text('Titre: ${question['titre']}'),
                Text('Bénéficiaire: ${question['beneficiaire']}'),
                Text('Catégorie: ${question['categorie'] ?? ''}'),
                Text('Sous-catégorie: ${question['sousCategorie'] ?? ''}'),
                Text('Description: ${question['description']}'),
                Text('Date de création: ${question['createdAt'] != null ? DateFormat('dd/MM/yyyy').format(DateTime.parse(question['createdAt'])) : ''}'),
                Text('Statut: ${question['statut']}'),
                if (question['reponse'] != null) ...[
                  const SizedBox(height: 10),
                  const Text('Réponse:', style: TextStyle(fontWeight: FontWeight.bold)),
                  Text(question['reponse']),
                ],
              ],
            ),
          ),
          actions: <Widget>[
            TextButton(
              child: const Text('Fermer'),
              onPressed: () {
                Navigator.of(context).pop();
              },
            ),
          ],
        );
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Questions RH', style: TextStyle(color: Colors.white)),
        flexibleSpace: Container(
          decoration: const BoxDecoration(
            gradient: LinearGradient(
              colors: [secondaryPurple, primaryPurple],
              begin: Alignment.centerLeft,
              end: Alignment.centerRight,
            ),
          ),
        ),
      ),
      body: _isLoading 
        ? const Center(child: CircularProgressIndicator())
        : SingleChildScrollView(
            padding: const EdgeInsets.all(16.0),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Form(
                  key: _formKey,
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      TextFormField(
                        controller: _beneficiaireController,
                        decoration: const InputDecoration(
                          labelText: 'Bénéficiaire *',
                          border: OutlineInputBorder(),
                        ),
                        validator: (value) {
                          if (value == null || value.isEmpty) {
                            return 'Ce champ est obligatoire.';
                          }
                          return null;
                        },
                      ),
                      const SizedBox(height: 16),
                      CheckboxListTile(
                        title: const Text('Informer le bénéficiaire du suivi de la question RH, par mail'),
                        value: _informerBeneficiaire,
                        onChanged: (bool? value) {
                          setState(() {
                            _informerBeneficiaire = value!;
                          });
                        },
                        controlAffinity: ListTileControlAffinity.leading,
                        contentPadding: EdgeInsets.zero,
                      ),
                      const SizedBox(height: 16),
                      Row(
                        children: [
                          Expanded(
                            child: DropdownButtonFormField<String>(
                              decoration: const InputDecoration(
                                labelText: 'Catégorie *',
                                border: OutlineInputBorder(),
                              ),
                              value: _selectedCategorie,
                              items: _categories.map((String value) {
                                return DropdownMenuItem<String>(
                                  value: value,
                                  child: Text(value),
                                );
                              }).toList(),
                              onChanged: (String? newValue) {
                                setState(() {
                                  _selectedCategorie = newValue;
                                  _selectedSousCategorie = null;
                                });
                              },
                              validator: (value) {
                                if (value == null || value.isEmpty) {
                                  return 'Ce champ est obligatoire.';
                                }
                                return null;
                              },
                            ),
                          ),
                          const SizedBox(width: 16),
                          Expanded(
                            child: DropdownButtonFormField<String>(
                              decoration: const InputDecoration(
                                labelText: 'Sous-catégorie',
                                border: OutlineInputBorder(),
                              ),
                              value: _selectedSousCategorie,
                              items: _selectedCategorie != null && _sousCategories.containsKey(_selectedCategorie)
                                  ? _sousCategories[_selectedCategorie]!.map((String value) {
                                      return DropdownMenuItem<String>(
                                        value: value,
                                        child: Text(value),
                                      );
                                    }).toList()
                                  : <DropdownMenuItem<String>>[],
                              onChanged: (String? newValue) {
                                setState(() {
                                  _selectedSousCategorie = newValue;
                                });
                              },
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 16),
                      TextFormField(
                        controller: _titreController,
                        decoration: const InputDecoration(
                          labelText: 'Titre *',
                          border: OutlineInputBorder(),
                        ),
                        validator: (value) {
                          if (value == null || value.isEmpty) {
                            return 'Ce champ est obligatoire.';
                          }
                          return null;
                        },
                      ),
                      const SizedBox(height: 16),
                      TextFormField(
                        controller: _descriptionController,
                        maxLines: 5,
                        decoration: const InputDecoration(
                          labelText: 'Description *',
                          border: OutlineInputBorder(),
                        ),
                        validator: (value) {
                          if (value == null || value.isEmpty) {
                            return 'Ce champ est obligatoire.';
                          }
                          return null;
                        },
                      ),
                      const SizedBox(height: 16),
                      Row(
                        children: [
                          const Text('Pièce jointe'),
                          const SizedBox(width: 8),
                          IconButton(
                            icon: const Icon(Icons.attach_file),
                            onPressed: _pickFile,
                          ),
                          if (_pieceJointe != null)
                            Expanded(child: Text(' ${_pieceJointe!.path.split('/').last}', overflow: TextOverflow.ellipsis)),
                        ],
                      ),
                      const SizedBox(height: 32),
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceAround,
                        children: [
                          ElevatedButton(
                            onPressed: _supprimerQuestion,
                            style: ElevatedButton.styleFrom(
                              padding: EdgeInsets.zero,
                              backgroundColor: Colors.transparent,
                              shadowColor: Colors.transparent,
                              shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(8),
                              ),
                            ),
                            child: Ink(
                              decoration: BoxDecoration(
                                gradient: const LinearGradient(
                                  colors: [
                                    Color.fromARGB(255, 254, 102, 100),
                                    Color(0xFFB71C1C),
                                  ],
                                  begin: Alignment.centerLeft,
                                  end: Alignment.centerRight,
                                ),
                                borderRadius: BorderRadius.circular(8),
                              ),
                              child: Container(
                                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 14),
                                alignment: Alignment.center,
                                child: const Text(
                                  'Supprimer',
                                  style: TextStyle(
                                    fontWeight: FontWeight.w500,
                                    fontSize: 16,
                                    color: Colors.white,
                                  ),
                                ),
                              ),
                            ),
                          ),
                          ElevatedButton(
                            onPressed: _isLoading ? null : _sauvegarderQuestion,
                            style: ElevatedButton.styleFrom(
                              padding: EdgeInsets.zero,
                              backgroundColor: Colors.transparent,
                              shadowColor: Colors.transparent,
                              shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(8),
                              ),
                            ),
                            child: Ink(
                              decoration: BoxDecoration(
                                gradient: const LinearGradient(
                                  colors: [
                                    Color.fromARGB(255, 240, 171, 51),
                                    Color.fromARGB(255, 249, 200, 126),
                                  ],
                                  begin: Alignment.centerLeft,
                                  end: Alignment.centerRight,
                                ),
                                borderRadius: BorderRadius.circular(8),
                              ),
                              child: Container(
                                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 14),
                                alignment: Alignment.center,
                                child: const Text(
                                  'Sauvegarder',
                                  style: TextStyle(
                                    fontWeight: FontWeight.w500,
                                    fontSize: 16,
                                    color: Colors.white,
                                  ),
                                ),
                              ),
                            ),
                          ),
                          ElevatedButton(
                            onPressed: _isLoading ? null : _envoyerQuestion,
                            style: ElevatedButton.styleFrom(
                              padding: EdgeInsets.zero,
                              backgroundColor: Colors.transparent,
                              shadowColor: Colors.transparent,
                              shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(8),
                              ),
                            ),
                            child: Ink(
                              decoration: BoxDecoration(
                                gradient: const LinearGradient(
                                  colors: [
                                    Color.fromARGB(255, 16, 221, 88),
                                    Color.fromARGB(255, 124, 217, 106),
                                  ],
                                  begin: Alignment.centerLeft,
                                  end: Alignment.centerRight,
                                ),
                                borderRadius: BorderRadius.circular(8),
                              ),
                              child: Container(
                                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 14),
                                alignment: Alignment.center,
                                child: const Text(
                                  'Envoyer',
                                  style: TextStyle(
                                    fontWeight: FontWeight.w500,
                                    fontSize: 16,
                                    color: Colors.white,
                                  ),
                                ),
                              ),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 16),
                      const Text('Les champs indiqués par une * sont obligatoires.', style: TextStyle(color: darkGrey)),
                    ],
                  ),
                ),
                const SizedBox(height: 20),
                ExpansionTile(
                  title: const Text('En cours', style: TextStyle(fontWeight: FontWeight.bold)),
                  initiallyExpanded: true,
                  children: [
                    if (_brouillonQuestions.isNotEmpty)
                      _buildEnCoursSection(
                        title: 'Brouillon (${_brouillonQuestions.length})',
                        questions: _brouillonQuestions,
                        isBrouillon: true,
                      ),
                    if (_enCoursValidationQuestions.isNotEmpty)
                      _buildEnCoursSection(
                        title: 'En cours de validation (${_enCoursValidationQuestions.length})',
                        questions: _enCoursValidationQuestions,
                        isBrouillon: false,
                      ),
                  ].whereType<Widget>().toList(),
                ),
                const SizedBox(height: 20),
                ExpansionTile(
                  title: Text('Historique (${_historiqueQuestions.length})', style: const TextStyle(fontWeight: FontWeight.bold)),
                  children: [
                    if (_historiqueQuestions.isEmpty)
                      const Padding(
                        padding: EdgeInsets.all(16.0),
                        child: Text('Aucune question dans l\'historique.'),
                      )
                    else
                      _buildHistoriqueSection(),
                  ],
                ),
              ],
            ),
          ),
    );
  }

  Widget _buildEnCoursSection({
    required String title,
    required List<Map<String, dynamic>> questions,
    required bool isBrouillon,
  }) {
    return ExpansionTile(
      title: Text(title, style: const TextStyle(fontWeight: FontWeight.bold)),
      initiallyExpanded: true,
      children: [
        if (questions.isEmpty)
          Padding(
            padding: const EdgeInsets.all(16.0),
            child: Text('Aucune question dans $title.'),
          )
        else
          SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            child: DataTable(
              columnSpacing: 16,
              horizontalMargin: 16,
              columns: const [
                DataColumn(label: Text('N°')),
                DataColumn(label: Text('TITRE')),
                DataColumn(label: Text('CATÉGORIE')),
                DataColumn(label: Text('SOUS-CATÉGORIE')),
                DataColumn(label: Text('DEMANDÉE LE')),
                DataColumn(label: Text('STATUT')),
                DataColumn(label: Text('ACTION')),
              ],
              rows: questions.map((question) {
                return DataRow(cells: [
                  DataCell(Text(question['_id'].substring(0, 5))),
                  DataCell(
                    SizedBox(
                      width: 150,
                      child: Text(
                        question['titre'] ?? '',
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                  ),
                  DataCell(
                    SizedBox(
                      width: 120,
                      child: Text(
                        question['categorie'] ?? '',
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                  ),
                  DataCell(
                    SizedBox(
                      width: 120,
                      child: Text(
                        question['sousCategorie'] ?? '',
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                  ),
                  DataCell(Text(question['createdAt'] != null 
                    ? DateFormat('dd/MM/yyyy').format(DateTime.parse(question['createdAt'])) 
                    : '')),
                  DataCell(Text(question['statut'] ?? '')),
                  DataCell(
                    Row(
                      children: [
                        if (isBrouillon) ...[
                          IconButton(
                            icon: const Icon(Icons.edit, color: purpleCent),
                            onPressed: () => _editQuestion(question),
                          ),
                          IconButton(
                            icon: const Icon(Icons.delete, color: Colors.red),
                            onPressed: () => _deleteBrouillonQuestion(question),
                          ),
                        ] else ...[
                          IconButton(
                            icon: const Icon(Icons.search, color: purpleCent),
                            onPressed: () => _viewQuestion(question),
                          ),
                          IconButton(
                            icon: const Icon(Icons.cancel_outlined, color: Colors.redAccent),
                            onPressed: () => _cancelValidationQuestion(question),
                          ),
                        ],
                      ],
                    ),
                  ),
                ]);
              }).toList(),
            ),
          ),
      ],
    );
  }

  Widget _buildHistoriqueSection() {
    return SingleChildScrollView(
      scrollDirection: Axis.horizontal,
      child: DataTable(
        columnSpacing: 16,
        horizontalMargin: 16,
        columns: const [
          DataColumn(label: Text('N°')),
          DataColumn(label: Text('TITRE')),
          DataColumn(label: Text('CATÉGORIE')),
          DataColumn(label: Text('DEMANDÉE LE')),
          DataColumn(label: Text('RÉPONDUE LE')),
          DataColumn(label: Text('ACTION')),
        ],
        rows: _historiqueQuestions.map((question) {
          return DataRow(cells: [
            DataCell(Text(question['_id'].substring(0, 5))),
            DataCell(
              SizedBox(
                width: 150,
                child: Text(
                  question['titre'] ?? '',
                  overflow: TextOverflow.ellipsis,
                ),
              ),
            ),
            DataCell(
              SizedBox(
                width: 120,
                child: Text(
                  question['categorie'] ?? '',
                  overflow: TextOverflow.ellipsis,
                ),
              ),
            ),
            DataCell(Text(question['createdAt'] != null 
              ? DateFormat('dd/MM/yyyy').format(DateTime.parse(question['createdAt'])) 
              : '')),
            DataCell(Text(question['dateReponse'] != null 
              ? DateFormat('dd/MM/yyyy').format(DateTime.parse(question['dateReponse'])) 
              : '')),
            DataCell(
              IconButton(
                icon: const Icon(Icons.search, color: purpleCent),
                onPressed: () => _viewQuestion(question),
              ),
            ),
          ]);
        }).toList(),
      ),
    );
  }
}