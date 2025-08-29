/**
 * Shared code between client and server
 * Types for the milk delivery management system
 */

// Base types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export type PaymentStatus = "paid" | "pending" | "partial" | "overdue";
export type PaymentMethod =
  | "UPI"
  | "Cash"
  | "Bank Transfer"
  | "Card"
  | "Cheque";
export type UserRole = "Super Admin" | "Manager" | "Worker" | "Viewer";
export type CustomerStatus = "active" | "inactive";
export type WorkerStatus = "active" | "inactive";

// Area types
export interface Area {
  id: number;
  name: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateAreaRequest {
  name: string;
  description?: string;
}

export interface UpdateAreaRequest {
  name?: string;
  description?: string;
}

// Customer types
export interface Customer {
  id: number;
  name: string;
  phone: string;
  address: string;
  areaId: number;
  areaName?: string;
  dailyQuantity: number;
  ratePerLiter: number;
  monthlyAmount: number; // Calculated from daily deliveries till current date
  workerId: number;
  workerName?: string;
  status: CustomerStatus;
  joinDate: string;
  lastPayment?: string;
  pendingDues: number;
  // Daily billing fields
  currentMonthDeliveries?: number;
  currentMonthAmount?: number;
  nextDayQuantity?: number; // Quantity for tomorrow's delivery
  canChangeQuantity?: boolean; // False after 12 AM
  uniqueLink?: string; // For customer to change quantity
  createdAt: string;
  updatedAt: string;
}

export interface CreateCustomerRequest {
  name: string;
  phone: string;
  address: string;
  areaId: number;
  dailyQuantity: number;
  ratePerLiter: number;
  workerId: number;
  status?: CustomerStatus;
}

export interface UpdateCustomerRequest {
  name?: string;
  phone?: string;
  address?: string;
  areaId?: number;
  dailyQuantity?: number;
  ratePerLiter?: number;
  workerId?: number;
  status?: CustomerStatus;
}

// Worker types
export interface Worker {
  id: number;
  name: string;
  phone: string;
  email: string;
  areaId: number;
  areaName?: string;
  address: string;
  emergencyContact: string;
  joinDate: string;
  status: WorkerStatus;
  customersAssigned: number;
  monthlyRevenue: number;
  efficiency: number;
  onTimeDeliveries: number;
  totalDeliveries: number;
  rating: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateWorkerRequest {
  name: string;
  phone: string;
  email: string;
  areaId: number;
  address: string;
  emergencyContact: string;
  status?: WorkerStatus;
}

export interface UpdateWorkerRequest {
  name?: string;
  phone?: string;
  email?: string;
  areaId?: number;
  address?: string;
  emergencyContact?: string;
  status?: WorkerStatus;
}

// Payment types
export interface Payment {
  id: number;
  customerId: number;
  customerName?: string;
  amount: number;
  paymentMethod: PaymentMethod;
  status: PaymentStatus;
  month: string;
  year: number;
  dueDate: string;
  paidDate?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreatePaymentRequest {
  customerId: number;
  amount: number;
  paymentMethod: PaymentMethod;
  month: string;
  year: number;
  dueDate: string;
  paidDate?: string;
  notes?: string;
}

export interface RecordPaymentRequest {
  customerId: number;
  amount: number;
  paymentMethod: PaymentMethod;
  paidDate: string;
  notes?: string;
}

// Daily billing types
export interface DailyDelivery {
  id: number;
  customerId: number;
  customerName?: string;
  workerId: number;
  workerName?: string;
  date: string; // YYYY-MM-DD format
  quantityDelivered: number;
  ratePerLiter: number;
  dailyAmount: number;
  status: "delivered" | "missed" | "cancelled";
  notes?: string;
  deliveryTime?: string;
  createdAt: string;
  updatedAt: string;
}

export interface DailyQuantity {
  id: number;
  customerId: number;
  date: string; // YYYY-MM-DD format for the delivery date
  requestedQuantity: number;
  currentQuantity: number; // Fallback to customer's default if no custom quantity
  isLocked: boolean; // True after 12 AM when changes are stopped
  requestedAt?: string;
  lockedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface DailyBilling {
  id: number;
  customerId: number;
  month: string;
  year: number;
  totalDays: number;
  deliveredDays: number;
  totalQuantity: number;
  totalAmount: number;
  collectedAmount: number;
  pendingAmount: number;
  lastCalculatedDate: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateDailyDeliveryRequest {
  customerId: number;
  workerId: number;
  date: string;
  quantityDelivered: number;
  ratePerLiter: number;
  status?: "delivered" | "missed" | "cancelled";
  notes?: string;
  deliveryTime?: string;
}

export interface UpdateDailyQuantityRequest {
  customerId: number;
  date: string;
  requestedQuantity: number;
}

// Monthly billing
export interface MonthlyBill {
  id: number;
  customerId: number;
  month: string;
  year: number;
  milkQuantity: number;
  ratePerLiter: number;
  totalAmount: number;
  paidAmount: number;
  pendingAmount: number;
  status: PaymentStatus;
  dueDate: string;
  createdAt: string;
  updatedAt: string;
}

// Reports types
export interface MonthlyReport {
  month: string;
  year: number;
  totalCustomers: number;
  activeCustomers: number;
  totalRevenue: number;
  collectedRevenue: number;
  pendingRevenue: number;
  milkSold: number;
  newCustomers: number;
}

export interface WorkerPerformance {
  workerId: number;
  workerName: string;
  area: string;
  customers: number;
  revenue: number;
  milkDelivered: number;
  efficiency: number;
  onTimeDeliveries: number;
  totalDeliveries: number;
  rating: number;
}

export interface AreaReport {
  area: string;
  customers: number;
  revenue: number;
  milkSold: number;
  pendingDues: number;
  workers: number;
}

export interface PaymentMethodReport {
  method: PaymentMethod;
  percentage: number;
  amount: number;
  transactions: number;
}

// Settings types
export interface BusinessSettings {
  businessName: string;
  ownerName: string;
  phone: string;
  email: string;
  address: string;
  gstNumber?: string;
  registrationNumber?: string;
  website?: string;
}

export interface PricingSettings {
  defaultRate: number;
  premiumRate: number;
  bulkRate: number;
  minimumOrder: number;
  deliveryCharge: number;
  lateFee: number;
  currency: string;
  effectiveDate?: string;
}

export interface PaymentGatewaySettings {
  razorpayEnabled: boolean;
  razorpayKeyId?: string;
  razorpaySecret?: string;
  upiEnabled: boolean;
  upiId?: string;
  bankAccount?: string;
  ifscCode?: string;
  bankName?: string;
  accountHolder?: string;
}

// User types
export interface User {
  id: number;
  name: string;
  email: string;
  role: UserRole;
  status: "active" | "inactive";
  lastLogin?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateUserRequest {
  name: string;
  email: string;
  password: string;
  role: UserRole;
}

// Dashboard types
export interface DashboardStats {
  totalCustomers: number;
  activeWorkers: number;
  todayRevenue: number;
  milkDelivered: number;
  monthlyRevenue: number; // Accumulated daily totals till current date
  totalMilkSold: number; // Accumulated daily milk sold till current date
  pendingDues: number;
  newCustomers: number;
  collectionRate: number;
  // Daily billing specific stats
  todayDeliveries: number;
  tomorrowOrders: number;
  dailyAverageRevenue: number;
  currentMonthDays: number;
}

export interface RecentActivity {
  id: number;
  type: "payment" | "delivery" | "new_customer" | "payment_due";
  description: string;
  amount?: number;
  customer?: string;
  worker?: string;
  time: string;
}

// Legacy demo type
export interface DemoResponse {
  message: string;
}

// Generic list response
export interface ListResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}

// End of day processing
export interface EndOfDayProcess {
  id: number;
  date: string;
  totalCustomers: number;
  totalDeliveries: number;
  totalMilkDelivered: number;
  totalRevenue: number;
  processedAt: string;
  status: "completed" | "failed" | "partial";
  notes?: string;
}

export interface CustomerQuantityLink {
  customerId: number;
  customerName: string;
  currentQuantity: number;
  nextDayQuantity: number;
  uniqueToken: string;
  expiresAt: string;
  canChange: boolean;
}

export interface QuantityChangeRequest {
  token: string;
  quantity: number;
  date: string; // Date for which quantity is being changed
}

// Daily operations
export interface DailyOperations {
  processEndOfDay: (date: string) => Promise<EndOfDayProcess>;
  lockQuantityChanges: (date: string) => Promise<boolean>;
  generateCustomerLinks: (date: string) => Promise<CustomerQuantityLink[]>;
  calculateDailyTotals: (date: string) => Promise<{
    totalRevenue: number;
    totalMilk: number;
    customerCount: number;
  }>;
}

// Search and filter types
export interface SearchFilters {
  search?: string;
  status?: string;
  area?: string;
  worker?: string;
  paymentStatus?: PaymentStatus;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}
