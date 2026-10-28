-- ====================================================================
-- ZONO HR & Payroll Full Module Migration
-- Includes: Biometric Punches (GPS/Face/Device), Leaves/Permissions,
-- Granular HR Screen Permissions, and Employee Biometric Coding
-- ====================================================================

-- 1. Add biometric method and GPS geofence columns to hr_employees
ALTER TABLE hr_employees 
ADD COLUMN IF NOT EXISTS biometric_method VARCHAR(50) DEFAULT 'TIME_ENTRY';

ALTER TABLE hr_employees 
ADD COLUMN IF NOT EXISTS allowed_location_lat NUMERIC(10, 7);

ALTER TABLE hr_employees 
ADD COLUMN IF NOT EXISTS allowed_location_lng NUMERIC(10, 7);

ALTER TABLE hr_employees 
ADD COLUMN IF NOT EXISTS allowed_radius_meters INTEGER DEFAULT 150;

ALTER TABLE hr_employees 
ADD COLUMN IF NOT EXISTS face_template_data TEXT;

-- 2. Biometric Punches (Attendance clock-in/out records)
CREATE TABLE IF NOT EXISTS hr_biometric_punches (
  id SERIAL PRIMARY KEY,
  employee_id INTEGER REFERENCES hr_employees(id) ON DELETE CASCADE,
  punch_time TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  punch_type VARCHAR(20) DEFAULT 'IN', -- 'IN', 'OUT'
  punch_method VARCHAR(50) DEFAULT 'TIME_ENTRY', -- 'GPS_LOCATION', 'FACE_RECOGNITION', 'TIME_ENTRY', 'DEVICE_IMPORT'
  location_lat NUMERIC(10, 7),
  location_lng NUMERIC(10, 7),
  location_address TEXT,
  distance_meters NUMERIC(10, 2),
  face_image_url TEXT,
  device_id VARCHAR(100),
  verification_status VARCHAR(50) DEFAULT 'VERIFIED', -- 'VERIFIED', 'OUT_OF_RANGE', 'MANUAL_OVERRIDE'
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_hr_biometric_punches_emp ON hr_biometric_punches(employee_id);
CREATE INDEX IF NOT EXISTS idx_hr_biometric_punches_time ON hr_biometric_punches(punch_time);

-- 3. Leaves & Permissions Workflow
CREATE TABLE IF NOT EXISTS hr_leaves (
  id SERIAL PRIMARY KEY,
  employee_id INTEGER REFERENCES hr_employees(id) ON DELETE CASCADE,
  leave_type VARCHAR(50) NOT NULL, -- 'ANNUAL', 'CASUAL', 'SICK', 'UNPAID', 'PERMISSION_HOURS'
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  hours NUMERIC(4, 2) DEFAULT 0,
  reason TEXT,
  status VARCHAR(50) DEFAULT 'PENDING', -- 'PENDING', 'APPROVED', 'REJECTED'
  decision_notes TEXT,
  approved_by VARCHAR(100),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_hr_leaves_emp ON hr_leaves(employee_id);
CREATE INDEX IF NOT EXISTS idx_hr_leaves_dates ON hr_leaves(start_date, end_date);

-- 4. HR Granular User Screen Permissions
CREATE TABLE IF NOT EXISTS hr_user_permissions (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  screen_key VARCHAR(100) NOT NULL,
  can_view BOOLEAN DEFAULT TRUE,
  can_edit BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, screen_key)
);

CREATE INDEX IF NOT EXISTS idx_hr_user_permissions_user ON hr_user_permissions(user_id);
