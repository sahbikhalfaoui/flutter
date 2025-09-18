import 'package:flutter/material.dart';
import 'CalendarPage.dart'; 
import 'TaskGroup/CongePage.dart';
import 'TaskGroup/QuestionsRH.dart';
import 'package:font_awesome_flutter/font_awesome_flutter.dart';
import 'package:google_nav_bar/google_nav_bar.dart';
import 'ProfilePage.dart';
import 'services/api_service.dart';
import 'models/user.dart';

class HomePage extends StatefulWidget {
  const HomePage({super.key});
  
  @override
  _HomePageState createState() => _HomePageState();
}

class _HomePageState extends State<HomePage> {
 User? currentUser;
  final TextEditingController _searchController = TextEditingController();
  int _selectedIndex = 0; // Track the currently selected index for the bottom nav
  List<TaskGroup> allTaskGroups = [
    TaskGroup(
        title: "Mes congés",
        progress: 0.7,
        bgColor: const Color.fromARGB(255, 255, 253, 250),
        imagePath: "lib/assets/images.jpg",
        ),
    TaskGroup(
        title: "Mes questions RH",
        progress: 0.52,
        bgColor: const Color.fromARGB(255, 255, 253, 250),
        imagePath: "lib/assets/images.jpg",
        ),
    TaskGroup(title: "Le planning de mes collégues",  progress: 0.87, bgColor: const Color.fromARGB(255, 255, 253, 250) ,imagePath: "lib/assets/images.jpg" ),
    TaskGroup(title: "Mes attestations",  progress: 0.87, bgColor: const Color.fromARGB(255, 255, 253, 250) ,imagePath: "lib/assets/images.jpg" ),
    TaskGroup(title: "Je suis malade",  progress: 0.87, bgColor: const Color.fromARGB(255, 255, 253, 250) ,imagePath: "lib/assets/images.jpg" ),
    TaskGroup(title: "Mon mode de transport",  progress: 0.87, bgColor: const Color.fromARGB(255, 255, 253, 250) ,imagePath: "lib/assets/images.jpg" ),
    TaskGroup(title: "Mon déménagement",  progress: 0.87, bgColor: const Color.fromARGB(255, 255, 253, 250) ,imagePath: "lib/assets/images.jpg" ),
    TaskGroup(title: "Mon changement de situation familliale",  progress: 0.87, bgColor: const Color.fromARGB(255, 255, 253, 250) ,imagePath: "lib/assets/images.jpg" ),
    TaskGroup(title: "Mon changement de composition familliale",  progress: 0.87, bgColor: const Color.fromARGB(255, 255, 253, 250) ,imagePath: "lib/assets/images.jpg" ),
    TaskGroup(title: "Ma demande d'acompte",  progress: 0.87, bgColor: const Color.fromARGB(255, 255, 253, 250) ,imagePath: "lib/assets/images.jpg" ),
    
  ];
  List<TaskGroup> filteredTaskGroups = [];

  @override
void initState() {
  super.initState();
  filteredTaskGroups = allTaskGroups;
  _loadUserProfile();
}

void _loadUserProfile() async {
  try {
    final response = await ApiService.getProfile();
    setState(() {
      currentUser = User.fromJson(response);
    });
  } catch (e) {
    print('Error loading profile: $e');
  }
}
  void _filterTasks(String query) {
    setState(() {
      filteredTaskGroups = allTaskGroups.where((taskGroup) =>
        taskGroup.title.toLowerCase().contains(query.toLowerCase())
      ).toList();
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        title: const Text("Welcome Back !", style: TextStyle(color: Colors.black)),
        actions: [
          IconButton(
            icon: const Icon(Icons.notifications, color: Colors.black),
            onPressed: () {},
          )
        ],
      ),
      body: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text("In Progress", style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
            const SizedBox(height: 40),
            SizedBox(
              height: 100,
              child: SingleChildScrollView(
                scrollDirection: Axis.horizontal,
                child: Row(
                  children: [
                    GestureDetector(
                   onTap: () {},
                   child: TaskCard(
  title: "Mon solde de congés",
  subtitle: currentUser != null ? "${currentUser!.soldeConges}J/25J" : "Chargement...",
  bgGradient: LinearGradient(
    colors: [Color(0xFF8E44AD), Color.fromARGB(255, 191, 97, 228)],
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
  ),
  progressColor: Colors.white,
),

                   ),
                  

                    GestureDetector(
                      onTap: () {},
                      child: TaskCard(
  title: "Mes autres absences",
  subtitle: currentUser != null ? "${currentUser!.autresAbsences}J pris" : "Chargement...",
  bgColor: Color(0xFF8E44AD),
  progressColor: Colors.white,
),
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 60),
            TextField(
              controller: _searchController,
              onChanged: _filterTasks,
              decoration: InputDecoration(
                hintText: "Search task groups...",
                prefixIcon: Icon(FontAwesomeIcons.arrowDownShortWide, color: Color(0xFF8E44AD),),
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(10),
                  borderSide: BorderSide.none,
                ),
                filled: true,
                fillColor: Colors.grey[200],
              ),
            ),
            const SizedBox(height: 20),
            Expanded(
              child: ListView.builder(
                itemCount: filteredTaskGroups.length,
                itemBuilder: (context, index) {
                  final task =filteredTaskGroups[index];

                 return TaskGroup(
                  title: task.title, 
                  progress: task.progress, 
                  bgColor: task.bgColor, 
                  imagePath: task.imagePath,
                  onTap: () {
if (task.title == "Mes congés") {
        Navigator.push(context, MaterialPageRoute(builder: (_) =>  CongesPage()));
       }
         else if (task.title == "Mes questions RH") {
         Navigator.push(context, MaterialPageRoute(builder: (_) => QuestionsRHPage()));
        }  //else if (task.title == "Le planning de mes collégues") {
      //   Navigator.push(context, MaterialPageRoute(builder: (_) => const PlanningColleguesPage()));
      // } 
                  },
                  );
                },
              ),
            ),
          ],
        ),
      ),
      bottomNavigationBar: Builder(
        builder: (context) {
          return GNav(
            color: Color(0xFF8E44AD),
            activeColor: Color(0xFF8E44AD),
            tabBackgroundColor: const Color.fromARGB(255, 240, 234, 255),
            gap: 8,
            selectedIndex: _selectedIndex, // Pass the current index here
            onTabChange: (index) {
              setState(() {
                _selectedIndex = index; // Update the index when a tab is selected
              });

              if (index == 1) { // If Calendar tab is selected, navigate to CalendarPage
                Navigator.pushNamed(context, '/calendar');
              } else if (index == 2) { // If Folder tab is selected, navigate to FolderPage
                Navigator.pushNamed(context, '/folder');
              } else if (index == 3) { // If Profile tab is selected, navigate to ProfilePage
                Navigator.pushNamed(context, '/profile');
              }
            },
            tabs: [
              GButton(
                icon: Icons.home,
                text: "Home",
                onPressed: () {},
              ),
              GButton(
                icon: Icons.calendar_month,
                text: "Calendar",
                onPressed: () {},
              ),
              GButton(
                icon: Icons.folder,
                text: "Folder",
                onPressed: () {},
              ),
              GButton(
                icon: Icons.person,
                text: "Profile",
                onPressed: () {},
              ),
            ],
          );
        },
      ),
    );
  }
}

class TaskCard extends StatelessWidget {
  final String title;
  final String subtitle;
  final Color? bgColor;
  final Gradient? bgGradient;
  final Color progressColor;

  const TaskCard({
     super.key,
    required this.title,
    required this.subtitle,
    this.bgColor,
    this.bgGradient,
    required this.progressColor,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      width: 180,
      margin: const EdgeInsets.only(right: 10),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: bgColor,
        borderRadius: BorderRadius.circular(15),
        boxShadow: [BoxShadow(color: Colors.black12, blurRadius: 5)],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(title, style: const TextStyle(fontSize: 14, fontWeight: FontWeight.bold , color: Colors.white,),),
          const SizedBox(height: 20,),
          Text(subtitle, style: const TextStyle(fontSize: 16,fontWeight: FontWeight.bold, color: Colors.white70),),
        ],
      ),
    );
  }
}

class TaskGroup extends StatelessWidget {
  final String title;
  final double progress;
  final Color bgColor;
  final imagePath;
  final VoidCallback? onTap;

  const TaskGroup({super.key, required this.title, required this.progress, required this.bgColor, required this.imagePath, this.onTap});

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child : Container(
      margin: const EdgeInsets.only(bottom: 10),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: bgColor,
        borderRadius: BorderRadius.circular(15),
        boxShadow: [BoxShadow(color: Colors.black12, blurRadius: 5)],
      ),
      child: Row(
        children: [
          ClipRRect(
            borderRadius: BorderRadius.circular(20),
            child: Image.asset(imagePath,width: 40,height: 40,),
          ),
          const SizedBox(width: 20),
          Expanded( // Ensures text doesn't overflow
            child: Text(
              title,
              style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
              overflow: TextOverflow.ellipsis,
              maxLines: 1,
            ),
          ),
        ],
      ),
    ),
    );
  }
}
