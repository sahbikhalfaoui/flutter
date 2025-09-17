
import 'package:flutter/material.dart';
import 'package:font_awesome_flutter/font_awesome_flutter.dart';
import 'package:google_nav_bar/google_nav_bar.dart';



class Folderpage extends StatelessWidget {
  const Folderpage({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text("Mes congés")),
      body: const Center(child: Text("Contenu de Mes congés")),
    );
  }
}

class QuestionsRHPage extends StatelessWidget {
  const QuestionsRHPage({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text("Mes questions RH")),
      body: const Center(child: Text("Contenu de Mes questions RH")),
    );
  }
}

// Repeat for all other pages...
