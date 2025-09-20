// lib/services/websocket_service.dart
import 'dart:convert';
import 'dart:io';
import 'package:web_socket_channel/web_socket_channel.dart';
import 'package:web_socket_channel/io.dart';
import 'api_service.dart';

class WebSocketService {
  static WebSocketService? _instance;
  WebSocketChannel? _channel;
  bool _isConnected = false;
  Function(Map<String, dynamic>)? _onNotificationReceived;
  
  static WebSocketService get instance {
    _instance ??= WebSocketService._();
    return _instance!;
  }
  
  WebSocketService._();
  
  void setNotificationCallback(Function(Map<String, dynamic>) callback) {
    _onNotificationReceived = callback;
  }
  
  Future<void> connect() async {
    try {
      final token = await ApiService.getToken();
      if (token == null) {
        print('No token available for WebSocket connection');
        return;
      }
      
      _channel = IOWebSocketChannel.connect('ws://localhost:3000');
      _isConnected = true;
      
      // Authenticate with the server
      _channel!.sink.add(json.encode({
        'type': 'authenticate',
        'token': token,
      }));
      
      // Listen for messages
      _channel!.stream.listen(
        (message) {
          try {
            final data = json.decode(message);
            _handleMessage(data);
          } catch (e) {
            print('Error parsing WebSocket message: $e');
          }
        },
        onDone: () {
          print('WebSocket connection closed');
          _isConnected = false;
        },
        onError: (error) {
          print('WebSocket error: $error');
          _isConnected = false;
        },
      );
      
      print('WebSocket connected successfully');
    } catch (e) {
      print('Failed to connect WebSocket: $e');
      _isConnected = false;
    }
  }
  
  void _handleMessage(Map<String, dynamic> data) {
    switch (data['type']) {
      case 'authenticated':
        print('WebSocket authenticated: ${data['message']}');
        break;
      case 'notification':
        print('Received notification: ${data['title']}');
        if (_onNotificationReceived != null) {
          _onNotificationReceived!(data);
        }
        break;
      case 'error':
        print('WebSocket error: ${data['message']}');
        break;
      default:
        print('Unknown message type: ${data['type']}');
    }
  }
  
  void disconnect() {
    if (_isConnected && _channel != null) {
      _channel!.sink.close();
      _isConnected = false;
      print('WebSocket disconnected');
    }
  }
  
  bool get isConnected => _isConnected;
}