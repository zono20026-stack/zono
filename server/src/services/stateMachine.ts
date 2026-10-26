import { PoolClient } from 'pg';
import { executeTransaction, query } from '../config/db.js';
import { recordDeliveryAccounting } from './accounting.js';

export type ShipmentStatus =
  | 'NEW'
  | 'ASSIGNED'
  | 'PICKED_UP'
  | 'OUT_FOR_DELIVERY'
  | 'DELIVERED'
  | 'FAILED_DELIVERY'
  | 'RETURNED'
  | 'CANCELLED';

// Allowed state transitions map
const VALID_TRANSITIONS: Record<ShipmentStatus, ShipmentStatus[]> = {
  NEW: ['ASSIGNED', 'CANCELLED'],
  ASSIGNED: ['PICKED_UP', 'NEW', 'CANCELLED'],
  PICKED_UP: ['OUT_FOR_DELIVERY', 'RETURNED'],
  OUT_FOR_DELIVERY: ['DELIVERED', 'FAILED_DELIVERY'],
  FAILED_DELIVERY: ['OUT_FOR_DELIVERY', 'RETURNED'],
  DELIVERED: [], // Terminal State
  RETURNED: [],  // Terminal State
  CANCELLED: [], // Terminal State
};

export interface StateChangeParams {
  shipmentId: number;
  toStatus: ShipmentStatus;
  userId: number;
  reason?: string;
  latitude?: number;
  longitude?: number;
  deviceTimestamp?: string;
  podType?: 'OTP' | 'SIGNATURE' | 'PHOTO';
  otpCode?: string;
  signatureStorageKey?: string;
  photoStorageKey?: string;
  recipientNotes?: string;
  actualCodCollected?: number;
}

export const transitionShipmentStatus = async (params: StateChangeParams) => {
  return await executeTransaction(async (client: PoolClient) => {
    // 1. Lock and fetch current shipment status
    const currentRes = await client.query(
      `SELECT id, tracking_number, status, assigned_courier_id, merchant_id,
              origin_branch_id, destination_branch_id, total_cod_amount,
              goods_value, shipping_fee
       FROM shipments
       WHERE id = $1 FOR UPDATE`,
      [params.shipmentId]
    );

    if (currentRes.rowCount === 0) {
      throw new Error('الشحنة غير موجودة');
    }

    const shipment = currentRes.rows[0];
    const fromStatus: ShipmentStatus = shipment.status;

    // 2. Validate state transition
    const allowed = VALID_TRANSITIONS[fromStatus] || [];
    if (!allowed.includes(params.toStatus)) {
      throw new Error(
        `انتقال غير مسموح: لا يمكن تغيير حالة الشحنة من [${fromStatus}] إلى [${params.toStatus}]`
      );
    }

    // 3. If transitioning to DELIVERED, validate courier assignment and POD
    if (params.toStatus === 'DELIVERED') {
      if (!shipment.assigned_courier_id) {
        throw new Error('لا يمكن تسليم شحنة غير معينة لمندوب');
      }

      const codCollected = params.actualCodCollected !== undefined 
        ? params.actualCodCollected 
        : parseFloat(shipment.total_cod_amount);

      // Record Proof of Delivery
      if (params.podType) {
        await client.query(
          `INSERT INTO proof_of_delivery (
            shipment_id, pod_type, otp_code, signature_storage_key,
            photo_storage_key, recipient_notes, courier_latitude, courier_longitude
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
          ON CONFLICT (shipment_id) DO UPDATE SET
            pod_type = EXCLUDED.pod_type,
            verified_at = CURRENT_TIMESTAMP`,
          [
            shipment.id,
            params.podType,
            params.otpCode || null,
            params.signatureStorageKey || null,
            params.photoStorageKey || null,
            params.recipientNotes || null,
            params.latitude || null,
            params.longitude || null,
          ]
        );
      }

      // Update actual collected COD on shipment
      await client.query(
        `UPDATE shipments SET actual_cod_collected = $1 WHERE id = $2`,
        [codCollected, shipment.id]
      );

      // Trigger automatic Double-Entry Accounting
      await recordDeliveryAccounting(client, {
        shipmentId: shipment.id,
        trackingNumber: shipment.tracking_number,
        courierId: shipment.assigned_courier_id,
        merchantId: shipment.merchant_id,
        branchId: shipment.destination_branch_id,
        goodsValue: parseFloat(shipment.goods_value),
        shippingFee: parseFloat(shipment.shipping_fee),
        codCollected: codCollected,
        userId: params.userId,
      });
    }

    // 4. Update shipment status
    const updateRes = await client.query(
      `UPDATE shipments 
       SET status = $1, updated_at = CURRENT_TIMESTAMP
       WHERE id = $2
       RETURNING *`,
      [params.toStatus, shipment.id]
    );

    // 5. Append to immutable history log
    await client.query(
      `INSERT INTO shipment_status_history (
        shipment_id, from_status, to_status, changed_by, reason,
        latitude, longitude, device_timestamp
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        shipment.id,
        fromStatus,
        params.toStatus,
        params.userId,
        params.reason || null,
        params.latitude || null,
        params.longitude || null,
        params.deviceTimestamp || null,
      ]
    );

    return updateRes.rows[0];
  });
};
