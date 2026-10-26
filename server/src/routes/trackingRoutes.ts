import { Router, Request, Response } from 'express';
import { query } from '../config/db.js';

const router = Router();

// الاستعلام العام عن الشحنة مع دعم تتبع موقع المندوب الحي لحظياً
// متوافق بالكامل مع قانون حماية البيانات الشخصية رقم 151 لسنة 2020
router.get('/:tokenOrNumber', async (req: Request, res: Response) => {
  const param = req.params.tokenOrNumber.trim();

  try {
    const resShipment = await query(
      `SELECT s.id, s.tracking_number, s.status, s.weight_kg, s.package_count,
              s.scheduled_delivery_date, s.created_at, s.updated_at,
              s.package_description, s.allow_open_package,
              c_dest.name as destination_city,
              z_dest.name as destination_zone,
              m.business_name as merchant_name,
              pod.pod_type, pod.verified_at,
              c.last_known_lat, c.last_known_lng, c.last_location_updated_at,
              u_c.full_name as courier_name
       FROM shipments s
       JOIN merchants m ON m.id = s.merchant_id
       JOIN cities c_dest ON c_dest.id = s.destination_city_id
       JOIN zones z_dest ON z_dest.id = s.destination_zone_id
       LEFT JOIN proof_of_delivery pod ON pod.shipment_id = s.id
       LEFT JOIN couriers c ON c.id = s.assigned_courier_id
       LEFT JOIN users u_c ON u_c.id = c.user_id
       WHERE s.tracking_number = $1 OR s.public_tracking_token::text = $1`,
      [param]
    );

    if (resShipment.rowCount === 0) {
      return res.status(404).json({
        success: false,
        message: 'رقم التتبع غير صحيح أو غير موجود',
      });
    }

    const s = resShipment.rows[0];

    // Fetch timeline milestones
    const historyRes = await query(
      `SELECT to_status, server_timestamp
       FROM shipment_status_history
       WHERE shipment_id = $1
       ORDER BY server_timestamp ASC`,
      [s.id]
    );

    const statusLabels: Record<string, string> = {
      NEW: 'تم استلام طلب الشحن من المتجر',
      ASSIGNED: 'تم تعيين مندوب التوصيل',
      PICKED_UP: 'الشحنة في مركز التوزيع الرئيسي',
      OUT_FOR_DELIVERY: 'الشحنة في الطريق مع المندوب إليك الآن',
      DELIVERED: 'تم التسليم بنجاح',
      FAILED_DELIVERY: 'تعذر التسليم (سيتم إعادة المحاولة)',
      RETURNED: 'مرتجع للمتجر',
      CANCELLED: 'الشحنة ملغاة',
    };

    const timeline = historyRes.rows.map((h) => ({
      status: h.to_status,
      title: statusLabels[h.to_status] || h.to_status,
      timestamp: h.server_timestamp,
    }));

    // If out for delivery and courier has GPS coordinates, expose live tracking info
    let courierLiveLocation = null;
    if (s.status === 'OUT_FOR_DELIVERY' && s.last_known_lat && s.last_known_lng) {
      courierLiveLocation = {
        courierName: s.courier_name,
        latitude: parseFloat(s.last_known_lat),
        longitude: parseFloat(s.last_known_lng),
        lastUpdated: s.last_location_updated_at,
        googleMapsUrl: `https://maps.google.com/?q=${s.last_known_lat},${s.last_known_lng}`,
      };
    }

    return res.json({
      success: true,
      data: {
        trackingNumber: s.tracking_number,
        merchantName: s.merchant_name,
        currentStatus: s.status,
        statusTitle: statusLabels[s.status] || s.status,
        destinationCity: s.destination_city,
        destinationZone: s.destination_zone,
        weightKg: s.weight_kg,
        packageCount: s.package_count,
        packageDescription: s.package_description || 'طرد بضائع عامة',
        allowOpenPackage: s.allow_open_package,
        scheduledDeliveryDate: s.scheduled_delivery_date,
        isDelivered: s.status === 'DELIVERED',
        deliveryProof: s.verified_at ? {
          type: s.pod_type,
          verifiedAt: s.verified_at
        } : null,
        courierLiveLocation,
        timeline,
      },
    });
  } catch (err: any) {
    console.error('Tracking query error:', err);
    return res.status(500).json({ success: false, message: 'فشل استعلام حالة الشحنة' });
  }
});

export default router;
