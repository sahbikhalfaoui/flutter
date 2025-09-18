import 'package:flutter/material.dart';
import 'services/api_service.dart';
import 'models/user.dart';

class AdminPage extends StatefulWidget {
  const AdminPage({super.key});

  @override
  _AdminPageState createState() => _AdminPageState();
}

class _AdminPageState extends State<AdminPage> with TickerProviderStateMixin {
  late TabController _tabController;
  List<dynamic> conges = [];
  List<dynamic> questions = [];
  List<dynamic> users = [];
  bool isLoading = true;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 3, vsync: this);
    _loadData();
  }

  Future<void> _loadData() async {
    setState(() => isLoading = true);
    try {
      final congesData = await ApiService.getConges();
      final questionsData = await ApiService.getQuestions();
      final usersData = await ApiService.getUsers();
      
      setState(() {
        conges = congesData;
        questions = questionsData;
        users = usersData;
        isLoading = false;
      });
    } catch (e) {
      setState(() => isLoading = false);
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Erreur de chargement: $e')),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Administration RH', 
          style: TextStyle(fontWeight: FontWeight.bold)),
        backgroundColor: const Color(0xFF8E44AD),
        foregroundColor: Colors.white,
        elevation: 0,
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: _loadData,
          ),
          IconButton(
            icon: const Icon(Icons.logout),
            onPressed: () {
              ApiService.clearToken();
              Navigator.of(context).pushReplacementNamed('/login');
            },
          ),
        ],
        bottom: TabBar(
          controller: _tabController,
          indicatorColor: Colors.white,
          labelColor: Colors.white,
          unselectedLabelColor: Colors.white70,
          tabs: const [
            Tab(icon: Icon(Icons.event_available), text: 'Congés'),
            Tab(icon: Icon(Icons.help_outline), text: 'Questions RH'),
            Tab(icon: Icon(Icons.people), text: 'Utilisateurs'),
          ],
        ),
      ),
      body: isLoading
          ? const Center(child: CircularProgressIndicator(
              color: Color(0xFF8E44AD),
            ))
          : TabBarView(
              controller: _tabController,
              children: [
                _buildCongesTab(),
                _buildQuestionsTab(),
                _buildUsersTab(),
              ],
            ),
    );
  }

  Widget _buildCongesTab() {
    final pendingConges = conges.where((c) => c['statut'] == 'en_attente').toList();
    
    return Column(
      children: [
        Container(
          width: double.infinity,
          padding: const EdgeInsets.all(16),
          color: const Color(0xFF8E44AD).withOpacity(0.1),
          child: Text(
            '${pendingConges.length} demande(s) en attente',
            style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
          ),
        ),
        Expanded(
          child: ListView.builder(
            padding: const EdgeInsets.all(16),
            itemCount: conges.length,
            itemBuilder: (context, index) {
              final conge = conges[index];
              return _buildCongeCard(conge);
            },
          ),
        ),
      ],
    );
  }

  Widget _buildCongeCard(Map<String, dynamic> conge) {
    final status = conge['statut'];
    Color statusColor = status == 'en_attente' 
        ? Colors.orange 
        : status == 'approuve' 
            ? Colors.green 
            : Colors.red;

    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      elevation: 2,
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        conge['userId']['nom'],
                        style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
                      ),
                      Text(
                        conge['typeConge'],
                        style: TextStyle(color: Colors.grey[600]),
                      ),
                    ],
                  ),
                ),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
                  decoration: BoxDecoration(
                    color: statusColor.withOpacity(0.1),
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: statusColor.withOpacity(0.3)),
                  ),
                  child: Text(
                    status.toUpperCase(),
                    style: TextStyle(
                      color: statusColor,
                      fontWeight: FontWeight.bold,
                      fontSize: 12,
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 8),
            Text('Dates: ${(conge['dates'] as List).length} jour(s)'),
            if (conge['justification'] != null) ...[
              const SizedBox(height: 4),
              Text('Justification: ${conge['justification']}'),
            ],
            if (status == 'en_attente') ...[
              const SizedBox(height: 12),
              Row(
                children: [
                  Expanded(
                    child: ElevatedButton.icon(
                      onPressed: () => _updateCongeStatus(conge['_id'], 'approuve'),
                      icon: const Icon(Icons.check),
                      label: const Text('Approuver'),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: Colors.green,
                        foregroundColor: Colors.white,
                      ),
                    ),
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: ElevatedButton.icon(
                      onPressed: () => _updateCongeStatus(conge['_id'], 'refuse'),
                      icon: const Icon(Icons.close),
                      label: const Text('Refuser'),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: Colors.red,
                        foregroundColor: Colors.white,
                      ),
                    ),
                  ),
                ],
              ),
            ],
          ],
        ),
      ),
    );
  }

  Widget _buildQuestionsTab() {
    final pendingQuestions = questions.where((q) => q['statut'] == 'en_cours_validation').toList();
    
    return Column(
      children: [
        Container(
          width: double.infinity,
          padding: const EdgeInsets.all(16),
          color: const Color(0xFF8E44AD).withOpacity(0.1),
          child: Text(
            '${pendingQuestions.length} question(s) en attente',
            style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
          ),
        ),
        Expanded(
          child: ListView.builder(
            padding: const EdgeInsets.all(16),
            itemCount: questions.length,
            itemBuilder: (context, index) {
              final question = questions[index];
              return _buildQuestionCard(question);
            },
          ),
        ),
      ],
    );
  }

  Widget _buildQuestionCard(Map<String, dynamic> question) {
    final status = question['statut'];
    Color statusColor = status == 'en_cours_validation' 
        ? Colors.orange 
        : status == 'repondu' 
            ? Colors.green 
            : Colors.grey;

    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      elevation: 2,
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        question['userId']['nom'],
                        style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
                      ),
                      Text(
                        question['categorie'],
                        style: TextStyle(color: Colors.grey[600]),
                      ),
                    ],
                  ),
                ),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
                  decoration: BoxDecoration(
                    color: statusColor.withOpacity(0.1),
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: statusColor.withOpacity(0.3)),
                  ),
                  child: Text(
                    status.toUpperCase(),
                    style: TextStyle(
                      color: statusColor,
                      fontWeight: FontWeight.bold,
                      fontSize: 12,
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 8),
            Text(
              question['titre'],
              style: const TextStyle(fontWeight: FontWeight.w600),
            ),
            const SizedBox(height: 4),
            Text(
              question['description'],
              maxLines: 2,
              overflow: TextOverflow.ellipsis,
            ),
            if (question['reponse'] != null) ...[
              const SizedBox(height: 8),
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: Colors.green.withOpacity(0.1),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      'Réponse:',
                      style: TextStyle(fontWeight: FontWeight.bold),
                    ),
                    Text(question['reponse']),
                  ],
                ),
              ),
            ],
            if (status == 'en_cours_validation') ...[
              const SizedBox(height: 12),
              ElevatedButton.icon(
                onPressed: () => _showAnswerDialog(question),
                icon: const Icon(Icons.reply),
                label: const Text('Répondre'),
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFF8E44AD),
                  foregroundColor: Colors.white,
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }

  Widget _buildUsersTab() {
    return Column(
      children: [
        Container(
          width: double.infinity,
          padding: const EdgeInsets.all(16),
          color: const Color(0xFF8E44AD).withOpacity(0.1),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                '${users.length} utilisateur(s)',
                style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
              ),
              ElevatedButton.icon(
                onPressed: _showAddUserDialog,
                icon: const Icon(Icons.add),
                label: const Text('Ajouter'),
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFF8E44AD),
                  foregroundColor: Colors.white,
                ),
              ),
            ],
          ),
        ),
        Expanded(
          child: ListView.builder(
            padding: const EdgeInsets.all(16),
            itemCount: users.length,
            itemBuilder: (context, index) {
              final user = users[index];
              return _buildUserCard(user);
            },
          ),
        ),
      ],
    );
  }

  Widget _buildUserCard(Map<String, dynamic> user) {
    Color roleColor = user['role'] == 'hr' 
        ? const Color(0xFF8E44AD)
        : user['role'] == 'manager' 
            ? Colors.blue 
            : Colors.green;

    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      elevation: 2,
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          children: [
            Row(
              children: [
                CircleAvatar(
                  backgroundColor: roleColor.withOpacity(0.1),
                  child: Text(
                    user['nom'][0].toUpperCase(),
                    style: TextStyle(
                      color: roleColor,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        user['nom'],
                        style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
                      ),
                      Text(user['email']),
                      Text('ID: ${user['identifiant']}'),
                    ],
                  ),
                ),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                  decoration: BoxDecoration(
                    color: roleColor.withOpacity(0.1),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Text(
                    user['role'].toUpperCase(),
                    style: TextStyle(
                      color: roleColor,
                      fontWeight: FontWeight.bold,
                      fontSize: 12,
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),
            Row(
              children: [
                Expanded(
                  child: Text('Congés: ${user['soldeConges']}/25'),
                ),
                Expanded(
                  child: Text('Autres: ${user['autresAbsences']}'),
                ),
              ],
            ),
            const SizedBox(height: 12),
            Row(
              children: [
                Expanded(
                  child: OutlinedButton.icon(
                    onPressed: () => _showEditUserDialog(user),
                    icon: const Icon(Icons.edit),
                    label: const Text('Modifier'),
                    style: OutlinedButton.styleFrom(
                      foregroundColor: const Color(0xFF8E44AD),
                    ),
                  ),
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: OutlinedButton.icon(
                    onPressed: () => _deleteUser(user['_id']),
                    icon: const Icon(Icons.delete),
                    label: const Text('Supprimer'),
                    style: OutlinedButton.styleFrom(
                      foregroundColor: Colors.red,
                    ),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Future<void> _updateCongeStatus(String id, String status) async {
    try {
      await ApiService.updateCongeStatus(id, status);
      _loadData();
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Congé ${status == 'approuve' ? 'approuvé' : 'refusé'}')),
      );
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Erreur: $e')),
      );
    }
  }

  void _showAnswerDialog(Map<String, dynamic> question) {
    final answerController = TextEditingController();
    
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Répondre à la question'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Question: ${question['titre']}',
              style: const TextStyle(fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 8),
            Text(question['description']),
            const SizedBox(height: 16),
            TextField(
              controller: answerController,
              maxLines: 4,
              decoration: const InputDecoration(
                labelText: 'Votre réponse',
                border: OutlineInputBorder(),
              ),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Annuler'),
          ),
          ElevatedButton(
            onPressed: () async {
              if (answerController.text.isNotEmpty) {
                try {
                  await ApiService.answerQuestion(question['_id'], answerController.text);
                  Navigator.pop(context);
                  _loadData();
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(content: Text('Réponse envoyée')),
                  );
                } catch (e) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(content: Text('Erreur: $e')),
                  );
                }
              }
            },
            style: ElevatedButton.styleFrom(
              backgroundColor: const Color(0xFF8E44AD),
              foregroundColor: Colors.white,
            ),
            child: const Text('Envoyer'),
          ),
        ],
      ),
    );
  }

  void _showAddUserDialog() {
    final formKey = GlobalKey<FormState>();
    final identifiantController = TextEditingController();
    final motDePasseController = TextEditingController();
    final nomController = TextEditingController();
    final emailController = TextEditingController();
    String selectedRole = 'collaborateur';

    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Ajouter un utilisateur'),
        content: Form(
          key: formKey,
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              TextFormField(
                controller: identifiantController,
                decoration: const InputDecoration(labelText: 'Identifiant'),
                validator: (value) => value?.isEmpty ?? true ? 'Requis' : null,
              ),
              TextFormField(
                controller: motDePasseController,
                decoration: const InputDecoration(labelText: 'Mot de passe'),
                obscureText: true,
                validator: (value) => value?.isEmpty ?? true ? 'Requis' : null,
              ),
              TextFormField(
                controller: nomController,
                decoration: const InputDecoration(labelText: 'Nom'),
                validator: (value) => value?.isEmpty ?? true ? 'Requis' : null,
              ),
              TextFormField(
                controller: emailController,
                decoration: const InputDecoration(labelText: 'Email'),
                validator: (value) => value?.isEmpty ?? true ? 'Requis' : null,
              ),
              const SizedBox(height: 16),
              DropdownButtonFormField<String>(
                value: selectedRole,
                decoration: const InputDecoration(labelText: 'Rôle'),
                items: const [
                  DropdownMenuItem(value: 'collaborateur', child: Text('Collaborateur')),
                  DropdownMenuItem(value: 'manager', child: Text('Manager')),
                  DropdownMenuItem(value: 'hr', child: Text('HR')),
                ],
                onChanged: (value) => selectedRole = value!,
              ),
            ],
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Annuler'),
          ),
          ElevatedButton(
            onPressed: () async {
              if (formKey.currentState!.validate()) {
                try {
                  await ApiService.createUser({
                    'identifiant': identifiantController.text,
                    'motDePasse': motDePasseController.text,
                    'nom': nomController.text,
                    'email': emailController.text,
                    'role': selectedRole,
                  });
                  Navigator.pop(context);
                  _loadData();
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(content: Text('Utilisateur créé')),
                  );
                } catch (e) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(content: Text('Erreur: $e')),
                  );
                }
              }
            },
            style: ElevatedButton.styleFrom(
              backgroundColor: const Color(0xFF8E44AD),
              foregroundColor: Colors.white,
            ),
            child: const Text('Créer'),
          ),
        ],
      ),
    );
  }

  void _showEditUserDialog(Map<String, dynamic> user) {
    final formKey = GlobalKey<FormState>();
    final nomController = TextEditingController(text: user['nom']);
    final emailController = TextEditingController(text: user['email']);
    final soldeCongesController = TextEditingController(text: user['soldeConges'].toString());
    String selectedRole = user['role'];

    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Modifier l\'utilisateur'),
        content: Form(
          key: formKey,
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              TextFormField(
                controller: nomController,
                decoration: const InputDecoration(labelText: 'Nom'),
                validator: (value) => value?.isEmpty ?? true ? 'Requis' : null,
              ),
              TextFormField(
                controller: emailController,
                decoration: const InputDecoration(labelText: 'Email'),
                validator: (value) => value?.isEmpty ?? true ? 'Requis' : null,
              ),
              TextFormField(
                controller: soldeCongesController,
                decoration: const InputDecoration(labelText: 'Solde congés'),
                keyboardType: TextInputType.number,
                validator: (value) => value?.isEmpty ?? true ? 'Requis' : null,
              ),
              const SizedBox(height: 16),
              DropdownButtonFormField<String>(
                value: selectedRole,
                decoration: const InputDecoration(labelText: 'Rôle'),
                items: const [
                  DropdownMenuItem(value: 'collaborateur', child: Text('Collaborateur')),
                  DropdownMenuItem(value: 'manager', child: Text('Manager')),
                  DropdownMenuItem(value: 'hr', child: Text('HR')),
                ],
                onChanged: (value) => selectedRole = value!,
              ),
            ],
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Annuler'),
          ),
          ElevatedButton(
            onPressed: () async {
              if (formKey.currentState!.validate()) {
                try {
                  await ApiService.updateUser(user['_id'], {
                    'nom': nomController.text,
                    'email': emailController.text,
                    'role': selectedRole,
                    'soldeConges': int.parse(soldeCongesController.text),
                  });
                  Navigator.pop(context);
                  _loadData();
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(content: Text('Utilisateur modifié')),
                  );
                } catch (e) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(content: Text('Erreur: $e')),
                  );
                }
              }
            },
            style: ElevatedButton.styleFrom(
              backgroundColor: const Color(0xFF8E44AD),
              foregroundColor: Colors.white,
            ),
            child: const Text('Modifier'),
          ),
        ],
      ),
    );
  }

  Future<void> _deleteUser(String userId) async {
    final confirm = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Confirmer la suppression'),
        content: const Text('Êtes-vous sûr de vouloir supprimer cet utilisateur ?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('Annuler'),
          ),
          ElevatedButton(
            onPressed: () => Navigator.pop(context, true),
            style: ElevatedButton.styleFrom(
              backgroundColor: Colors.red,
              foregroundColor: Colors.white,
            ),
            child: const Text('Supprimer'),
          ),
        ],
      ),
    );

    if (confirm == true) {
      try {
        await ApiService.deleteUser(userId);
        _loadData();
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Utilisateur supprimé')),
        );
      } catch (e) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Erreur: $e')),
        );
      }
    }
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }
}