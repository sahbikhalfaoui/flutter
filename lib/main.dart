import 'package:flutter/material.dart';
import 'HomePage.dart'; 
import 'SplashScreen.dart';
import 'LoginPage.dart';
import 'CalendarPage.dart';
import 'ProfilePage.dart';
import 'FolderPage.dart';
import 'AdminPage.dart';
// import 'package:flutter_localizations/flutter_localizations.dart';

void main() {
  runApp(const MyApp());
}

class MyApp extends StatelessWidget {
  const MyApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      // localizationsDelegates: const [
      //   S.delegate,
      //   GlobalMaterialLocalizations.delegate,
      //   GlobalWidgetsLocalizations.delegate,
      //   GlobalCupertinoLocalizations.delegate
      // ],
      // supportedLocales: S.delegate.supportedLocales,
      // locale: _locale,
     debugShowCheckedModeBanner: false,
       home: const SplashScreen(), // Start here
      routes: {
        '/login': (context) =>  LoginPage(),
        '/homepage': (context) => const HomePage(),
        '/profile': (context) => ProfilePage(),
         '/admin': (context) => const AdminPage(),
        '/folder': (context) => const Folderpage(),
        '/calendar': (context) => const Calendarpage(),
      },
    );
  }
}
