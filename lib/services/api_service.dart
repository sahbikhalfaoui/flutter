import 'dart:convert';
import 'dart:io';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';

class ApiService {
  static const String baseUrl = 'http://localhost:3000/api';
  
  static Future<String?> getToken() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getString('token');
  }
  
  static Future<void> setToken(String token) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString('token', token);
  }
  
  static Future<void> clearToken() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove('token');
  }
  
  static Future<Map<String, dynamic>> login(String identifiant, String motDePasse) async {
    final response = await http.post(
      Uri.parse('$baseUrl/login'),
      headers: {'Content-Type': 'application/json'},
      body: json.encode({'identifiant': identifiant, 'motDePasse': motDePasse}),
    );
    return json.decode(response.body);
  }
  
  static Future<Map<String, dynamic>> getProfile() async {
    final token = await getToken();
    final response = await http.get(
      Uri.parse('$baseUrl/profile'),
      headers: {'Authorization': 'Bearer $token'},
    );
    return json.decode(response.body);
  }
  
  static Future<Map<String, dynamic>> createConge(Map<String, dynamic> congeData, File? file) async {
    final token = await getToken();
    var request = http.MultipartRequest('POST', Uri.parse('$baseUrl/conges'));
    request.headers['Authorization'] = 'Bearer $token';
    
    request.fields['typeConge'] = congeData['typeConge'];
    request.fields['dates'] = json.encode(congeData['dates']);
    if (congeData['justification'] != null) {
      request.fields['justification'] = congeData['justification'];
    }
    
    if (file != null) {
      request.files.add(await http.MultipartFile.fromPath('fichier', file.path));
    }
    
    final response = await request.send();
    final responseBody = await response.stream.bytesToString();
    return json.decode(responseBody);
  }
  
  static Future<List<dynamic>> getConges() async {
    final token = await getToken();
    final response = await http.get(
      Uri.parse('$baseUrl/conges'),
      headers: {'Authorization': 'Bearer $token'},
    );
    return json.decode(response.body);
  }
  
  static Future<Map<String, dynamic>> updateCongeStatus(String id, String status) async {
    final token = await getToken();
    final response = await http.put(
      Uri.parse('$baseUrl/conges/$id/status'),
      headers: {'Content-Type': 'application/json', 'Authorization': 'Bearer $token'},
      body: json.encode({'statut': status}),
    );
    return json.decode(response.body);
  }
  
  static Future<Map<String, dynamic>> createQuestion(Map<String, dynamic> questionData, File? file) async {
    final token = await getToken();
    var request = http.MultipartRequest('POST', Uri.parse('$baseUrl/questions-rh'));
    request.headers['Authorization'] = 'Bearer $token';
    
    questionData.forEach((key, value) {
      request.fields[key] = value.toString();
    });
    
    if (file != null) {
      request.files.add(await http.MultipartFile.fromPath('pieceJointe', file.path));
    }
    
    final response = await request.send();
    final responseBody = await response.stream.bytesToString();
    return json.decode(responseBody);
  }
  
  static Future<List<dynamic>> getQuestions() async {
    final token = await getToken();
    final response = await http.get(
      Uri.parse('$baseUrl/questions-rh'),
      headers: {'Authorization': 'Bearer $token'},
    );
    return json.decode(response.body);
  }
  
  static Future<Map<String, dynamic>> updateQuestion(String id, Map<String, dynamic> questionData, File? file) async {
    final token = await getToken();
    var request = http.MultipartRequest('PUT', Uri.parse('$baseUrl/questions-rh/$id'));
    request.headers['Authorization'] = 'Bearer $token';
    
    questionData.forEach((key, value) {
      request.fields[key] = value.toString();
    });
    
    if (file != null) {
      request.files.add(await http.MultipartFile.fromPath('pieceJointe', file.path));
    }
    
    final response = await request.send();
    final responseBody = await response.stream.bytesToString();
    return json.decode(responseBody);
  }
  
  static Future<Map<String, dynamic>> deleteQuestion(String id) async {
    final token = await getToken();
    final response = await http.delete(
      Uri.parse('$baseUrl/questions-rh/$id'),
      headers: {'Authorization': 'Bearer $token'},
    );
    return json.decode(response.body);
  }
  
  static Future<Map<String, dynamic>> getDashboardStats() async {
    final token = await getToken();
    final response = await http.get(
      Uri.parse('$baseUrl/dashboard-stats'),
      headers: {'Authorization': 'Bearer $token'},
    );
    return json.decode(response.body);
  }

  // New methods for Admin functionality
  static Future<List<dynamic>> getUsers() async {
    final token = await getToken();
    final response = await http.get(
      Uri.parse('$baseUrl/users'),
      headers: {'Authorization': 'Bearer $token'},
    );
    return json.decode(response.body);
  }

  static Future<Map<String, dynamic>> createUser(Map<String, dynamic> userData) async {
    final token = await getToken();
    final response = await http.post(
      Uri.parse('$baseUrl/users'),
      headers: {'Content-Type': 'application/json', 'Authorization': 'Bearer $token'},
      body: json.encode(userData),
    );
    return json.decode(response.body);
  }

  static Future<Map<String, dynamic>> updateUser(String id, Map<String, dynamic> userData) async {
    final token = await getToken();
    final response = await http.put(
      Uri.parse('$baseUrl/users/$id'),
      headers: {'Content-Type': 'application/json', 'Authorization': 'Bearer $token'},
      body: json.encode(userData),
    );
    return json.decode(response.body);
  }

  static Future<Map<String, dynamic>> deleteUser(String id) async {
    final token = await getToken();
    final response = await http.delete(
      Uri.parse('$baseUrl/users/$id'),
      headers: {'Authorization': 'Bearer $token'},
    );
    return json.decode(response.body);
  }

  static Future<Map<String, dynamic>> answerQuestion(String id, String answer) async {
    final token = await getToken();
    final response = await http.put(
      Uri.parse('$baseUrl/questions-rh/$id/repondre'),
      headers: {'Content-Type': 'application/json', 'Authorization': 'Bearer $token'},
      body: json.encode({'reponse': answer}),
    );
    return json.decode(response.body);
  }
}