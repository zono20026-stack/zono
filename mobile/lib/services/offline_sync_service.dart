import 'dart:convert';
import 'package:sqflite/sqflite.dart';
import 'package:path/path.dart';
import 'package:uuid/uuid.dart';
import 'package:connectivity_plus/connectivity_plus.dart';

class OfflineSyncService {
  static final OfflineSyncService _instance = OfflineSyncService._internal();
  factory OfflineSyncService() => _instance;
  OfflineSyncService._internal();

  Database? _db;

  Future<Database> get database async {
    if (_db != null) return _db!;
    _db = await _initDb();
    return _db!;
  }

  Future<Database> _initDb() async {
    final dbPath = await getDatabasesPath();
    final path = join(dbPath, 'easy_send_offline.db');

    return await openDatabase(
      path,
      version: 1,
      onCreate: (db, version) async {
        // Outbox Queue for mutations recorded offline
        await db.execute('''
          CREATE TABLE outbox_actions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            client_mutation_id TEXT UNIQUE NOT NULL,
            action_type TEXT NOT NULL,
            shipment_id INTEGER NOT NULL,
            payload_json TEXT NOT NULL,
            device_timestamp TEXT NOT NULL,
            sync_status TEXT NOT NULL DEFAULT 'PENDING'
          )
        ''');

        // Local cached shipments for offline viewing
        await db.execute('''
          CREATE TABLE cached_shipments (
            id INTEGER PRIMARY KEY,
            tracking_number TEXT NOT NULL,
            recipient_name TEXT NOT NULL,
            recipient_phone TEXT NOT NULL,
            recipient_address TEXT NOT NULL,
            total_cod_amount REAL NOT NULL,
            status TEXT NOT NULL,
            updated_at TEXT NOT NULL
          )
        ''');
      },
    );
  }

  // تسجيل عملية تسليم أو تغيير حالة أوفلاين مع توليد Mutation ID فريد
  Future<String> recordOfflineAction({
    required String actionType,
    required int shipmentId,
    required Map<String, dynamic> payload,
  }) async {
    final db = await database;
    final mutationId = const Uuid().v4();
    final now = DateTime.now().toIso8601String();

    await db.insert('outbox_actions', {
      'client_mutation_id': mutationId,
      'action_type': actionType,
      'shipment_id': shipmentId,
      'payload_json': jsonEncode(payload),
      'device_timestamp': now,
      'sync_status': 'PENDING',
    });

    // Update local cache so courier immediately sees the change
    if (actionType == 'DELIVER') {
      await db.update(
        'cached_shipments',
        {'status': 'DELIVERED', 'updated_at': now},
        where: 'id = ?',
        whereArgs: [shipmentId],
      );
    }

    return mutationId;
  }

  // مزامنة العمليات المعلقة عند توفر اتصال بالإنترنت
  Future<int> syncPendingActions(Future<bool> Function(Map<String, dynamic>) apiPoster) async {
    final connectivity = await Connectivity().checkConnectivity();
    if (connectivity.contains(ConnectivityResult.none)) {
      return 0; // لا يوجد اتصال
    }

    final db = await database;
    final pending = await db.query(
      'outbox_actions',
      where: 'sync_status = ?',
      whereArgs: ['PENDING'],
      orderBy: 'id ASC',
    );

    int syncedCount = 0;
    for (var row in pending) {
      final success = await apiPoster({
        'mutationId': row['client_mutation_id'],
        'actionType': row['action_type'],
        'shipmentId': row['shipment_id'],
        'payload': jsonDecode(row['payload_json'] as String),
        'deviceTimestamp': row['device_timestamp'],
      });

      if (success) {
        await db.update(
          'outbox_actions',
          {'sync_status': 'SYNCED'},
          where: 'id = ?',
          whereArgs: [row['id']],
        );
        syncedCount++;
      }
    }

    return syncedCount;
  }
}
