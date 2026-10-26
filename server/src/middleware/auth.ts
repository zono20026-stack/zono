import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { query } from '../config/db.js';

export interface AuthenticatedUser {
  id: number;
  role: string;
  phone: string;
  fullName: string;
  branchId?: number;
  merchantId?: number;
  courierId?: number;
}

export interface AuthRequest extends Request {
  user?: AuthenticatedUser;
}

export const authenticateToken = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'غير مصرح بالدخول: يرجى تسجيل الدخول أولاً',
    });
  }

  try {
    const secret = process.env.JWT_SECRET || 'easy_send_super_secret_jwt_key_2026';
    const decoded = jwt.verify(token, secret) as any;

    // Verify user is active in DB and fetch entity IDs
    const userRes = await query(
      `SELECT u.id, u.role, u.phone, u.full_name, u.branch_id, u.is_active,
              m.id as merchant_id, c.id as courier_id
       FROM users u
       LEFT JOIN merchants m ON m.user_id = u.id
       LEFT JOIN couriers c ON c.user_id = u.id
       WHERE u.id = $1`,
      [decoded.id]
    );

    if (userRes.rowCount === 0 || !userRes.rows[0].is_active) {
      return res.status(403).json({
        success: false,
        message: 'الحساب غير متاح أو معطل من قبل الإدارة',
      });
    }

    const row = userRes.rows[0];
    req.user = {
      id: row.id,
      role: row.role,
      phone: row.phone,
      fullName: row.full_name,
      branchId: row.branch_id,
      merchantId: row.merchant_id,
      courierId: row.courier_id,
    };

    next();
  } catch (err: any) {
    return res.status(401).json({
      success: false,
      message: 'رمز التحقق منتهي الصلاحية أو غير صالح',
    });
  }
};
