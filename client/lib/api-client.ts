import {
  ApiResponse,
  Customer,
  CreateCustomerRequest,
  UpdateCustomerRequest,
  Worker,
  CreateWorkerRequest,
  UpdateWorkerRequest,
  WorkerPerformance,
  Payment,
  RecordPaymentRequest,
  DashboardStats,
  RecentActivity,
  MonthlyReport,
  AreaReport,
  PaymentMethodReport,
  User,
  BusinessSettings,
  DailyDelivery,
  DailyQuantity,
  CustomerQuantityLink,
  CreateDailyDeliveryRequest,
  UpdateDailyQuantityRequest,
  Area,
  CreateAreaRequest,
  UpdateAreaRequest
} from '../../shared/api';

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

class ApiError extends Error {
  constructor(public status: number, message: string, public response?: any) {
    super(message);
    this.name = 'ApiError';
  }
}

async function apiRequest<T>(
  endpoint: string, 
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;
  
  const config: RequestInit = {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  };

  try {
    const response = await fetch(url, config);
    const data: ApiResponse<T> = await response.json();

    if (!response.ok) {
      throw new ApiError(
        response.status, 
        data.error || `HTTP error! status: ${response.status}`,
        data
      );
    }

    if (!data.success) {
      throw new ApiError(
        response.status,
        data.error || 'API request failed',
        data
      );
    }

    return data.data as T;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError(500, 'Network error occurred', error);
  }
}

// Dashboard API
export const dashboardApi = {
  getStats: (): Promise<DashboardStats> => 
    apiRequest<DashboardStats>('/dashboard/stats'),
    
  getRecentActivities: (): Promise<RecentActivity[]> => 
    apiRequest<RecentActivity[]>('/dashboard/activities'),
};

// Customer API
export const customerApi = {
  getAll: (params?: Record<string, string>): Promise<Customer[]> => {
    const searchParams = params ? `?${new URLSearchParams(params).toString()}` : '';
    return apiRequest<Customer[]>(`/customers${searchParams}`);
  },
  
  create: (customer: CreateCustomerRequest): Promise<Customer> =>
    apiRequest<Customer>('/customers', {
      method: 'POST',
      body: JSON.stringify(customer),
    }),
    
  update: (id: number, customer: UpdateCustomerRequest): Promise<Customer> =>
    apiRequest<Customer>(`/customers/${id}`, {
      method: 'PUT',
      body: JSON.stringify(customer),
    }),
    
  delete: (id: number): Promise<void> =>
    apiRequest<void>(`/customers/${id}`, {
      method: 'DELETE',
    }),
    
  getStats: (): Promise<any> => 
    apiRequest<any>('/customers/stats'),
};

// Worker API
export const workerApi = {
  getAll: (params?: Record<string, string>): Promise<Worker[]> => {
    const searchParams = params ? `?${new URLSearchParams(params).toString()}` : '';
    return apiRequest<Worker[]>(`/workers${searchParams}`);
  },
  
  create: (worker: CreateWorkerRequest): Promise<Worker> =>
    apiRequest<Worker>('/workers', {
      method: 'POST',
      body: JSON.stringify(worker),
    }),
    
  update: (id: number, worker: UpdateWorkerRequest): Promise<Worker> =>
    apiRequest<Worker>(`/workers/${id}`, {
      method: 'PUT',
      body: JSON.stringify(worker),
    }),
    
  delete: (id: number): Promise<void> =>
    apiRequest<void>(`/workers/${id}`, {
      method: 'DELETE',
    }),
    
  getPerformance: (): Promise<WorkerPerformance[]> => 
    apiRequest<WorkerPerformance[]>('/workers/performance'),
    
  getStats: (): Promise<any> => 
    apiRequest<any>('/workers/stats'),
    
  getAssignments: (id: number): Promise<any> =>
    apiRequest<any>(`/workers/${id}/assignments`),

  assignCustomers: (id: number, customerIds: number[]): Promise<any> =>
    apiRequest<any>(`/workers/${id}/assign`, {
      method: 'POST',
      body: JSON.stringify({ customerIds }),
    }),

  getCustomers: (id: number): Promise<Customer[]> =>
    apiRequest<Customer[]>(`/workers/${id}/customers`),

  getDeliveryReport: (id: number, date?: string): Promise<any> => {
    const params = date ? `?date=${date}` : '';
    return apiRequest<any>(`/workers/${id}/delivery-report${params}`);
  },
};

// Payment API
export const paymentApi = {
  getAll: (params?: Record<string, string>): Promise<Payment[]> => {
    const searchParams = params ? `?${new URLSearchParams(params).toString()}` : '';
    return apiRequest<Payment[]>(`/payments${searchParams}`);
  },
  
  record: (payment: RecordPaymentRequest): Promise<Payment> =>
    apiRequest<Payment>('/payments', {
      method: 'POST',
      body: JSON.stringify(payment),
    }),
    
  getCustomerPayments: (customerId: number): Promise<Payment[]> =>
    apiRequest<Payment[]>(`/payments/customer/${customerId}`),
    
  getStats: (): Promise<any> => 
    apiRequest<any>('/payments/stats'),
    
  generateBill: (data: any): Promise<any> =>
    apiRequest<any>('/payments/bill', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
    
  sendReminder: (data: any): Promise<any> =>
    apiRequest<any>('/payments/reminder', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
    
  generateInvoice: (data: any): Promise<any> =>
    apiRequest<any>('/payments/invoice', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
    
  getOverdue: (): Promise<Payment[]> =>
    apiRequest<Payment[]>('/payments/overdue'),

  getSummaries: (): Promise<any[]> =>
    apiRequest<any[]>('/payments/summaries'),
};

// Reports API
export const reportsApi = {
  getMonthly: (params?: { period?: string; startDate?: string; endDate?: string }): Promise<MonthlyReport[]> => {
    const searchParams = params ? `?${new URLSearchParams(params).toString()}` : '';
    return apiRequest<MonthlyReport[]>(`/reports/monthly${searchParams}`);
  },

  getWorkerPerformance: (params?: { period?: string }): Promise<WorkerPerformance[]> => {
    const searchParams = params ? `?${new URLSearchParams(params).toString()}` : '';
    return apiRequest<WorkerPerformance[]>(`/reports/worker-performance${searchParams}`);
  },

  getAreaWise: (params?: { period?: string }): Promise<AreaReport[]> => {
    const searchParams = params ? `?${new URLSearchParams(params).toString()}` : '';
    return apiRequest<AreaReport[]>(`/reports/area-wise${searchParams}`);
  },

  getPaymentMethods: (params?: { period?: string }): Promise<PaymentMethodReport[]> => {
    const searchParams = params ? `?${new URLSearchParams(params).toString()}` : '';
    return apiRequest<PaymentMethodReport[]>(`/reports/payment-methods${searchParams}`);
  },

  exportPDF: (params?: { period?: string; reportType?: string }): Promise<Blob> => {
    const searchParams = params ? `?${new URLSearchParams(params).toString()}` : '';
    return apiRequest<Blob>(`/reports/export-pdf${searchParams}`, {
      headers: { 'Accept': 'application/pdf' }
    });
  },

};

// Daily Operations API
export const dailyApi = {
  // Daily deliveries
  getDeliveries: (params?: { date?: string; customerId?: number; workerId?: number }): Promise<DailyDelivery[]> => {
    const searchParams = params ? `?${new URLSearchParams(
      Object.entries(params).reduce((acc, [key, value]) => {
        if (value !== undefined) acc[key] = String(value);
        return acc;
      }, {} as Record<string, string>)
    ).toString()}` : '';
    return apiRequest<DailyDelivery[]>(`/daily/deliveries${searchParams}`);
  },

  createDelivery: (delivery: CreateDailyDeliveryRequest): Promise<DailyDelivery> =>
    apiRequest<DailyDelivery>('/daily/deliveries', {
      method: 'POST',
      body: JSON.stringify(delivery),
    }),

  // Daily quantities
  getQuantities: (params?: { customerId?: number; date?: string }): Promise<DailyQuantity[]> => {
    const searchParams = params ? `?${new URLSearchParams(
      Object.entries(params).reduce((acc, [key, value]) => {
        if (value !== undefined) acc[key] = String(value);
        return acc;
      }, {} as Record<string, string>)
    ).toString()}` : '';
    return apiRequest<DailyQuantity[]>(`/daily/quantities${searchParams}`);
  },

  updateQuantity: (data: UpdateDailyQuantityRequest): Promise<boolean> =>
    apiRequest<boolean>('/daily/quantities', {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  // Customer quantity links
  generateQuantityLink: (customerId: number): Promise<CustomerQuantityLink> =>
    apiRequest<CustomerQuantityLink>(`/daily/quantity-link/${customerId}`),

  getCustomerByToken: (token: string): Promise<CustomerQuantityLink> =>
    apiRequest<CustomerQuantityLink>(`/daily/customer/${token}`),

  updateQuantityByToken: (token: string, data: { quantity: number; date: string }): Promise<boolean> =>
    apiRequest<boolean>(`/daily/customer/${token}/quantity`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),


  // Daily totals
  getDailyTotals: (date: string): Promise<{ totalRevenue: number; totalMilk: number; customerCount: number }> =>
    apiRequest<{ totalRevenue: number; totalMilk: number; customerCount: number }>(`/daily/totals?date=${date}`),
};

// Area API
export const areaApi = {
  getAll: (): Promise<Area[]> =>
    apiRequest<Area[]>('/areas'),

  getById: (id: number): Promise<Area> =>
    apiRequest<Area>(`/areas/${id}`),

  create: (data: CreateAreaRequest): Promise<Area> =>
    apiRequest<Area>('/areas', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  update: (id: number, data: UpdateAreaRequest): Promise<Area> =>
    apiRequest<Area>(`/areas/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  delete: (id: number): Promise<void> =>
    apiRequest<void>(`/areas/${id}`, {
      method: 'DELETE',
    }),
};

// Razorpay API
export const razorpayApi = {
  createPaymentLink: (data: {
    amount: number;
    customer: {
      name: string;
      contact: string;
      email?: string;
    };
    description: string;
    reference_id: string;
    expire_by?: number;
    notes?: Record<string, string>;
  }): Promise<{
    id: string;
    short_url: string;
    reference_id: string;
    status: string;
    amount: number;
    customer: {
      name: string;
      contact: string;
      email?: string;
    };
    description: string;
    expire_by?: number;
    created_at: number;
  }> =>
    apiRequest('/razorpay/payment-link', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  getPaymentLink: (linkId: string): Promise<{
    id: string;
    short_url: string;
    reference_id: string;
    status: string;
    amount: number;
    customer: {
      name: string;
      contact: string;
      email?: string;
    };
    description: string;
    created_at: number;
  }> =>
    apiRequest(`/razorpay/payment-link/${linkId}`),

  cancelPaymentLink: (linkId: string): Promise<{ status: string }> =>
    apiRequest(`/razorpay/payment-link/${linkId}/cancel`, {
      method: 'POST',
    }),
};


// Settings API (placeholder - you might need to create these endpoints)
export const settingsApi = {
  getUser: (): Promise<User> => 
    apiRequest<User>('/settings/user'),
    
  updateUser: (user: Partial<User>): Promise<User> =>
    apiRequest<User>('/settings/user', {
      method: 'PUT',
      body: JSON.stringify(user),
    }),
    
  getBusinessSettings: (): Promise<BusinessSettings> => 
    apiRequest<BusinessSettings>('/settings/business'),
    
  updateBusinessSettings: (settings: Partial<BusinessSettings>): Promise<BusinessSettings> =>
    apiRequest<BusinessSettings>('/settings/business', {
      method: 'PUT',
      body: JSON.stringify(settings),
    }),
};

// Export the ApiError class for error handling in components
export { ApiError };
