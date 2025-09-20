// lib/NotificationsPage.dart
import 'package:flutter/material.dart';
import 'services/notification_service.dart';
import 'package:intl/intl.dart';

class NotificationsPage extends StatefulWidget {
  const NotificationsPage({super.key});

  @override
  State<NotificationsPage> createState() => _NotificationsPageState();
}

class _NotificationsPageState extends State<NotificationsPage> {
  List<Map<String, dynamic>> _notifications = [];
  bool _isLoading = false;
  bool _showUnreadOnly = false;
  int _currentPage = 1;
  final int _limit = 20;

  @override
  void initState() {
    super.initState();
    _loadNotifications();
  }

  Future<void> _loadNotifications({bool refresh = false}) async {
    if (refresh) {
      _currentPage = 1;
      _notifications.clear();
    }

    setState(() {
      _isLoading = true;
    });

    try {
      final notifications = await NotificationService.instance.getNotifications(
        page: _currentPage,
        limit: _limit,
        unreadOnly: _showUnreadOnly,
      );
      
      setState(() {
        if (refresh) {
          _notifications = notifications;
        } else {
          _notifications.addAll(notifications);
        }
        _currentPage++;
      });
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Erreur lors du chargement: $e')),
      );
    } finally {
      setState(() {
        _isLoading = false;
      });
    }
  }

  Future<void> _markAsRead(String notificationId, int index) async {
    try {
      await NotificationService.instance.markAsRead(notificationId);
      setState(() {
        _notifications[index]['isRead'] = true;
      });
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Erreur: $e')),
      );
    }
  }

  Future<void> _markAllAsRead() async {
    try {
      await NotificationService.instance.markAllAsRead();
      setState(() {
        for (var notification in _notifications) {
          notification['isRead'] = true;
        }
      });
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Toutes les notifications ont été marquées comme lues')),
      );
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Erreur: $e')),
      );
    }
  }

  void _toggleUnreadFilter() {
    setState(() {
      _showUnreadOnly = !_showUnreadOnly;
    });
    _loadNotifications(refresh: true);
  }

  Color _getNotificationTypeColor(String type) {
    switch (type) {
      case 'conge_request':
        return Colors.blue;
      case 'conge_status_update':
        return Colors.green;
      case 'question_rh_new':
        return Colors.purple;
      case 'question_rh_answered':
        return Colors.orange;
      default:
        return Colors.grey;
    }
  }

  IconData _getNotificationTypeIcon(String type) {
    switch (type) {
      case 'conge_request':
        return Icons.calendar_today;
      case 'conge_status_update':
        return Icons.check_circle;
      case 'question_rh_new':
        return Icons.help;
      case 'question_rh_answered':
        return Icons.question_answer;
      default:
        return Icons.notifications;
    }
  }

  void _showNotificationDetails(Map<String, dynamic> notification) {
    showDialog(
      context: context,
      builder: (BuildContext context) {
        return AlertDialog(
          title: Text(notification['title'] ?? 'Notification'),
          content: SingleChildScrollView(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisSize: MainAxisSize.min,
              children: [
                Text(
                  notification['message'] ?? '',
                  style: const TextStyle(fontSize: 16),
                ),
                const SizedBox(height: 16),
                Text(
                  'Reçue le: ${DateFormat('dd/MM/yyyy HH:mm').format(DateTime.parse(notification['createdAt']))}',
                  style: const TextStyle(fontSize: 12, color: Colors.grey),
                ),
                if (notification['data'] != null && notification['data'].isNotEmpty)
                  const SizedBox(height: 16),
                if (notification['data'] != null && notification['data'].isNotEmpty)
                  Text(
                    'Détails additionnels:',
                    style: const TextStyle(fontWeight: FontWeight.bold),
                  ),
                if (notification['data'] != null && notification['data'].isNotEmpty)
                  Text(notification['data'].toString()),
              ],
            ),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.of(context).pop(),
              child: const Text('Fermer'),
            ),
          ],
        );
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Notifications', style: TextStyle(color: Colors.white)),
        flexibleSpace: Container(
          decoration: const BoxDecoration(
            gradient: LinearGradient(
              colors: [Color(0xFF9B59B6), Color(0xFF8E44AD)],
              begin: Alignment.centerLeft,
              end: Alignment.centerRight,
            ),
          ),
        ),
        actions: [
          IconButton(
            icon: Icon(
              _showUnreadOnly ? Icons.visibility : Icons.visibility_off,
              color: Colors.white,
            ),
            onPressed: _toggleUnreadFilter,
            tooltip: _showUnreadOnly ? 'Afficher toutes' : 'Non lues seulement',
          ),
          IconButton(
            icon: const Icon(Icons.mark_email_read, color: Colors.white),
            onPressed: _markAllAsRead,
            tooltip: 'Marquer toutes comme lues',
          ),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: () => _loadNotifications(refresh: true),
        child: _notifications.isEmpty && !_isLoading
            ? const Center(
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Icon(Icons.notifications_none, size: 64, color: Colors.grey),
                    SizedBox(height: 16),
                    Text(
                      'Aucune notification',
                      style: TextStyle(fontSize: 18, color: Colors.grey),
                    ),
                  ],
                ),
              )
            : ListView.builder(
                itemCount: _notifications.length + (_isLoading ? 1 : 0),
                itemBuilder: (context, index) {
                  if (index == _notifications.length) {
                    return const Padding(
                      padding: EdgeInsets.all(16.0),
                      child: Center(child: CircularProgressIndicator()),
                    );
                  }

                  final notification = _notifications[index];
                  final isRead = notification['isRead'] ?? false;
                  final notificationType = notification['type'] ?? '';

                  return Card(
                    margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
                    elevation: isRead ? 1 : 3,
                    child: ListTile(
                      leading: CircleAvatar(
                        backgroundColor: _getNotificationTypeColor(notificationType),
                        child: Icon(
                          _getNotificationTypeIcon(notificationType),
                          color: Colors.white,
                          size: 20,
                        ),
                      ),
                      title: Text(
                        notification['title'] ?? '',
                        style: TextStyle(
                          fontWeight: isRead ? FontWeight.normal : FontWeight.bold,
                          color: isRead ? Colors.grey[700] : Colors.black,
                        ),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                      subtitle: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            notification['message'] ?? '',
                            maxLines: 2,
                            overflow: TextOverflow.ellipsis,
                            style: TextStyle(
                              color: isRead ? Colors.grey[600] : Colors.grey[800],
                            ),
                          ),
                          const SizedBox(height: 4),
                          Text(
                            DateFormat('dd/MM/yyyy HH:mm').format(
                              DateTime.parse(notification['createdAt']),
                            ),
                            style: const TextStyle(fontSize: 12, color: Colors.grey),
                          ),
                        ],
                      ),
                      trailing: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          if (!isRead)
                            Container(
                              width: 12,
                              height: 12,
                              decoration: const BoxDecoration(
                                color: Colors.blue,
                                shape: BoxShape.circle,
                              ),
                            ),
                          const SizedBox(width: 8),
                          const Icon(Icons.arrow_forward_ios, size: 16),
                        ],
                      ),
                      onTap: () {
                        if (!isRead) {
                          _markAsRead(notification['_id'], index);
                        }
                        _showNotificationDetails(notification);
                      },
                    ),
                  );
                },
              ),
      ),
      floatingActionButton: _notifications.isNotEmpty
          ? FloatingActionButton(
              onPressed: () => _loadNotifications(refresh: true),
              backgroundColor: const Color(0xFF8E44AD),
              child: const Icon(Icons.refresh, color: Colors.white),
            )
          : null,
    );
  }
}