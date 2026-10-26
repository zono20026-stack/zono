import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { query } from '../config/db.js';
import { authenticateToken, AuthRequest } from '../middleware/auth.js';

const router = Router();

// 1. تسجيل الدخول مع حماية هجمات التخمين والقفل المؤقت
router.post('/login', async (req: Request, res: Response) => {
  const { phone, password } = req.body;

  if (!phone || !password) {
    return res.status(400).json({
      success: false,
      message: 'يرجى إدخال رقم الهاتف وكلمة المرور',
    });
  }

  try {
    const userRes = await query(
      `SELECT u.id, u.role, u.full_name, u.phone, u.password_hash,
              u.branch_id, u.is_active, u.failed_login_attempts, u.locked_until,
              m.id as merchant_id, c.id as courier_id, b.name as branch_name
       FROM users u
       LEFT JOIN merchants m ON m.user_id = u.id
       LEFT JOIN couriers c ON c.user_id = u.id
       LEFT JOIN branches b ON b.id = u.branch_id
       WHERE u.phone = $1`,
      [phone]
    );

    if (userRes.rowCount === 0) {
      return res.status(401).json({
        success: false,
        message: 'بيانات الدخول غير صحيحة',
      });
    }

    const user = userRes.rows[0];

    // Check account lock
    if (user.locked_until && new Date(user.locked_until) > new Date()) {
      return res.status(403).json({
        success: false,
        message: 'تم قفل الحساب مؤقتاً بسبب تكرار المحاولات الخاطئة. يرجى المحاولة لاحقاً',
      });
    }

    if (!user.is_active) {
      return res.status(403).json({
        success: false,
        message: 'الحساب معطل. يرجى التواصل مع إدارة النظام',
      });
    }

    // Verify password with bcrypt
    const isValid = await bcrypt.compare(password, user.password_hash);
    if (!isValid) {
      const attempts = user.failed_login_attempts + 1;
      let lockSql = `failed_login_attempts = $1`;
      if (attempts >= 5) {
        lockSql += `, locked_until = CURRENT_TIMESTAMP + INTERVAL '15 minutes'`;
      }
      await query(`UPDATE users SET ${lockSql} WHERE id = $2`, [attempts, user.id]);

      return res.status(401).json({
        success: false,
        message: 'بيانات الدخول غير صحيحة',
      });
    }

    // Reset failed attempts upon successful login
    await query(
      `UPDATE users SET failed_login_attempts = 0, locked_until = NULL, last_login_at = CURRENT_TIMESTAMP WHERE id = $1`,
      [user.id]
    );

    // Issue 15-minute Access Token
    const jwtSecret = process.env.JWT_SECRET || 'easy_send_super_secret_jwt_key_2026';
    const accessToken = jwt.sign(
      {
        id: user.id,
        role: user.role,
        phone: user.phone,
        fullName: user.full_name,
      },
      jwtSecret,
      { expiresIn: '15m' }
    );

    // Issue Refresh Token (saved in DB for remote revocation)
    const refreshSecret = process.env.JWT_REFRESH_SECRET || 'easy_send_refresh_jwt_key_super_secure';
    const refreshToken = jwt.sign({ id: user.id }, refreshSecret, { expiresIn: '7d' });

    await query(
      `INSERT INTO refresh_tokens (user_id, token_hash, ip_address, expires_at)
       VALUES ($1, $2, $3, CURRENT_TIMESTAMP + INTERVAL '7 days')`,
      [user.id, refreshToken, req.ip]
    );

    // Log login to immutable audit log
    await query(
      `INSERT INTO audit_logs (user_id, action, table_name, record_id, new_values, ip_address, user_agent)
       VALUES ($1, 'LOGIN_SUCCESS', 'users', $2, $3, $4, $5)`,
      [
        user.id,
        user.id.toString(),
        JSON.stringify({ role: user.role, phone: user.phone }),
        req.ip,
        req.headers['user-agent'] || 'App',
      ]
    );

    return res.json({
      success: true,
      message: 'تم تسجيل الدخول بنجاح',
      data: {
        accessToken,
        refreshToken,
        user: {
          id: user.id,
          role: user.role,
          fullName: user.full_name,
          phone: user.phone,
          branchId: user.branch_id,
          branchName: user.branch_name,
          merchantId: user.merchant_id,
          courierId: user.courier_id,
        },
      },
    });
  } catch (err: any) {
    console.error('Login error:', err);
    return res.status(500).json({
      success: false,
      message: 'حدث خطأ غير متوقع أثناء الدخول',
    });
  }
});

// 2. تجديد التوكن (Refresh Token)
router.post('/refresh', async (req: Request, res: Response) => {
  const { refreshToken } = req.body;
  if (!refreshToken) {
    return res.status(400).json({ success: false, message: 'مطلوب رمز التجديد' });
  }

  try {
    const refreshSecret = process.env.JWT_REFRESH_SECRET || 'easy_send_refresh_jwt_key_super_secure';
    const decoded = jwt.verify(refreshToken, refreshSecret) as any;

    const tokenRes = await query(
      `SELECT id, user_id FROM refresh_tokens 
       WHERE token_hash = $1 AND revoked_at IS NULL AND expires_at > CURRENT_TIMESTAMP`,
      [refreshToken]
    );

    if (tokenRes.rowCount === 0) {
      return res.status(403).json({ success: false, message: 'رمز التجديد ملغى أو غير صالح' });
    }

    const userRes = await query(`SELECT id, role, full_name, phone FROM users WHERE id = $1`, [decoded.id]);
    const user = userRes.rows[0];

    const jwtSecret = process.env.JWT_SECRET || 'easy_send_super_secret_jwt_key_2026';
    const newAccessToken = jwt.sign(
      { id: user.id, role: user.role, phone: user.phone, fullName: user.full_name },
      jwtSecret,
      { expiresIn: '15m' }
    );

    return res.json({
      success: true,
      data: { accessToken: newAccessToken },
    });
  } catch (err) {
    return res.status(403).json({ success: false, message: 'رمز التجديد غير صالح' });
  }
});

// 3. بيانات المستخدم الحالي
router.get('/me', authenticateToken, (req: AuthRequest, res: Response) => {
  return res.json({
    success: true,
    data: req.user,
  });
});

// 4. تسجيل الخروج وإلغاء الجلسة
router.post('/logout', authenticateToken, async (req: AuthRequest, res: Response) => {
  const { refreshToken } = req.body;
  if (refreshToken) {
    await query(
      `UPDATE refresh_tokens SET revoked_at = CURRENT_TIMESTAMP WHERE token_hash = $1`,
      [refreshToken]
    );
  }
  return res.json({ success: true, message: 'تم تسجيل الخروج بنجاح' });
});

export default router;
