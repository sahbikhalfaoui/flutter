import 'package:flutter/material.dart';
import 'HomePage.dart';
import 'AdminPage.dart';
import 'services/api_service.dart';
import 'models/user.dart';

class LoginPage extends StatelessWidget {
  
 LoginPage({super.key});
final TextEditingController _identifiantController = TextEditingController();
final TextEditingController _motDePasseController = TextEditingController();
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.white,
      body: SingleChildScrollView(
        padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 40),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.center,
          children: [
            // Logo
            Image.asset('lib/assets/sopra-hr-software.jpeg', height: 120),

            const SizedBox(height: 24),

            // Welcome text
            Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                // Round logo
                CircleAvatar(
                  radius: 25,
                  backgroundImage: AssetImage('lib/assets/4YOU.webp'), // Your app's logo
                ),
              
              Flexible(
                child: RichText(
                  overflow: TextOverflow.ellipsis,
                  maxLines: 2,
                  textAlign: TextAlign.center,
                  text: const TextSpan(
                    style: TextStyle(color: Colors.black, fontSize: 20),
                    children: [
                      TextSpan(text: "Bienvenue sur "),
                      TextSpan(
                        text: "4YOU",
                        style: TextStyle(
                          fontWeight: FontWeight.bold,
                          color: Colors.red,
                        ),
                      ),
                      TextSpan(text: ", connectez-vous pour accéder à votre espace."),
                    ],
                  ),
                ),
              ),
              ],
            ),
            

            const SizedBox(height: 16),

            const Text(
              "Les champs indiqués par une * sont obligatoires.",
              style: TextStyle(fontSize: 13, color: Colors.grey),
            ),

            const SizedBox(height: 20),

            // Identifiant
            const Align(
              alignment: Alignment.centerLeft,
              child: Text("Votre identifiant *"),
            ),
            const SizedBox(height: 5),
           TextField(
  controller: _identifiantController,
  decoration: InputDecoration(
    border: OutlineInputBorder(),
  ),
),

            const SizedBox(height: 10),

            // Password
            const Align(
              alignment: Alignment.centerLeft,
              child: Text("Votre mot de passe *"),
            ),
            const SizedBox(height: 5),
TextField(
  controller: _motDePasseController,
  obscureText: true,
  decoration: InputDecoration(
    border: OutlineInputBorder(),
    suffixIcon: Icon(Icons.visibility),
  ),
),

            const SizedBox(height: 10),

            // Forgot password
            Align(
              alignment: Alignment.centerLeft,
              child: TextButton.icon(
                onPressed: () {},
                icon: const Icon(Icons.lock_outline, color: Colors.blue),
                label: const Text(
                  "Mot de passe oublié ?",
                  style: TextStyle(color: Colors.blue),
                ),
              ),
            ),

            const SizedBox(height: 10),

            // Language dropdown
            const Align(
              alignment: Alignment.centerLeft,
              child: Text("Votre langue *"),
            ),
            const SizedBox(height: 5),
            DropdownButtonFormField<String>(
              value: "Français",
               items: [
    DropdownMenuItem(
      value: "Français",
      child: Row(
        children: [
          Image.asset('lib/assets/france.png', width: 24, height: 24),
          const SizedBox(width: 8),
          const Text("Français"),
        ],
      )
                ),

                DropdownMenuItem(
      value: "Anglais",
      child: Row(
        children: [
          Image.asset('lib/assets/england.jpg', width: 24, height: 24),
          const SizedBox(width: 8),
          const Text("Anglais"),
        ],
      )
                ),
              ],
              onChanged: (value) {},
              decoration: const InputDecoration(
                border: OutlineInputBorder(),
              ),
            ),

            const SizedBox(height: 30),

            // Connect button
            SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                onPressed: () async {
  try {
    final response = await ApiService.login(
      _identifiantController.text,
      _motDePasseController.text,
    );
    
    if (response['token'] != null) {
      await ApiService.setToken(response['token']);
      
      // Check user role and navigate accordingly
      final userRole = response['user']['role'];
      
      if (userRole == 'hr') {
        // Navigate to AdminPage for HR users
        Navigator.pushReplacement(
          context,
          MaterialPageRoute(builder: (context) => const AdminPage()),
        );
      } else {
        // Navigate to HomePage for managers and employees
        Navigator.pushReplacement(
          context,
          MaterialPageRoute(builder: (context) => const HomePage()),
        );
      }
    } else {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(response['message'] ?? 'Erreur de connexion')),
      );
    }
  } catch (e) {
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text('Erreur de connexion au serveur')),
    );
  }
},
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFF8E44AD),
                  foregroundColor: Colors.white,
                  padding: const EdgeInsets.symmetric(vertical: 16),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(8),
                  ),
                ),
                child: const Text(
                  "Me connecter",
                  style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                ),
              ),
            ),

            const SizedBox(height: 20),

            // Demo credentials info
           
          ],
        ),
      ),
    );
  }
}