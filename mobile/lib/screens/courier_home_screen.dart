import 'package:flutter/material.dart';
import '../services/offline_sync_service.dart';

class CourierHomeScreen extends StatefulWidget {
  const CourierHomeScreen({super.key});

  @override
  State<CourierHomeScreen> createState() => _CourierHomeScreenState();
}

class _CourierHomeScreenState extends State<CourierHomeScreen> {
  final _syncService = OfflineSyncService();
  bool _isOnline = true;
  int _pendingSyncCount = 0;

  final List<Map<String, dynamic>> _shipments = [
    {
      'id': 2,
      'tracking_number': 'ES-4820-1192',
      'recipient_name': 'منى السيد محمود',
      'recipient_phone': '01299887766',
      'address': 'شقة 6، عمارة 8، شارع مكرم عبيد، مدينة نصر',
      'total_cod': 895.0,
      'status': 'OUT_FOR_DELIVERY',
    },
    {
      'id': 3,
      'tracking_number': 'ES-7712-9023',
      'recipient_name': 'كريم عادل الشريف',
      'recipient_phone': '01077665544',
      'address': 'شارع البطل أحمد عبد العزيز، المهندسين',
      'total_cod': 2250.0,
      'status': 'OUT_FOR_DELIVERY',
    },
  ];

  void _deliverShipment(Map<String, dynamic> shipment) async {
    final otpController = TextEditingController();

    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Text('تسليم الشحنة ${shipment['tracking_number']}'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text('المبلغ المطلوب تحصيله: ${shipment['total_cod']} ج.م',
                style: const TextStyle(fontWeight: FontWeight.bold, color: Color(0xFF059669))),
            const SizedBox(height: 12),
            TextField(
              controller: otpController,
              keyboardType: TextInputType.number,
              decoration: const InputDecoration(
                labelText: 'كود تأكيد التسليم OTP (إن وجد)',
                border: OutlineInputBorder(),
              ),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text('إلغاء'),
          ),
          ElevatedButton(
            style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFF059669)),
            onPressed: () async {
              Navigator.pop(ctx);

              // Record in offline mutation queue (works with or without internet!)
              await _syncService.recordOfflineAction(
                actionType: 'DELIVER',
                shipmentId: shipment['id'],
                payload: {
                  'otp': otpController.text,
                  'actualCod': shipment['total_cod'],
                  'lat': 30.0444,
                  'lng': 31.2357,
                },
              );

              setState(() {
                shipment['status'] = 'DELIVERED';
                _pendingSyncCount++;
              });

              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(
                  content: Text('✓ تم تسجيل التسليم محلياً وسيتم المزامنة تلقائياً عند توفر الإنترنت'),
                  backgroundColor: Color(0xFF059669),
                ),
              );
            },
            child: const Text('تأكيد الاستلام والتحصيل', style: TextStyle(color: Colors.white)),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('مهام المندوب اليومية'),
        actions: [
          IconButton(
            icon: const Icon(Icons.sync),
            onPressed: () {
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(content: Text('جاري فحص المزامنة مع خادم Easy Send...')),
              );
            },
          ),
        ],
      ),
      body: Column(
        children: [
          // Offline / Sync Status Bar
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
            color: _pendingSyncCount > 0 ? const Color(0xFFFEF3C7) : const Color(0xFFECFDF5),
            child: Row(
              children: [
                Icon(
                  _pendingSyncCount > 0 ? Icons.cloud_upload : Icons.cloud_done,
                  size: 20,
                  color: _pendingSyncCount > 0 ? const Color(0xFFD97706) : const Color(0xFF059669),
                ),
                const SizedBox(width: 8),
                Text(
                  _pendingSyncCount > 0
                      ? '$_pendingSyncCount عمليات بانتظار المزامنة التلقائية'
                      : 'جميع العمليات متزامنة لحظياً مع السيرفر',
                  style: TextStyle(
                    fontSize: 13,
                    fontWeight: FontWeight.bold,
                    color: _pendingSyncCount > 0 ? const Color(0xFFD97706) : const Color(0xFF059669),
                  ),
                ),
              ],
            ),
          ),

          // Total COD Summary Header
          Container(
            padding: const EdgeInsets.all(16),
            margin: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: const Color(0xFFE2E8F0)),
              boxShadow: [
                BoxShadow(color: Colors.black.withOpacity(0.04), blurRadius: 8, offset: const Offset(0, 2)),
              ],
            ),
            child: const Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text('إجمالي COD المستهدف تحصيله اليوم', style: TextStyle(fontSize: 12, color: Color(0xFF64748B))),
                    SizedBox(height: 4),
                    Text('3,145.00 ج.م', style: TextStyle(fontSize: 22, fontWeight: FontWeight.w900, color: Color(0xFF1E40AF))),
                  ],
                ),
                CircleAvatar(
                  radius: 24,
                  backgroundColor: Color(0xFFEFF6FF),
                  child: Icon(Icons.account_balance_wallet, color: Color(0xFF1E40AF)),
                ),
              ],
            ),
          ),

          // Shipments List
          Expanded(
            child: ListView.builder(
              padding: const EdgeInsets.symmetric(horizontal: 16),
              itemCount: _shipments.length,
              itemBuilder: (ctx, idx) {
                final s = _shipments[idx];
                final isDelivered = s['status'] == 'DELIVERED';

                return Card(
                  margin: const EdgeInsets.bottom(12),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                  elevation: 1,
                  child: Padding(
                    padding: const EdgeInsets.all(14),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Text(s['tracking_number'],
                                style: const TextStyle(fontWeight: FontWeight.w900, color: Color(0xFF1E40AF), fontSize: 16)),
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                              decoration: BoxDecoration(
                                color: isDelivered ? const Color(0xFFECFDF5) : const Color(0xFFEFF6FF),
                                borderRadius: BorderRadius.circular(8),
                              ),
                              child: Text(
                                isDelivered ? 'تم التسليم ✓' : 'في الطريق 🛵',
                                style: TextStyle(
                                  fontSize: 12,
                                  fontWeight: FontWeight.bold,
                                  color: isDelivered ? const Color(0xFF059669) : const Color(0xFF1E40AF),
                                ),
                              ),
                            ),
                          ],
                        ),
                        const Divider(height: 16),
                        Text('العميل: ${s['recipient_name']}', style: const TextStyle(fontWeight: FontWeight.bold)),
                        Text('الهاتف: ${s['recipient_phone']}', style: const TextStyle(color: Color(0xFF64748B))),
                        Text('العنوان: ${s['address']}', style: const TextStyle(fontSize: 13, color: Color(0xFF334155))),
                        const SizedBox(height: 8),
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Text(
                              'المبلغ: ${s['total_cod']} ج.م',
                              style: const TextStyle(fontWeight: FontWeight.w900, color: Color(0xFF059669), fontSize: 15),
                            ),
                            if (!isDelivered)
                              ElevatedButton.icon(
                                style: ElevatedButton.styleFrom(
                                  backgroundColor: const Color(0xFF059669),
                                  foregroundColor: Colors.white,
                                ),
                                onPressed: () => _deliverShipment(s),
                                icon: const Icon(Icons.check, size: 16),
                                label: const Text('تسليم وتحصيل'),
                              ),
                          ],
                        ),
                      ],
                    ),
                  ),
                );
              },
            ),
          ),
        ],
      ),
    );
  }
}
