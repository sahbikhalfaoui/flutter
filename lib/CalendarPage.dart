
import 'package:flutter/material.dart';
import 'package:font_awesome_flutter/font_awesome_flutter.dart';
import 'package:google_nav_bar/google_nav_bar.dart';



class Calendarpage extends StatelessWidget {
  const Calendarpage({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text("Mes congés")),
      body: const Center(child: Text("Contenu de Mes congés")),
    );
  }
}



// Repeat for all other pages...
