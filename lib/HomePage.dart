// lib/HomePage.dart (Updated with notifications)
import 'package:flutter/material.dart';
import 'CalendarPage.dart'; 
import 'TaskGroup/CongePage.dart';
import 'TaskGroup/QuestionsRH.dart';
import 'package:font_awesome_flutter/font_awesome_flutter.dart';
import 'package:google_nav_bar/google_nav_bar.dart';
import 'ProfilePage.dart';
import 'services/api_service.dart';
import 'services/notification_service.dart';
import 'models/user.dart';
import 'NotificationsPage.dart';

class HomePage extends StatefulWidget {
  const HomePage({super.key});
  
  @override
  _HomePageState createState() => _HomePageState();
}

class _HomePageState extends State<HomePage> {
  User? currentUser;
  final TextEditingController _searchController = TextEditingController();
  int _selectedIndex = 0;
  int _unreadNotificationsCount = 0;
  
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
    _initializeNotifications();
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

  void _initializeNotifications() async {
    await NotificationService.instance.initialize();
    await NotificationService.instance.connectWebSocket();
    
    // Listen to unread count changes
    NotificationService.instance.addUnreadCountListener((count) {
      if (mounted) {
        setState(() {
          _unreadNotificationsCount = count;
        });
      }
    });
    
    // Load initial unread count
    setState(() {
      _unreadNotificationsCount = NotificationService.instance.unreadCount;
    });
  }

  @override
  void dispose() {
    NotificationService.instance.disconnectWebSocket();
    super.dispose();
  }

  void _filterTasks(String query) {
    setState(() {
      filteredTaskGroups = allTaskGroups.where((taskGroup) =>
        taskGroup.title.toLowerCase().contains(query.toLowerCase())
      ).toList();
    });
  }

  void _navigateToNotifications() {
    Navigator.push(
      context,
      MaterialPageRoute(builder: (context) => const NotificationsPage()),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        title: const Text("Welcome Back !", style: TextStyle(color: Colors.black)),
        actions: [
          Stack(
            children: [
              IconButton(
                icon: const Icon(Icons.notifications, color: Colors.black),
                onPressed: _navigateToNotifications,
              ),
              if (_unreadNotificationsCount > 0)
                Positioned(
                  right: 8,
                  top: 8,
                  child: Container(
                    padding: const EdgeInsets.all(2),
                    decoration: BoxDecoration(
                      color: Colors.red,
                      borderRadius: BorderRadius.circular(10),
                    ),
                    constraints: const BoxConstraints(
                      minWidth: 16,
                      minHeight: 16,
                    ),
                    child: Text(
                      '$_unreadNotificationsCount',
                      style: const TextStyle(
                        color: Colors.white,
                        fontSize: 10,
                        fontWeight: FontWeight.bold,
                      ),
                      textAlign: TextAlign.center,
                    ),
                  ),
                ),
            ],
          ),
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
                  final task = filteredTaskGroups[index];

                  return TaskGroup(
                    title: task.title, 
                    progress: task.progress, 
                    bgColor: task.bgColor, 
                    imagePath: task.imagePath,
                    onTap: () {
                      if (task.title == "Mes congés") {
                        Navigator.push(context, MaterialPageRoute(builder: (_) => CongesPage()));
                      }
                      else if (task.title == "Mes questions RH") {
                        Navigator.push(context, MaterialPageRoute(builder: (_) => QuestionsRHPage()));
                      }
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
            selectedIndex: _selectedIndex,
            onTabChange: (index) {
              setState(() {
                _selectedIndex = index;
              });

              if (index == 1) {
                Navigator.pushNamed(context, '/calendar');
              } else if (index == 2) {
                Navigator.pushNamed(context, '/folder');
              } else if (index == 3) {
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

// TaskCard and TaskGroup classes remain the same
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
        gradient: bgGradient,
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
          Expanded(
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