import 'package:flutter/material.dart';
import 'package:table_calendar/table_calendar.dart';
import 'package:intl/intl.dart';
import 'package:intl/date_symbol_data_local.dart';
import 'services/api_service.dart';

class CalendarPage extends StatefulWidget {
  const CalendarPage({super.key});

  @override
  State<CalendarPage> createState() => _CalendarPageState();
}

class _CalendarPageState extends State<CalendarPage> {
  CalendarFormat _calendarFormat = CalendarFormat.month;
  DateTime _focusedDay = DateTime.now();
  DateTime? _selectedDay;
  Map<DateTime, List<CongeEvent>> _events = {};
  List<CongeEvent> _selectedEvents = [];
  bool _isLoading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _selectedDay = DateTime.now();
    _initializeLocale();
  }

  Future<void> _initializeLocale() async {
    await initializeDateFormatting('fr_FR', null);
    _loadConges();
  }

  Future<void> _loadConges() async {
    try {
      setState(() {
        _isLoading = true;
        _error = null;
      });

      final conges = await ApiService.getConges();
      final Map<DateTime, List<CongeEvent>> events = {};

      for (var conge in conges) {
        if (conge['statut'] == 'approuve') {
          final dates = List<String>.from(conge['dates']);
          final userName = conge['userId']['nom'] ?? 'Utilisateur inconnu';
          final typeConge = conge['typeConge'] ?? 'Congé';
          
          for (String dateStr in dates) {
            final date = DateTime.parse(dateStr);
            final normalizedDate = DateTime(date.year, date.month, date.day);
            
            final event = CongeEvent(
              userName: userName,
              typeConge: typeConge,
              userId: conge['userId']['_id'],
              congeId: conge['_id'],
            );

            if (events[normalizedDate] != null) {
              events[normalizedDate]!.add(event);
            } else {
              events[normalizedDate] = [event];
            }
          }
        }
      }

      setState(() {
        _events = events;
        _selectedEvents = _getEventsForDay(_selectedDay);
        _isLoading = false;
      });
    } catch (e) {
      setState(() {
        _error = 'Erreur lors du chargement des congés: $e';
        _isLoading = false;
      });
    }
  }

  List<CongeEvent> _getEventsForDay(DateTime? day) {
    if (day == null) return [];
    final normalizedDay = DateTime(day.year, day.month, day.day);
    return _events[normalizedDay] ?? [];
  }

  Color _getCongeTypeColor(String typeConge) {
    switch (typeConge.toLowerCase()) {
      case 'rtt':
        return Colors.blue;
      case 'cpp':
        return Colors.green;
      case 'congé exceptionnel':
        return Colors.orange;
      case 'congé pour civisme':
        return Colors.purple;
      case 'congé divers':
        return Colors.teal;
      case 'congé famille':
        return Colors.pink;
      case 'congé maladie':
        return Colors.red;
      case 'congé sans solde':
        return Colors.grey;
      default:
        return Colors.indigo;
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text("Calendrier des congés"),
        backgroundColor: Theme.of(context).colorScheme.inversePrimary,
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: _loadConges,
          ),
        ],
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : _error != null
              ? Center(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(Icons.error, size: 64, color: Colors.red),
                      SizedBox(height: 16),
                      Text(_error!, style: TextStyle(color: Colors.red)),
                      SizedBox(height: 16),
                      ElevatedButton(
                        onPressed: _loadConges,
                        child: Text('Réessayer'),
                      ),
                    ],
                  ),
                )
              : Column(
                  children: [
                    // Calendar Widget
                    Container(
                      decoration: BoxDecoration(
                        color: Colors.white,
                        boxShadow: [
                          BoxShadow(
                            color: Colors.grey.withOpacity(0.1),
                            spreadRadius: 1,
                            blurRadius: 3,
                            offset: Offset(0, 2),
                          ),
                        ],
                      ),
                      child: TableCalendar<CongeEvent>(
                        firstDay: DateTime.utc(2020, 1, 1),
                        lastDay: DateTime.utc(2030, 12, 31),
                        focusedDay: _focusedDay,
                        calendarFormat: _calendarFormat,
                        eventLoader: _getEventsForDay,
                        startingDayOfWeek: StartingDayOfWeek.monday,
                        selectedDayPredicate: (day) {
                          return isSameDay(_selectedDay, day);
                        },
                        onDaySelected: (selectedDay, focusedDay) {
                          if (!isSameDay(_selectedDay, selectedDay)) {
                            setState(() {
                              _selectedDay = selectedDay;
                              _focusedDay = focusedDay;
                              _selectedEvents = _getEventsForDay(selectedDay);
                            });
                          }
                        },
                        onFormatChanged: (format) {
                          if (_calendarFormat != format) {
                            setState(() {
                              _calendarFormat = format;
                            });
                          }
                        },
                        onPageChanged: (focusedDay) {
                          _focusedDay = focusedDay;
                        },
                        calendarStyle: CalendarStyle(
                          outsideDaysVisible: false,
                          markerDecoration: BoxDecoration(
                            color: Colors.blue,
                            shape: BoxShape.circle,
                          ),
                          markersMaxCount: 3,
                          canMarkersOverflow: true,
                        ),
                        headerStyle: HeaderStyle(
                          formatButtonVisible: true,
                          titleCentered: true,
                          formatButtonShowsNext: false,
                          formatButtonDecoration: BoxDecoration(
                            color: Theme.of(context).primaryColor,
                            borderRadius: BorderRadius.circular(20.0),
                          ),
                          formatButtonTextStyle: TextStyle(
                            color: Colors.white,
                          ),
                        ),
                        calendarBuilders: CalendarBuilders(
                          markerBuilder: (context, day, events) {
                            final congeEvents = events.cast<CongeEvent>();
                            if (congeEvents.isEmpty) return null;

                            return Positioned(
                              bottom: 1,
                              child: Row(
                                mainAxisSize: MainAxisSize.min,
                                children: congeEvents.take(3).map((event) {
                                  return Container(
                                    margin: EdgeInsets.symmetric(horizontal: 0.5),
                                    decoration: BoxDecoration(
                                      shape: BoxShape.circle,
                                      color: _getCongeTypeColor(event.typeConge),
                                    ),
                                    width: 6,
                                    height: 6,
                                  );
                                }).toList(),
                              ),
                            );
                          },
                        ),
                      ),
                    ),
                    
                    const SizedBox(height: 8.0),
                    
                    // Legend
                    Container(
                      padding: EdgeInsets.all(12),
                      margin: EdgeInsets.symmetric(horizontal: 16),
                      decoration: BoxDecoration(
                        color: Colors.grey[100],
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'Légende des types de congés:',
                            style: TextStyle(fontWeight: FontWeight.bold),
                          ),
                          SizedBox(height: 8),
                          Wrap(
                            spacing: 12,
                            runSpacing: 4,
                            children: [
                              _buildLegendItem('RTT', Colors.blue),
                              _buildLegendItem('CPP', Colors.green),
                              _buildLegendItem('Exceptionnel', Colors.orange),
                              _buildLegendItem('Civisme', Colors.purple),
                              _buildLegendItem('Divers', Colors.teal),
                              _buildLegendItem('Famille', Colors.pink),
                              _buildLegendItem('Maladie', Colors.red),
                              _buildLegendItem('Sans solde', Colors.grey),
                            ],
                          ),
                        ],
                      ),
                    ),
                    
                    const SizedBox(height: 8.0),
                    
                    // Events list for selected day
                    Expanded(
                      child: Container(
                        margin: EdgeInsets.symmetric(horizontal: 16),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            if (_selectedDay != null) ...[
                              Padding(
                                padding: EdgeInsets.symmetric(vertical: 8),
                                child: Text(
                                  'Congés du ${DateFormat('dd MMMM yyyy', 'fr_FR').format(_selectedDay!)}',
                                  style: TextStyle(
                                    fontSize: 18,
                                    fontWeight: FontWeight.bold,
                                  ),
                                ),
                              ),
                              Expanded(
                                child: _selectedEvents.isEmpty
                                    ? Center(
                                        child: Column(
                                          mainAxisAlignment: MainAxisAlignment.center,
                                          children: [
                                            Icon(
                                              Icons.event_available,
                                              size: 48,
                                              color: Colors.grey,
                                            ),
                                            SizedBox(height: 8),
                                            Text(
                                              'Aucun congé ce jour-là',
                                              style: TextStyle(
                                                color: Colors.grey[600],
                                                fontSize: 16,
                                              ),
                                            ),
                                          ],
                                        ),
                                      )
                                    : ListView.builder(
                                        itemCount: _selectedEvents.length,
                                        itemBuilder: (context, index) {
                                          final event = _selectedEvents[index];
                                          return Card(
                                            margin: EdgeInsets.symmetric(vertical: 4),
                                            child: ListTile(
                                              leading: CircleAvatar(
                                                backgroundColor: _getCongeTypeColor(event.typeConge),
                                                child: Text(
                                                  event.userName.substring(0, 1).toUpperCase(),
                                                  style: TextStyle(
                                                    color: Colors.white,
                                                    fontWeight: FontWeight.bold,
                                                  ),
                                                ),
                                              ),
                                              title: Text(
                                                event.userName,
                                                style: TextStyle(
                                                  fontWeight: FontWeight.bold,
                                                ),
                                              ),
                                              subtitle: Text(event.typeConge),
                                              trailing: Container(
                                                width: 12,
                                                height: 12,
                                                decoration: BoxDecoration(
                                                  color: _getCongeTypeColor(event.typeConge),
                                                  shape: BoxShape.circle,
                                                ),
                                              ),
                                            ),
                                          );
                                        },
                                      ),
                              ),
                            ],
                          ],
                        ),
                      ),
                    ),
                  ],
                ),
    );
  }

  Widget _buildLegendItem(String label, Color color) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Container(
          width: 12,
          height: 12,
          decoration: BoxDecoration(
            color: color,
            shape: BoxShape.circle,
          ),
        ),
        SizedBox(width: 4),
        Text(
          label,
          style: TextStyle(fontSize: 12),
        ),
      ],
    );
  }
}

class CongeEvent {
  final String userName;
  final String typeConge;
  final String userId;
  final String congeId;

  CongeEvent({
    required this.userName,
    required this.typeConge,
    required this.userId,
    required this.congeId,
  });

  @override
  String toString() => userName;
}