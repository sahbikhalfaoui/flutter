// lib/services/notification_service.dart
import 'package:flutter/material.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import 'websocket_service.dart';
import 'api_service.dart';

class NotificationService {
  static NotificationService? _instance;
  static NotificationService get instance {
    _instance ??= NotificationService._();
    return _instance!;
  }
  
  NotificationService._();
  
  final FlutterLocalNotificationsPlugin _flutterLocalNotificationsPlugin = 
      FlutterLocalNotificationsPlugin();
  
  int _unreadCount = 0;
  List<Function(int)> _unreadCountListeners = [];
  
  Future<void> initialize() async {
    // Initialize local notifications
    const AndroidInitializationSettings initializationSettingsAndroid =
        AndroidInitializationSettings('@mipmap/ic_launcher');
    
    const InitializationSettings initializationSettings =
        InitializationSettings(android: initializationSettingsAndroid);
    
    await _flutterLocalNotificationsPlugin.initialize(
      initializationSettings,
      onDidReceiveNotificationResponse: (NotificationResponse response) {
        // Handle notification tap
        print('Notification tapped: ${response.payload}');
      },
    );
    
    // Set up WebSocket notification callback
    WebSocketService.instance.setNotificationCallback(_handleWebSocketNotification);
    
    // Load initial unread count
    await _loadUnreadCount();
  }
  
  Future<void> _loadUnreadCount() async {
    try {
      final response = await ApiService.getUnreadCount();
      _unreadCount = response['unreadCount'] ?? 0;
      _notifyUnreadCountListeners();
    } catch (e) {
      print('Error loading unread count: $e');
    }
  }
  
  void _handleWebSocketNotification(Map<String, dynamic> notification) {
    // Update unread count
    _unreadCount++;
    _notifyUnreadCountListeners();
    
    // Show local notification
    _showLocalNotification(
      notification['title'] ?? 'Nouvelle notification',
      notification['message'] ?? '',
      payload: notification['data']?.toString(),
    );
  }
  
  Future<void> _showLocalNotification(String title, String body, {String? payload}) async {
    const AndroidNotificationDetails androidPlatformChannelSpecifics =
        AndroidNotificationDetails(
      'hr_notifications',
      'HR Notifications',
      channelDescription: 'Notifications for HR application',
      importance: Importance.max,
      priority: Priority.high,
      showWhen: true,
    );
    
    const NotificationDetails platformChannelSpecifics =
        NotificationDetails(android: androidPlatformChannelSpecifics);
    
    await _flutterLocalNotificationsPlugin.show(
      DateTime.now().millisecondsSinceEpoch.remainder(100000),
      title,
      body,
      platformChannelSpecifics,
      payload: payload,
    );
  }
  
  void showInAppNotification(BuildContext context, String title, String message) {
    showDialog(
      context: context,
      builder: (BuildContext context) {
        return AlertDialog(
          title: Row(
            children: [
              const Icon(Icons.notifications, color: Color(0xFF8E44AD)),
              const SizedBox(width: 8),
              Expanded(child: Text(title)),
            ],
          ),
          content: Text(message),
          actions: [
            TextButton(
              onPressed: () => Navigator.of(context).pop(),
              child: const Text('OK'),
            ),
          ],
        );
      },
    );
  }
  
  void addUnreadCountListener(Function(int) listener) {
    _unreadCountListeners.add(listener);
  }
  
  void removeUnreadCountListener(Function(int) listener) {
    _unreadCountListeners.remove(listener);
  }
  
  void _notifyUnreadCountListeners() {
    for (var listener in _unreadCountListeners) {
      listener(_unreadCount);
    }
  }
  
  Future<void> markAllAsRead() async {
    try {
      await ApiService.markAllNotificationsAsRead();
      _unreadCount = 0;
      _notifyUnreadCountListeners();
    } catch (e) {
      print('Error marking all notifications as read: $e');
    }
  }
  
  Future<void> markAsRead(String notificationId) async {
    try {
      await ApiService.markNotificationAsRead(notificationId);
      if (_unreadCount > 0) {
        _unreadCount--;
        _notifyUnreadCountListeners();
      }
    } catch (e) {
      print('Error marking notification as read: $e');
    }
  }
  
  int get unreadCount => _unreadCount;
  
  Future<List<Map<String, dynamic>>> getNotifications({int page = 1, int limit = 20, bool unreadOnly = false}) async {
    try {
      final response = await ApiService.getNotifications(page: page, limit: limit, unreadOnly: unreadOnly);
      return List<Map<String, dynamic>>.from(response['notifications'] ?? []);
    } catch (e) {
      print('Error getting notifications: $e');
      return [];
    }
  }
  
  Future<void> connectWebSocket() async {
    await WebSocketService.instance.connect();
  }
  
  void disconnectWebSocket() {
    WebSocketService.instance.disconnect();
  }
}