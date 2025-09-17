import 'package:flutter/material.dart';
import 'package:font_awesome_flutter/font_awesome_flutter.dart';

class ProfilePage extends StatefulWidget {
  @override
  _ProfilePageState createState() => _ProfilePageState();
}

class _ProfilePageState extends State<ProfilePage> {
  String employeeName = "John Doe";
  int paperworkCount = 3;
  List<String> roles = ["Gestionnaire", "Manager", "Collaborateur"];
  String selectedRole = "Manager"; // Default role selection

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: PreferredSize(
        preferredSize: Size.fromHeight(60), // Smaller AppBar height
        child: AppBar(
          automaticallyImplyLeading: false,
          backgroundColor: Colors.deepPurpleAccent,
          elevation: 10,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.vertical(bottom: Radius.circular(15)),
          ),
          title: Row(
            children: [
              IconButton(
                icon: Icon(
                  FontAwesomeIcons.arrowLeft,
                  color: Colors.white,
                  size: 25,
                ),
                onPressed: () {
                  Navigator.pop(context); // Go back to the previous screen
                },
              ),
              SizedBox(width: 10),
              Text(
                "Profile",
                style: TextStyle(
                  fontSize: 24,
                  fontWeight: FontWeight.bold,
                  color: Colors.white,
                ),
              ),
            ],
          ),
        ),
      ),
      body: Padding(
        padding: const EdgeInsets.all(20.0),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.start,
          crossAxisAlignment: CrossAxisAlignment.center,
          children: [
            // Profile Picture
            CircleAvatar(
              radius: 50,
              backgroundImage: AssetImage("lib/assets/profile.jpg"), // Change this to the user's actual profile image
            ),
            SizedBox(height: 15), // Adjusted space for better centering

            // Employee Name
            Text(
              employeeName,
              style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
            ),
            SizedBox(height: 10),

            // Paperwork count with icon
            Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Icon(FontAwesomeIcons.folderClosed, color: Colors.deepPurpleAccent),
                SizedBox(width: 5),
                Text("$paperworkCount "),
              ],
            ),
            SizedBox(height: 20),

            // Mon Espace Section
            Text(
              "Mon Espace",
              style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
            ),
            SizedBox(height: 10),

            // Role Selection Icons
            Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: roles.map((role) {
                return GestureDetector(
                  onTap: () {
                    setState(() {
                      selectedRole = role;
                    });
                  },
                  child: Column(
                    children: [
                      Icon(
                        FontAwesomeIcons.circleUser,
                        color: selectedRole == role ? Colors.deepPurpleAccent : Colors.grey,
                        size: 20,
                      ),
                      Text(role, style: TextStyle(color: selectedRole == role ? Colors.deepPurpleAccent : Colors.grey)),
                    ],
                  ),
                );
              }).toList(),
            ),

            SizedBox(height: 20),

            // Selected Role Display
            Text(
              "Espace actuel: $selectedRole",
              style: TextStyle(fontSize: 16, fontWeight: FontWeight.w500, color: Colors.deepPurpleAccent),
            ),
          ],
        ),
      ),
    );
  }
}
