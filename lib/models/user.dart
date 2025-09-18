class User {
  final String id;
  final String identifiant;
  final String nom;
  final String email;
  final String role;
  final int soldeConges;
  final int autresAbsences;

  User({
    required this.id,
    required this.identifiant,
    required this.nom,
    required this.email,
    required this.role,
    required this.soldeConges,
    required this.autresAbsences,
  });

  factory User.fromJson(Map<String, dynamic> json) {
    return User(
      id: json['id'] ?? json['_id'],
      identifiant: json['identifiant'],
      nom: json['nom'],
      email: json['email'],
      role: json['role'],
      soldeConges: json['soldeConges'] ?? 0,
      autresAbsences: json['autresAbsences'] ?? 0,
    );
  }
}