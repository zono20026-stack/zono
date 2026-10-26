import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth.js';

// Enforce required roles
export const requireRoles = (roles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'غير مصرح' });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'ليس لديك الصلاحية الكافية للوصول إلى هذه الوظيفة',
      });
    }

    next();
  };
};

// Check ownership: Couriers only access assigned shipments, Merchants only their shipments
export const checkShipmentOwnership = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  if (!req.user) {
    return res.status(401).json({ success: false, message: 'غير مصرح' });
  }

  // Admins, Accountants, and Data Entry can access all
  if (['SUPER_ADMIN', 'BRANCH_MANAGER', 'ACCOUNTANT', 'DATA_ENTRY', 'VIEWER'].includes(req.user.role)) {
    return next();
  }

  // Couriers and Merchants are scoped dynamically in query controllers
  next();
};
