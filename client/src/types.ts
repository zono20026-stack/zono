export interface User {
  id: number;
  role: 'SUPER_ADMIN' | 'BRANCH_MANAGER' | 'ACCOUNTANT' | 'DATA_ENTRY' | 'VIEWER' | 'MERCHANT' | 'COURIER';
  fullName: string;
  phone: string;
  branchId?: number;
  branchName?: string;
  merchantId?: number;
  courierId?: number;
}

export interface Customer {
  id: number;
  customer_code: string;
  name: string;
  phone: string;
  phone_alt?: string;
  city_id: number;
  zone_id: number;
  city_name: string;
  zone_name: string;
  address: string;
  latitude?: string;
  longitude?: string;
  google_maps_url?: string;
  notes?: string;
  total_shipments_count?: string;
  delivered_count?: string;
  return_or_failed_count?: string;
  total_spent?: string;
  is_active: boolean;
  created_at: string;
}

export interface Merchant {
  id: number;
  merchant_code: string;
  business_name: string;
  contact_name: string;
  phone: string;
  email?: string;
  city_name: string;
  zone_name: string;
  pickup_address: string;
  latitude?: string;
  longitude?: string;
  google_maps_url?: string;
  special_discount_percentage?: string;
  total_shipments?: string;
  current_payable?: string;
}

export interface Courier {
  id: number;
  courier_code: string;
  full_name: string;
  phone: string;
  national_id: string;
  vehicle_type: string;
  vehicle_plate_number?: string;
  branch_name: string;
  max_unsettled_days: number;
  is_suspended_from_assignment: boolean;
  last_known_lat?: string;
  last_known_lng?: string;
  last_location_updated_at?: string;
  current_liability?: string;
  active_orders_count?: string;
}

export interface Shipment {
  id: number;
  tracking_number: string;
  public_tracking_token: string;
  status: 'NEW' | 'ASSIGNED' | 'PICKED_UP' | 'OUT_FOR_DELIVERY' | 'DELIVERED' | 'FAILED_DELIVERY' | 'RETURNED' | 'CANCELLED';
  recipient_name: string;
  recipient_phone: string;
  recipient_address: string;
  destination_city: string;
  destination_zone: string;
  origin_branch: string;
  destination_branch: string;
  merchant_name: string;
  courier_name?: string;
  courier_lat?: string;
  courier_lng?: string;
  goods_value: string;
  shipping_fee: string;
  total_cod_amount: string;
  actual_cod_collected: string;
  weight_kg: string;
  package_count: number;
  package_description?: string;
  allow_open_package?: boolean;
  customer_id?: number;
  recipient_latitude?: string;
  recipient_longitude?: string;
  delivery_notes?: string;
  scheduled_delivery_date: string;
  created_at: string;
  pod_type?: string;
  history?: ShipmentHistory[];
}

export interface ShipmentHistory {
  id: number;
  from_status?: string;
  to_status: string;
  changed_by_name: string;
  reason?: string;
  server_timestamp: string;
}

export interface GeneralExpense {
  id: number;
  expense_code: string;
  branch_name: string;
  category: string;
  amount: string;
  expense_date: string;
  paid_to: string;
  payment_method: string;
  notes?: string;
  created_by_name: string;
}

export interface AccountBalance {
  id: number;
  account_code: string;
  account_name: string;
  account_type: string;
  total_debit: string;
  total_credit: string;
  current_balance: string;
}

export interface DashboardKPIs {
  totalShipments: number;
  deliveredCount: number;
  deliveryRate: string;
  outForDeliveryCount: number;
  newCount: number;
  assignedCount: number;
  failedCount: number;
  returnedCount: number;
  financials: {
    branchCashBalance: number;
    courierOpenLiabilities: number;
    merchantPayables: number;
    totalRevenue: number;
  };
}

export interface CourierLiability {
  courierId: number;
  courierName: string;
  phone: string;
  branchName: string;
  currentLiability: number;
  deliveredShipmentsCount: number;
  daysPending: number;
  maxAllowedDays: number;
  isBlockedFromAssignment: boolean;
}

export interface MerchantPayable {
  merchantId: number;
  businessName: string;
  phone: string;
  cityName: string;
  payableAmount: number;
  deliveredOrdersCount: number;
}

export interface JournalEntry {
  id: number;
  entry_number: string;
  entry_date: string;
  reference_type: string;
  description: string;
  created_by_name: string;
  full_name?: string;
  lines: {
    accountCode: string;
    accountName: string;
    debit: string;
    credit: string;
    description?: string;
  }[];
}

export interface Branch {
  id: number;
  branch_code: string;
  name: string;
  phone: string;
  address: string;
  is_active: boolean;
}

export interface CityWithZones {
  id: number;
  name: string;
  zones: { id: number; name: string }[];
}

export interface CourierMaster {
  id: number;
  full_name: string;
  phone: string;
  branch_name: string;
  vehicle_type: string;
  vehicle_plate_number: string;
  max_unsettled_days: number;
  is_suspended_from_assignment: boolean;
}
