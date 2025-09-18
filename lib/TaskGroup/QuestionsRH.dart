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

  // State for "En cours" questions
  final List<_QuestionItem> _brouillonQuestions = [];
  final List<_QuestionItem> _enCoursValidationQuestions = [];

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

 void _sauvegarderQuestion({String? editingId}) {
    if (_formKey.currentState!.validate()) {
      final now = DateTime.now();
      final formattedDate = DateFormat('dd/MM/yyyy').format(now);
      final String title = _titreController.text.isNotEmpty
          ? _titreController.text
          : 'Brouillon (${_brouillonQuestions.length + (editingId == null ? 1 : 0)})';
      final updatedQuestion = _QuestionItem(
        id: editingId ?? UniqueKey().toString().substring(0, 5),
        beneficiaire: _beneficiaireController.text,
        categorie: _selectedCategorie,
        sousCategorie: _selectedSousCategorie,
        titre: title,
        description: _descriptionController.text,
        pieceJointe: _pieceJointe,
        informerBeneficiaire: _informerBeneficiaire,
        dateDemande: editingId != null ? _brouillonQuestions.firstWhere((q) => q.id == editingId).dateDemande : formattedDate, // Keep original date if editing
        statut: 'Brouillon',
      );

      setState(() {
        if (editingId != null) {
          final index = _brouillonQuestions.indexWhere((q) => q.id == editingId);
          if (index != -1) {
            _brouillonQuestions[index] = updatedQuestion;
            ScaffoldMessenger.of(context).showSnackBar(
              const SnackBar(content: Text('Brouillon mis à jour.')),
            );
          }
        } else {
          _brouillonQuestions.add(updatedQuestion);
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Question sauvegardée en brouillon.')),
          );
        }
        _clearForm();
      });
    }
  }

  void _envoyerQuestion() {
    if (_formKey.currentState!.validate()) {
      final now = DateTime.now();
      final formattedDate = DateFormat('dd/MM/yyyy').format(now);
      final newQuestion = _QuestionItem(
        id: UniqueKey().toString().substring(0, 5),
        beneficiaire: _beneficiaireController.text, 
        categorie: _selectedCategorie,
        sousCategorie: _selectedSousCategorie,
        titre: _titreController.text.isNotEmpty ? _titreController.text : 'En validation (${_enCoursValidationQuestions.length + 1})',
        description: _descriptionController.text, 
        pieceJointe: _pieceJointe,
        informerBeneficiaire: _informerBeneficiaire, 
        dateDemande: formattedDate,
        statut: 'En cours de validation',
      );
      setState(() {
        _enCoursValidationQuestions.add(newQuestion);
        _clearForm();
      });
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Question envoyée pour validation.')),
      );
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
   String? _editingQuestionId;
 void _editQuestion(_QuestionItem question) {
    setState(() {
      // Populate form fields with the question's data
      _beneficiaireController.text = question.beneficiaire;
      _selectedCategorie = question.categorie;
      _selectedSousCategorie = question.sousCategorie;
      _titreController.text = question.titre;
      _descriptionController.text = question.description;
      _pieceJointe = question.pieceJointe;
      _informerBeneficiaire = question.informerBeneficiaire;

      // Optionally, you might want to keep track of the question being edited
      // to update it later in the _sauvegarderQuestion function.
      // For example: _editingQuestionId = question.id;
    });
  }

  void _deleteBrouillonQuestion(_QuestionItem question) {
    setState(() {
      _brouillonQuestions.remove(question);
    });
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text('Brouillon "${question.titre}" supprimé.')),
    );
  }

  void _cancelValidationQuestion(_QuestionItem question) {
    setState(() {
      _enCoursValidationQuestions.remove(question);
      final now = DateTime.now();
      final formattedDate = DateFormat('dd/MM/yyyy').format(now);
      _brouillonQuestions.add(
        _QuestionItem(
          id: question.id,
          beneficiaire: question.beneficiaire, 
          categorie: question.categorie,
          sousCategorie: question.sousCategorie,
          titre: question.titre,
          description: question.description, 
          pieceJointe: question.pieceJointe,
          informerBeneficiaire: question.informerBeneficiaire,
          dateDemande: formattedDate,
          statut: 'Brouillon',
        ),
      );
    });
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text('Question "${question.titre}" retirée de la validation.')),
    );
  }

  void _viewQuestion(_QuestionItem question) {
    showDialog(
      context: context,
      builder: (BuildContext context) {
        return AlertDialog(
          title: Text('Détails de la Question'),
          content: SingleChildScrollView(
            child: ListBody(
              children: <Widget>[
                Text('ID: ${question.id}'),
                Text('Titre: ${question.titre}'),
                Text('Date de la demande: ${question.dateDemande}'),
                Text('Statut: ${question.statut}'),
                // You would likely want to show more details here.
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
      body: SingleChildScrollView(
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
    padding: EdgeInsets.zero, // Remove default padding
    backgroundColor: Colors.transparent, // Make background transparent
    shadowColor: Colors.transparent, // Remove shadow if needed
    shape: RoundedRectangleBorder(
      borderRadius: BorderRadius.circular(8),
    ),
  ),
  child: Ink(
    decoration: BoxDecoration(
      gradient: LinearGradient(
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
  onPressed: _sauvegarderQuestion,
  style: ElevatedButton.styleFrom(
    padding: EdgeInsets.zero, // Remove default padding
    backgroundColor: Colors.transparent, // Make background transparent
    shadowColor: Colors.transparent, // Remove shadow if needed
    shape: RoundedRectangleBorder(
      borderRadius: BorderRadius.circular(8),
    ),
  ),
  child: Ink(
    decoration: BoxDecoration(
      gradient: LinearGradient(
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
  onPressed: _envoyerQuestion,
  style: ElevatedButton.styleFrom(
    padding: EdgeInsets.zero, // Remove default padding
    backgroundColor: Colors.transparent, // Make background transparent
    shadowColor: Colors.transparent, // Remove shadow if needed
    shape: RoundedRectangleBorder(
      borderRadius: BorderRadius.circular(8),
    ),
  ),
  child: Ink(
    decoration: BoxDecoration(
      gradient: LinearGradient(
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
)

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
              ].whereType<Widget>().toList(), // Filter out null if lists are empty
            ),
            const SizedBox(height: 20),
            const ExpansionTile(
              title: Text('Historique', style: TextStyle(fontWeight: FontWeight.bold)),
              children: [
                Padding(padding: EdgeInsets.all(16.0), child: Text('L\'historique sera affiché ici.')),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildEnCoursSection({
    required String title,
    required List<_QuestionItem> questions,
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
          DataTable(
            columnSpacing: 16,
            horizontalMargin: 16,
            columns: const [
              DataColumn(label: Text('N°')),
              DataColumn(label: Expanded(child: Text('TITRE'))),
              DataColumn(label: Expanded(child: Text('CATÉGORIE'))), 
              DataColumn(label: Expanded(child: Text('SOUS-CATÉGORIE'))),
              DataColumn(label: Text('DEMANDÉE LE')),
              DataColumn(label: Text('STATUT')),
              DataColumn(label: Text('ACTION')),
            ],
            rows: questions.map((question) {
              return DataRow(cells: [
                DataCell(Text(question.id)),
                DataCell(
                  Expanded(
                  child : Text (
                    question.titre,
                    overflow: TextOverflow.ellipsis,
                    ),
                  ),
                    ),
                     DataCell(
                  Expanded(
                    child: Text(
                      question.categorie ?? '', // Handle potential null values
                      overflow: TextOverflow.ellipsis,
                    ),
                  ),
                ),
                DataCell(
                  Expanded(
                    child: Text(
                      question.sousCategorie ?? '', // Handle potential null values
                      overflow: TextOverflow.ellipsis,
                    ),
                  ),
                ),
                DataCell(Text(question.dateDemande)),
                DataCell(Text(question.statut)),
                DataCell(
                  Row(
                    children: [
                      IconButton(
                        icon: const Icon(Icons.edit, color: purpleCent),
                        onPressed: () => _editQuestion(question),
                      ),
                      IconButton(
                        icon: Icon(isBrouillon ? Icons.delete : Icons.search, color: purpleCent),
                        onPressed: isBrouillon
                            ? () => _deleteBrouillonQuestion(question)
                            : () => _viewQuestion(question),
                      ),
                      if (!isBrouillon)
                        IconButton(
                          icon: const Icon(Icons.cancel_outlined, color: Colors.redAccent),
                          onPressed: () => _cancelValidationQuestion(question),
                        ),
                    ],
                  ),
                ),
              ]);
            }).toList(),
          ),
      ],
    );
  }

 
}
class _QuestionItem {
  final String id;
  String beneficiaire;
  String? categorie;
  String? sousCategorie;
  String titre;
  String description;
  File? pieceJointe; // Store the File object
  bool informerBeneficiaire;
  final String dateDemande;
  String statut;

  _QuestionItem({
    required this.id,
    required this.beneficiaire,
    this.categorie,
    this.sousCategorie,
    required this.titre,
    required this.description,
    this.pieceJointe,
    required this.informerBeneficiaire,
    required this.dateDemande,
    required this.statut,
  });
}