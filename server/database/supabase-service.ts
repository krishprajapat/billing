import { supabase } from './supabase';
import {
  Customer,
  Worker,
  Payment,
  Area,
  DashboardStats,
  MonthlyReport,
  WorkerPerformance,
  AreaReport,
  PaymentMethodReport,
  DailyDelivery,
  DailyQuantity,
  CustomerQuantityLink,
  BusinessSettings,
  PricingSettings,
  PaymentGatewaySettings,
  CreateCustomerRequest,
  UpdateCustomerRequest,
  CreateWorkerRequest,
  UpdateWorkerRequest,
  CreateAreaRequest,
  UpdateAreaRequest,
  RecordPaymentRequest,
  CreateDailyDeliveryRequest,
  UpdateDailyQuantityRequest
} from '@shared/api';
import { PaymentCalculationEngine, PaymentSummary } from './payment-engine';

export class SupabaseService {
  // =====================================
  // AREA METHODS
  // =====================================

  async getAreas(): Promise<Area[]> {
    const { data, error } = await supabase
      .from('areas')
      .select('*')
      .order('name');

    if (error) throw new Error(`Failed to get areas: ${error.message}`);
    
    return data?.map(this.mapAreaFromDB) || [];
  }

  async getAreaById(id: number): Promise<Area | null> {
    const { data, error } = await supabase
      .from('areas')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw new Error(`Failed to get area: ${error.message}`);
    }

    return data ? this.mapAreaFromDB(data) : null;
  }

  async createArea(data: CreateAreaRequest): Promise<Area> {
    const { data: newArea, error } = await supabase
      .from('areas')
      .insert({
        name: data.name,
        description: data.description
      })
      .select()
      .single();

    if (error) throw new Error(`Failed to create area: ${error.message}`);
    
    return this.mapAreaFromDB(newArea);
  }

  async updateArea(id: number, data: UpdateAreaRequest): Promise<Area | null> {
    const { data: updatedArea, error } = await supabase
      .from('areas')
      .update({
        name: data.name,
        description: data.description
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw new Error(`Failed to update area: ${error.message}`);
    }

    return this.mapAreaFromDB(updatedArea);
  }

  async deleteArea(id: number): Promise<boolean> {
    // Check if area has active customers or workers
    const { data: customers } = await supabase
      .from('customers')
      .select('id')
      .eq('area_id', id)
      .eq('status', 'active');

    const { data: workers } = await supabase
      .from('workers')
      .select('id')
      .eq('area_id', id)
      .eq('status', 'active');

    if ((customers && customers.length > 0) || (workers && workers.length > 0)) {
      const errorParts = [];
      if (customers && customers.length > 0) {
        errorParts.push(`${customers.length} active customer(s)`);
      }
      if (workers && workers.length > 0) {
        errorParts.push(`${workers.length} active worker(s)`);
      }
      throw new Error(`Cannot delete area. It has ${errorParts.join(' and ')} assigned.`);
    }

    const { error } = await supabase
      .from('areas')
      .delete()
      .eq('id', id);

    if (error) throw new Error(`Failed to delete area: ${error.message}`);
    
    return true;
  }

  // =====================================
  // CUSTOMER METHODS
  // =====================================

  async getCustomers(filters?: any): Promise<Customer[]> {
    let query = supabase
      .from('customers')
      .select(`
        *,
        areas!customers_area_id_fkey(name),
        workers!customers_worker_id_fkey(name)
      `)
      .order('name');

    if (filters?.status) {
      query = query.eq('status', filters.status);
    }
    if (filters?.area) {
      query = query.eq('area_id', parseInt(filters.area));
    }
    if (filters?.worker === 'unassigned') {
      query = query.is('worker_id', null);
    } else if (filters?.worker === 'assigned') {
      query = query.not('worker_id', 'is', null);
    }
    if (filters?.search) {
      query = query.or(`name.ilike.%${filters.search}%,phone.ilike.%${filters.search}%,address.ilike.%${filters.search}%`);
    }

    const { data, error } = await query;

    if (error) throw new Error(`Failed to get customers: ${error.message}`);
    
    return data?.map(this.mapCustomerFromDB) || [];
  }

  async getCustomerById(id: number): Promise<Customer | null> {
    const { data, error } = await supabase
      .from('customers')
      .select(`
        *,
        areas!customers_area_id_fkey(name),
        workers!customers_worker_id_fkey(name)
      `)
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw new Error(`Failed to get customer: ${error.message}`);
    }

    return data ? this.mapCustomerFromDB(data) : null;
  }

  async createCustomer(data: CreateCustomerRequest): Promise<Customer> {
    const pricingSettings = await this.getPricingSettings();
    const appliedRate = pricingSettings?.defaultRate ?? data.ratePerLiter;

    if (data.workerId && data.workerId > 0) {
      const { data: worker } = await supabase
        .from('workers')
        .select('area_id')
        .eq('id', data.workerId)
        .single();

      if (worker && worker.area_id !== data.areaId) {
        throw new Error('Worker does not serve the selected area');
      }
    }

    const { data: newCustomer, error } = await supabase
      .from('customers')
      .insert({
        name: data.name,
        phone: data.phone,
        address: data.address,
        area_id: data.areaId,
        daily_quantity: data.dailyQuantity,
        rate_per_liter: appliedRate,
        monthly_amount: 0,
        worker_id: data.workerId || null,
        status: data.status || 'active',
        unique_link: this.generateUniqueToken()
      })
      .select(`
        *,
        areas!customers_area_id_fkey(name),
        workers!customers_worker_id_fkey(name)
      `)
      .single();

    if (error) throw new Error(`Failed to create customer: ${error.message}`);

    if (newCustomer.worker_id) {
      await this.updateWorkerStats(newCustomer.worker_id);
    }

    return this.mapCustomerFromDB(newCustomer);
  }

  async updateCustomer(id: number, data: UpdateCustomerRequest): Promise<Customer | null> {
    const currentCustomer = await this.getCustomerById(id);
    if (!currentCustomer) return null;

    if (data.dailyQuantity && data.dailyQuantity !== currentCustomer.dailyQuantity) {
      const now = new Date();
      const currentHour = now.getHours();
      const isValidTime = currentHour >= 18 && currentHour < 22;

      if (!isValidTime) {
        throw new Error('Quantity changes are only allowed between 6:00 PM and 10:00 PM');
      }
    }

    if (data.areaId && data.areaId !== currentCustomer.areaId && currentCustomer.workerId) {
      const { data: worker } = await supabase
        .from('workers')
        .select('area_id')
        .eq('id', currentCustomer.workerId)
        .single();

      if (worker && worker.area_id !== data.areaId) {
        data.workerId = null;
      }
    }

    const { data: updatedCustomer, error } = await supabase
      .from('customers')
      .update({
        name: data.name,
        phone: data.phone,
        address: data.address,
        area_id: data.areaId,
        daily_quantity: data.dailyQuantity,
        rate_per_liter: data.ratePerLiter,
        worker_id: data.workerId,
        status: data.status
      })
      .eq('id', id)
      .select(`
        *,
        areas!customers_area_id_fkey(name),
        workers!customers_worker_id_fkey(name)
      `)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw new Error(`Failed to update customer: ${error.message}`);
    }

    if (currentCustomer.workerId) {
      await this.updateWorkerStats(currentCustomer.workerId);
    }
    if (updatedCustomer.worker_id && updatedCustomer.worker_id !== currentCustomer.workerId) {
      await this.updateWorkerStats(updatedCustomer.worker_id);
    }

    return this.mapCustomerFromDB(updatedCustomer);
  }

  async deleteCustomer(id: number): Promise<boolean> {
    const customer = await this.getCustomerById(id);
    if (!customer) return false;

    const { error } = await supabase
      .from('customers')
      .delete()
      .eq('id', id);

    if (error) throw new Error(`Failed to delete customer: ${error.message}`);

    if (customer.workerId) {
      await this.updateWorkerStats(customer.workerId);
    }

    return true;
  }

  // =====================================
  // WORKER METHODS
  // =====================================

  async getWorkers(filters?: any): Promise<Worker[]> {
    let query = supabase
      .from('workers')
      .select(`
        *,
        areas!workers_area_id_fkey(name)
      `)
      .order('name');

    if (filters?.status) {
      query = query.eq('status', filters.status);
    }
    if (filters?.area) {
      query = query.eq('area_id', parseInt(filters.area));
    }
    if (filters?.search) {
      query = query.or(`name.ilike.%${filters.search}%,phone.ilike.%${filters.search}%,email.ilike.%${filters.search}%`);
    }

    const { data, error } = await query;

    if (error) throw new Error(`Failed to get workers: ${error.message}`);
    
    return data?.map(this.mapWorkerFromDB) || [];
  }

  async getWorkerById(id: number): Promise<Worker | null> {
    const { data, error } = await supabase
      .from('workers')
      .select(`
        *,
        areas!workers_area_id_fkey(name)
      `)
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw new Error(`Failed to get worker: ${error.message}`);
    }

    return data ? this.mapWorkerFromDB(data) : null;
  }

  async createWorker(data: CreateWorkerRequest): Promise<Worker> {
    const area = await this.getAreaById(data.areaId);
    if (!area) {
      throw new Error('Area not found');
    }

    const { data: newWorker, error } = await supabase
      .from('workers')
      .insert({
        name: data.name,
        phone: data.phone,
        email: data.email,
        area_id: data.areaId,
        address: data.address,
        emergency_contact: data.emergencyContact,
        status: data.status || 'active'
      })
      .select(`
        *,
        areas!workers_area_id_fkey(name)
      `)
      .single();

    if (error) throw new Error(`Failed to create worker: ${error.message}`);

    return this.mapWorkerFromDB(newWorker);
  }

  async updateWorker(id: number, data: UpdateWorkerRequest): Promise<Worker | null> {
    const currentWorker = await this.getWorkerById(id);
    if (!currentWorker) return null;

    if (data.areaId && data.areaId !== currentWorker.areaId) {
      await supabase
        .from('customers')
        .update({ worker_id: null })
        .eq('worker_id', id);
    }

    const { data: updatedWorker, error } = await supabase
      .from('workers')
      .update({
        name: data.name,
        phone: data.phone,
        email: data.email,
        area_id: data.areaId,
        address: data.address,
        emergency_contact: data.emergencyContact,
        status: data.status
      })
      .eq('id', id)
      .select(`
        *,
        areas!workers_area_id_fkey(name)
      `)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw new Error(`Failed to update worker: ${error.message}`);
    }

    await this.updateWorkerStats(id);

    return this.mapWorkerFromDB(updatedWorker);
  }

  async deleteWorker(id: number): Promise<boolean> {
    const { data: customers } = await supabase
      .from('customers')
      .select('id')
      .eq('worker_id', id)
      .eq('status', 'active');

    if (customers && customers.length > 0) {
      throw new Error(`Cannot delete worker. Worker has ${customers.length} active assigned customer(s).`);
    }

    const { error } = await supabase
      .from('workers')
      .delete()
      .eq('id', id);

    if (error) throw new Error(`Failed to delete worker: ${error.message}`);

    return true;
  }

  async getWorkerCustomers(workerId: number): Promise<Customer[]> {
    const { data, error } = await supabase
      .from('customers')
      .select(`
        *,
        areas!customers_area_id_fkey(name),
        workers!customers_worker_id_fkey(name)
      `)
      .eq('worker_id', workerId)
      .order('name');

    if (error) throw new Error(`Failed to get worker customers: ${error.message}`);
    
    return data?.map(this.mapCustomerFromDB) || [];
  }

  async assignCustomersToWorker(workerId: number, customerIds: number[]): Promise<void> {
    const { error } = await supabase
      .from('customers')
      .update({ worker_id: workerId })
      .in('id', customerIds);

    if (error) throw new Error(`Failed to assign customers: ${error.message}`);

    await this.updateWorkerStats(workerId);
  }

  // =====================================
  // PAYMENT METHODS
  // =====================================

  async getPayments(filters?: any): Promise<Payment[]> {
    let query = supabase
      .from('payments')
      .select(`
        *,
        customers!payments_customer_id_fkey(name)
      `)
      .order('created_at', { ascending: false });

    if (filters?.customerId) {
      query = query.eq('customer_id', parseInt(filters.customerId));
    }
    if (filters?.status) {
      query = query.eq('status', filters.status);
    }
    if (filters?.month && filters?.year) {
      query = query.eq('month', filters.month).eq('year', parseInt(filters.year));
    }

    const { data, error } = await query;

    if (error) throw new Error(`Failed to get payments: ${error.message}`);
    
    return data?.map(this.mapPaymentFromDB) || [];
  }

  async createPayment(data: RecordPaymentRequest): Promise<{ payment: Payment; summary: PaymentSummary | null; errors: string[]; warnings: string[] }> {
    const customer = await this.getCustomerById(data.customerId);
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!customer) {
      errors.push('Customer not found');
      return { payment: null as any, summary: null, errors, warnings };
    }

    const currentSummary = await this.getCustomerPaymentSummary(data.customerId);
    if (!currentSummary) {
      errors.push('Unable to calculate customer payment summary');
      return { payment: null as any, summary: null, errors, warnings };
    }

    const validation = PaymentCalculationEngine.validatePaymentAmount(data.amount, currentSummary.totalDue);
    if (!validation.isValid) {
      errors.push(...validation.errors);
      return { payment: null as any, summary: null, errors, warnings };
    }
    warnings.push(...validation.warnings);

    const paymentResult = PaymentCalculationEngine.processPayment(
      customer,
      data.amount,
      currentSummary
    );

    const { data: payment, error } = await supabase
      .from('payments')
      .insert({
        customer_id: data.customerId,
        amount: data.amount,
        payment_method: data.paymentMethod,
        status: 'paid',
        month: data.month || new Date().toLocaleString('default', { month: 'long' }),
        year: data.year || new Date().getFullYear(),
        paid_date: data.paidDate || new Date().toISOString().split('T')[0],
        notes: data.notes || this.generatePaymentNotes(paymentResult.allocation, data.amount)
      })
      .select(`
        *,
        customers!payments_customer_id_fkey(name)
      `)
      .single();

    if (error) throw new Error(`Failed to create payment: ${error.message}`);

    await supabase
      .from('customers')
      .update({
        pending_dues: paymentResult.newCustomerState.pendingDues,
        last_payment: paymentResult.newCustomerState.lastPayment
      })
      .eq('id', data.customerId);

    const updatedSummary = await this.getCustomerPaymentSummary(data.customerId);

    return {
      payment: this.mapPaymentFromDB(payment),
      summary: updatedSummary,
      errors,
      warnings
    };
  }

  async getCustomerPaymentSummary(customerId: number): Promise<PaymentSummary | null> {
    const customer = await this.getCustomerById(customerId);
    if (!customer) return null;

    const payments = await this.getPayments({ customerId });
    const deliveries = await this.getDailyDeliveries(undefined, customerId);

    return PaymentCalculationEngine.calculateCustomerPaymentSummary(
      customer,
      payments,
      deliveries
    );
  }

  // =====================================
  // DAILY OPERATIONS
  // =====================================

  async getDailyDeliveries(date?: string, customerId?: number, workerId?: number): Promise<DailyDelivery[]> {
    let query = supabase
      .from('daily_deliveries')
      .select(`
        *,
        customers!daily_deliveries_customer_id_fkey(name),
        workers!daily_deliveries_worker_id_fkey(name)
      `)
      .order('date', { ascending: false });

    if (date) {
      query = query.eq('date', date);
    }
    if (customerId) {
      query = query.eq('customer_id', customerId);
    }
    if (workerId) {
      query = query.eq('worker_id', workerId);
    }

    const { data, error } = await query;

    if (error) throw new Error(`Failed to get daily deliveries: ${error.message}`);
    
    return data?.map(this.mapDailyDeliveryFromDB) || [];
  }

  async createDailyDelivery(data: CreateDailyDeliveryRequest): Promise<DailyDelivery> {
    const { data: delivery, error } = await supabase
      .from('daily_deliveries')
      .insert({
        customer_id: data.customerId,
        worker_id: data.workerId,
        date: data.date,
        quantity_delivered: data.quantityDelivered,
        rate_per_liter: data.ratePerLiter,
        status: data.status || 'delivered',
        notes: data.notes,
        delivery_time: data.deliveryTime
      })
      .select(`
        *,
        customers!daily_deliveries_customer_id_fkey(name),
        workers!daily_deliveries_worker_id_fkey(name)
      `)
      .single();

    if (error) throw new Error(`Failed to create daily delivery: ${error.message}`);

    await this.updateCustomerMonthlyAmount(data.customerId);
    if (data.workerId) {
      await this.updateWorkerStats(data.workerId);
    }

    return this.mapDailyDeliveryFromDB(delivery);
  }

  async getDailyQuantities(customerId?: number, date?: string): Promise<DailyQuantity[]> {
    let query = supabase
      .from('daily_quantities')
      .select('*')
      .order('date');

    if (customerId) {
      query = query.eq('customer_id', customerId);
    }
    if (date) {
      query = query.eq('date', date);
    }

    const { data, error } = await query;

    if (error) throw new Error(`Failed to get daily quantities: ${error.message}`);
    
    return data?.map(this.mapDailyQuantityFromDB) || [];
  }

  async updateCustomerQuantity(customerId: number, date: string, quantity: number): Promise<boolean> {
    const now = new Date();
    const currentHour = now.getHours();
    const isValidTime = currentHour >= 18 && currentHour < 22;

    if (!isValidTime) {
      return false;
    }

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];

    if (date !== tomorrowStr) {
      return false;
    }

    const { error } = await supabase
      .from('daily_quantities')
      .upsert({
        customer_id: customerId,
        date: date,
        requested_quantity: quantity,
        current_quantity: quantity,
        requested_at: new Date().toISOString()
      });

    if (error) {
      console.error('Failed to update quantity:', error);
      return false;
    }

    await supabase
      .from('customers')
      .update({ next_day_quantity: quantity })
      .eq('id', customerId);

    return true;
  }

  // =====================================
  // SETTINGS METHODS
  // =====================================

  async getBusinessSettings(): Promise<BusinessSettings | null> {
    const { data, error } = await supabase
      .from('business_settings')
      .select('*')
      .limit(1)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw new Error(`Failed to get business settings: ${error.message}`);
    }

    return data ? this.mapBusinessSettingsFromDB(data) : null;
  }

  async updateBusinessSettings(data: BusinessSettings): Promise<BusinessSettings> {
    const { data: updated, error } = await supabase
      .from('business_settings')
      .upsert({
        id: 1,
        business_name: data.businessName,
        owner_name: data.ownerName,
        phone: data.phone,
        email: data.email,
        address: data.address,
        gst_number: data.gstNumber,
        registration_number: data.registrationNumber,
        website: data.website
      })
      .select()
      .single();

    if (error) throw new Error(`Failed to update business settings: ${error.message}`);

    return this.mapBusinessSettingsFromDB(updated);
  }

  async getPricingSettings(): Promise<PricingSettings | null> {
    const { data, error } = await supabase
      .from('pricing_settings')
      .select('*')
      .limit(1)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw new Error(`Failed to get pricing settings: ${error.message}`);
    }

    return data ? this.mapPricingSettingsFromDB(data) : null;
  }

  async updatePricingSettings(data: PricingSettings): Promise<PricingSettings> {
    const { data: updated, error } = await supabase
      .from('pricing_settings')
      .upsert({
        id: 1,
        default_rate: data.defaultRate,
        premium_rate: data.premiumRate,
        bulk_rate: data.bulkRate,
        minimum_order: data.minimumOrder,
        delivery_charge: data.deliveryCharge,
        late_fee: data.lateFee,
        currency: data.currency
      })
      .select()
      .single();

    if (error) throw new Error(`Failed to update pricing settings: ${error.message}`);

    return this.mapPricingSettingsFromDB(updated);
  }

  async getPaymentGatewaySettings(): Promise<PaymentGatewaySettings | null> {
    const { data, error } = await supabase
      .from('payment_gateway_settings')
      .select('*')
      .limit(1)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw new Error(`Failed to get payment gateway settings: ${error.message}`);
    }

    return data ? this.mapPaymentGatewaySettingsFromDB(data) : null;
  }

  async updatePaymentGatewaySettings(data: PaymentGatewaySettings): Promise<PaymentGatewaySettings> {
    const { data: updated, error } = await supabase
      .from('payment_gateway_settings')
      .upsert({
        id: 1,
        razorpay_enabled: data.razorpayEnabled,
        razorpay_key_id: data.razorpayKeyId,
        razorpay_secret: data.razorpaySecret,
        upi_enabled: data.upiEnabled,
        upi_id: data.upiId
      })
      .select()
      .single();

    if (error) throw new Error(`Failed to update payment gateway settings: ${error.message}`);

    return this.mapPaymentGatewaySettingsFromDB(updated);
  }

  // =====================================
  // DASHBOARD METHODS
  // =====================================

  async getDashboardStats(): Promise<DashboardStats> {
    const [customers, workers, todayDeliveries] = await Promise.all([
      this.getCustomers({ status: 'active' }),
      this.getWorkers({ status: 'active' }),
      this.getDailyDeliveries(new Date().toISOString().split('T')[0])
    ]);

    const currentMonth = new Date().getMonth() + 1;
    const currentYear = new Date().getFullYear();

    const { data: monthlyDeliveries } = await supabase
      .from('daily_deliveries')
      .select('daily_amount, quantity_delivered')
      .gte('date', `${currentYear}-${currentMonth.toString().padStart(2, '0')}-01`)
      .lt('date', `${currentYear}-${(currentMonth + 1).toString().padStart(2, '0')}-01`);

    const monthlyRevenue = monthlyDeliveries?.reduce((sum, d) => sum + (d.daily_amount || 0), 0) || 0;
    const totalMilkSold = monthlyDeliveries?.reduce((sum, d) => sum + (d.quantity_delivered || 0), 0) || 0;

    const { data: newCustomersData } = await supabase
      .from('customers')
      .select('id')
      .gte('join_date', `${currentYear}-${currentMonth.toString().padStart(2, '0')}-01`)
      .lt('join_date', `${currentYear}-${(currentMonth + 1).toString().padStart(2, '0')}-01`);

    const pendingDues = customers.reduce((sum, c) => sum + (c.pendingDues || 0), 0);
    const todayRevenue = todayDeliveries.reduce((sum, d) => sum + d.dailyAmount, 0);
    const milkDelivered = todayDeliveries.reduce((sum, d) => sum + d.quantityDelivered, 0);

    return {
      totalCustomers: customers.length,
      activeWorkers: workers.length,
      todayRevenue,
      milkDelivered,
      monthlyRevenue,
      totalMilkSold,
      pendingDues,
      newCustomers: newCustomersData?.length || 0,
      collectionRate: monthlyRevenue > 0 ? ((monthlyRevenue - pendingDues) / monthlyRevenue) * 100 : 0,
      todayDeliveries: todayDeliveries.length,
      tomorrowOrders: 0,
      dailyAverageRevenue: monthlyRevenue / new Date().getDate(),
      currentMonthDays: new Date().getDate(),
    };
  }

  // =====================================
  // REPORTS METHODS
  // =====================================

  async getMonthlyReports(period: string = '6months'): Promise<MonthlyReport[]> {
    const monthsToInclude = this.getMonthsFromPeriod(period);
    const reports: MonthlyReport[] = [];

    for (let i = monthsToInclude - 1; i >= 0; i--) {
      const reportDate = new Date();
      reportDate.setMonth(reportDate.getMonth() - i);
      const month = reportDate.getMonth() + 1;
      const year = reportDate.getFullYear();
      const monthName = reportDate.toLocaleString('default', { month: 'long' });

      const [deliveries, payments, customers] = await Promise.all([
        this.getMonthlyDeliveries(month, year),
        this.getMonthlyPayments(monthName, year),
        this.getMonthlyCustomers(month, year)
      ]);

      const totalRevenue = deliveries.reduce((sum, d) => sum + (d.daily_amount || 0), 0);
      const milkSold = deliveries.reduce((sum, d) => sum + (d.quantity_delivered || 0), 0);
      const collectedRevenue = payments.filter(p => p.status === 'paid').reduce((sum, p) => sum + p.amount, 0);

      reports.push({
        month: monthName,
        year,
        totalCustomers: customers.length,
        activeCustomers: customers.filter(c => c.status === 'active').length,
        totalRevenue,
        collectedRevenue,
        pendingRevenue: customers.reduce((sum, c) => sum + (c.pending_dues || 0), 0),
        milkSold,
        newCustomers: customers.filter(c => {
          const joinDate = new Date(c.join_date);
          return joinDate.getMonth() === reportDate.getMonth() && joinDate.getFullYear() === year;
        }).length,
      });
    }

    return reports;
  }

  async getWorkerPerformanceReport(period: string = '6months'): Promise<WorkerPerformance[]> {
    const workers = await this.getWorkers({ status: 'active' });
    const currentMonth = new Date().getMonth() + 1;
    const currentYear = new Date().getFullYear();

    const performance: WorkerPerformance[] = [];

    for (const worker of workers) {
      const customers = await this.getWorkerCustomers(worker.id);
      
      const { data: deliveries } = await supabase
        .from('daily_deliveries')
        .select('quantity_delivered')
        .eq('worker_id', worker.id)
        .gte('date', `${currentYear}-${currentMonth.toString().padStart(2, '0')}-01`)
        .lt('date', `${currentYear}-${(currentMonth + 1).toString().padStart(2, '0')}-01`);

      const milkDelivered = deliveries?.reduce((sum, d) => sum + (d.quantity_delivered || 0), 0) || 0;

      performance.push({
        workerId: worker.id,
        workerName: worker.name,
        area: worker.areaName || 'Unknown',
        customers: customers.length,
        revenue: customers.reduce((sum, c) => sum + (c.monthlyAmount || 0), 0),
        milkDelivered,
        efficiency: worker.efficiency,
        onTimeDeliveries: worker.onTimeDeliveries,
        totalDeliveries: worker.totalDeliveries,
        rating: worker.rating,
      });
    }

    return performance;
  }

  async getAreaWiseReport(period: string = '6months'): Promise<AreaReport[]> {
    const areas = await this.getAreas();
    const reports: AreaReport[] = [];

    for (const area of areas) {
      const customers = await this.getCustomers({ area: area.id.toString(), status: 'active' });
      const workers = await this.getWorkers({ area: area.id.toString(), status: 'active' });

      const currentMonth = new Date().getMonth() + 1;
      const currentYear = new Date().getFullYear();

      const { data: deliveries } = await supabase
        .from('daily_deliveries')
        .select('daily_amount, quantity_delivered, customer_id')
        .in('customer_id', customers.map(c => c.id))
        .gte('date', `${currentYear}-${currentMonth.toString().padStart(2, '0')}-01`)
        .lt('date', `${currentYear}-${(currentMonth + 1).toString().padStart(2, '0')}-01`);

      const revenue = deliveries?.reduce((sum, d) => sum + (d.daily_amount || 0), 0) || 0;
      const milkSold = deliveries?.reduce((sum, d) => sum + (d.quantity_delivered || 0), 0) || 0;
      const pendingDues = customers.reduce((sum, c) => sum + (c.pendingDues || 0), 0);

      reports.push({
        area: area.name,
        customers: customers.length,
        revenue,
        milkSold,
        pendingDues,
        workers: workers.length,
      });
    }

    return reports;
  }

  async getPaymentMethodReport(period: string = '6months'): Promise<PaymentMethodReport[]> {
    const monthsToInclude = this.getMonthsFromPeriod(period);
    const cutoffDate = new Date();
    cutoffDate.setMonth(cutoffDate.getMonth() - monthsToInclude);

    const { data: payments, error } = await supabase
      .from('payments')
      .select('payment_method, amount')
      .gte('created_at', cutoffDate.toISOString());

    if (error) throw new Error(`Failed to get payment method report: ${error.message}`);

    const methodStats = payments?.reduce((acc: any, payment) => {
      if (!acc[payment.payment_method]) {
        acc[payment.payment_method] = { amount: 0, transactions: 0 };
      }
      acc[payment.payment_method].amount += payment.amount;
      acc[payment.payment_method].transactions++;
      return acc;
    }, {}) || {};

    const totalAmount = Object.values(methodStats).reduce((sum: number, stat: any) => sum + stat.amount, 0);

    return Object.entries(methodStats).map(([method, stat]: [string, any]) => ({
      method: method as any,
      percentage: totalAmount > 0 ? (stat.amount / totalAmount) * 100 : 0,
      amount: stat.amount,
      transactions: stat.transactions,
    }));
  }

  // =====================================
  // CUSTOMER QUANTITY LINKS
  // =====================================

  async generateCustomerQuantityLink(customerId: number): Promise<CustomerQuantityLink | null> {
    const customer = await this.getCustomerById(customerId);
    if (!customer) return null;

    const now = new Date();
    const currentHour = now.getHours();
    const isValidTime = currentHour >= 18 && currentHour < 22;

    const token = this.generateUniqueToken();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    const { error } = await supabase
      .from('customer_quantity_links')
      .upsert({
        customer_id: customerId,
        unique_token: token,
        next_day_quantity: customer.nextDayQuantity || customer.dailyQuantity,
        expires_at: expiresAt.toISOString(),
        can_change: isValidTime
      });

    if (error) throw new Error(`Failed to generate quantity link: ${error.message}`);

    await supabase
      .from('customers')
      .update({ unique_link: token })
      .eq('id', customerId);

    return {
      customerId: customer.id,
      customerName: customer.name,
      currentQuantity: customer.dailyQuantity,
      nextDayQuantity: customer.nextDayQuantity || customer.dailyQuantity,
      uniqueToken: token,
      expiresAt: expiresAt.toISOString(),
      canChange: isValidTime,
    };
  }

  async getCustomerByToken(token: string): Promise<CustomerQuantityLink | null> {
    const { data, error } = await supabase
      .from('customer_quantity_links')
      .select(`
        *,
        customers!customer_quantity_links_customer_id_fkey(name, daily_quantity, next_day_quantity)
      `)
      .eq('unique_token', token)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw new Error(`Failed to get customer by token: ${error.message}`);
    }

    const customer = data.customers;
    const now = new Date();
    const currentHour = now.getHours();
    const isValidTime = currentHour >= 18 && currentHour < 22;

    return {
      customerId: data.customer_id,
      customerName: customer.name,
      currentQuantity: customer.daily_quantity,
      nextDayQuantity: data.next_day_quantity || customer.daily_quantity,
      uniqueToken: token,
      expiresAt: data.expires_at,
      canChange: data.can_change && isValidTime,
    };
  }

  async updateQuantityByToken(token: string, quantity: number, date: string): Promise<boolean> {
    const customerLink = await this.getCustomerByToken(token);
    if (!customerLink || !customerLink.canChange) {
      return false;
    }

    return await this.updateCustomerQuantity(customerLink.customerId, date, quantity);
  }

  async calculateDailyTotals(date: string) {
    const deliveries = await this.getDailyDeliveries(date);
    return {
      totalRevenue: deliveries.reduce((sum, d) => sum + d.dailyAmount, 0),
      totalMilk: deliveries.reduce((sum, d) => sum + d.quantityDelivered, 0),
      customerCount: new Set(deliveries.map(d => d.customerId)).size,
    };
  }

  // =====================================
  // HELPER METHODS
  // =====================================

  private generateUniqueToken(): string {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  }

  private generatePaymentNotes(allocation: any, amount: number): string {
    const notes: string[] = [];

    if (allocation.olderDues > 0) {
      notes.push(`₹${allocation.olderDues} applied to older dues`);
    }
    if (allocation.month3 > 0) {
      notes.push(`₹${allocation.month3} applied to 3 months ago`);
    }
    if (allocation.month2 > 0) {
      notes.push(`₹${allocation.month2} applied to 2 months ago`);
    }
    if (allocation.month1 > 0) {
      notes.push(`₹${allocation.month1} applied to last month`);
    }
    if (allocation.currentMonth > 0) {
      notes.push(`₹${allocation.currentMonth} applied to current month`);
    }
    if (allocation.credit > 0) {
      notes.push(`₹${allocation.credit} credited as advance payment`);
    }

    return notes.length > 0 ? notes.join(', ') : `Payment of ₹${amount} processed`;
  }

  private getMonthsFromPeriod(period: string): number {
    switch (period) {
      case '1month': return 1;
      case '3months': return 3;
      case '6months': return 6;
      case '1year': return 12;
      default: return 6;
    }
  }

  private async getMonthlyDeliveries(month: number, year: number) {
    const { data, error } = await supabase
      .from('daily_deliveries')
      .select('daily_amount, quantity_delivered')
      .gte('date', `${year}-${month.toString().padStart(2, '0')}-01`)
      .lt('date', `${year}-${(month + 1).toString().padStart(2, '0')}-01`);

    if (error) throw new Error(`Failed to get monthly deliveries: ${error.message}`);
    return data || [];
  }

  private async getMonthlyPayments(month: string, year: number) {
    const { data, error } = await supabase
      .from('payments')
      .select('*')
      .eq('month', month)
      .eq('year', year);

    if (error) throw new Error(`Failed to get monthly payments: ${error.message}`);
    return data || [];
  }

  private async getMonthlyCustomers(month: number, year: number) {
    const { data, error } = await supabase
      .from('customers')
      .select('*')
      .lte('join_date', `${year}-${month.toString().padStart(2, '0')}-31`);

    if (error) throw new Error(`Failed to get monthly customers: ${error.message}`);
    return data || [];
  }

  private async updateWorkerStats(workerId: number): Promise<void> {
    const { data: customers } = await supabase
      .from('customers')
      .select('current_month_amount')
      .eq('worker_id', workerId)
      .eq('status', 'active');

    const customersAssigned = customers?.length || 0;
    const monthlyRevenue = customers?.reduce((sum, c) => sum + (c.current_month_amount || 0), 0) || 0;

    const currentMonth = new Date().getMonth() + 1;
    const currentYear = new Date().getFullYear();

    const { data: deliveries } = await supabase
      .from('daily_deliveries')
      .select('status')
      .eq('worker_id', workerId)
      .gte('date', `${currentYear}-${currentMonth.toString().padStart(2, '0')}-01`)
      .lt('date', `${currentYear}-${(currentMonth + 1).toString().padStart(2, '0')}-01`);

    const totalDeliveries = deliveries?.length || 0;
    const onTimeDeliveries = deliveries?.filter(d => d.status === 'delivered').length || 0;
    const efficiency = totalDeliveries > 0 ? (onTimeDeliveries / totalDeliveries) * 100 : 0;

    await supabase
      .from('workers')
      .update({
        customers_assigned: customersAssigned,
        monthly_revenue: monthlyRevenue,
        total_deliveries: totalDeliveries,
        on_time_deliveries: onTimeDeliveries,
        efficiency: efficiency
      })
      .eq('id', workerId);
  }

  private async updateCustomerMonthlyAmount(customerId: number): Promise<void> {
    const currentMonth = new Date().getMonth() + 1;
    const currentYear = new Date().getFullYear();

    const { data: deliveries } = await supabase
      .from('daily_deliveries')
      .select('daily_amount')
      .eq('customer_id', customerId)
      .gte('date', `${currentYear}-${currentMonth.toString().padStart(2, '0')}-01`)
      .lt('date', `${currentYear}-${(currentMonth + 1).toString().padStart(2, '0')}-01`);

    const monthlyAmount = deliveries?.reduce((sum, d) => sum + (d.daily_amount || 0), 0) || 0;
    const deliveryCount = deliveries?.length || 0;

    await supabase
      .from('customers')
      .update({
        current_month_amount: monthlyAmount,
        current_month_deliveries: deliveryCount,
        monthly_amount: monthlyAmount
      })
      .eq('id', customerId);
  }

  // =====================================
  // DATA MAPPING METHODS
  // =====================================

  private mapAreaFromDB(data: any): Area {
    return {
      id: data.id,
      name: data.name,
      description: data.description,
      createdAt: data.created_at,
      updatedAt: data.updated_at
    };
  }

  private mapCustomerFromDB(data: any): Customer {
    return {
      id: data.id,
      name: data.name,
      phone: data.phone,
      address: data.address,
      areaId: data.area_id,
      areaName: data.areas?.name,
      dailyQuantity: data.daily_quantity,
      ratePerLiter: data.rate_per_liter,
      monthlyAmount: data.monthly_amount || 0,
      workerId: data.worker_id || 0,
      workerName: data.workers?.name,
      status: data.status,
      joinDate: data.join_date,
      lastPayment: data.last_payment,
      pendingDues: data.pending_dues || 0,
      currentMonthDeliveries: data.current_month_deliveries || 0,
      currentMonthAmount: data.current_month_amount || 0,
      nextDayQuantity: data.next_day_quantity,
      canChangeQuantity: data.can_change_quantity,
      uniqueLink: data.unique_link,
      createdAt: data.created_at,
      updatedAt: data.updated_at
    };
  }

  private mapWorkerFromDB(data: any): Worker {
    return {
      id: data.id,
      name: data.name,
      phone: data.phone,
      email: data.email,
      areaId: data.area_id,
      areaName: data.areas?.name,
      address: data.address,
      emergencyContact: data.emergency_contact,
      joinDate: data.join_date,
      status: data.status,
      customersAssigned: data.customers_assigned || 0,
      monthlyRevenue: data.monthly_revenue || 0,
      efficiency: data.efficiency || 0,
      onTimeDeliveries: data.on_time_deliveries || 0,
      totalDeliveries: data.total_deliveries || 0,
      rating: data.rating || 0,
      createdAt: data.created_at,
      updatedAt: data.updated_at
    };
  }

  private mapPaymentFromDB(data: any): Payment {
    return {
      id: data.id,
      customerId: data.customer_id,
      customerName: data.customers?.name,
      amount: data.amount,
      paymentMethod: data.payment_method,
      status: data.status,
      month: data.month,
      year: data.year,
      dueDate: data.due_date,
      paidDate: data.paid_date,
      notes: data.notes,
      createdAt: data.created_at,
      updatedAt: data.updated_at
    };
  }

  private mapDailyDeliveryFromDB(data: any): DailyDelivery {
    return {
      id: data.id,
      customerId: data.customer_id,
      customerName: data.customers?.name,
      workerId: data.worker_id || 0,
      workerName: data.workers?.name,
      date: data.date,
      quantityDelivered: data.quantity_delivered,
      ratePerLiter: data.rate_per_liter,
      dailyAmount: data.daily_amount,
      status: data.status,
      notes: data.notes,
      deliveryTime: data.delivery_time,
      createdAt: data.created_at,
      updatedAt: data.updated_at
    };
  }

  private mapDailyQuantityFromDB(data: any): DailyQuantity {
    return {
      id: data.id,
      customerId: data.customer_id,
      date: data.date,
      requestedQuantity: data.requested_quantity || 0,
      currentQuantity: data.current_quantity || 0,
      isLocked: data.is_locked,
      requestedAt: data.requested_at,
      lockedAt: data.locked_at,
      createdAt: data.created_at,
      updatedAt: data.updated_at
    };
  }

  private mapBusinessSettingsFromDB(data: any): BusinessSettings {
    return {
      businessName: data.business_name,
      ownerName: data.owner_name,
      phone: data.phone,
      email: data.email,
      address: data.address,
      gstNumber: data.gst_number,
      registrationNumber: data.registration_number,
      website: data.website
    };
  }

  private mapPricingSettingsFromDB(data: any): PricingSettings {
    return {
      defaultRate: data.default_rate,
      premiumRate: data.premium_rate,
      bulkRate: data.bulk_rate,
      minimumOrder: data.minimum_order,
      deliveryCharge: data.delivery_charge,
      lateFee: data.late_fee,
      currency: data.currency
    };
  }

  private mapPaymentGatewaySettingsFromDB(data: any): PaymentGatewaySettings {
    return {
      razorpayEnabled: data.razorpay_enabled,
      razorpayKeyId: data.razorpay_key_id,
      razorpaySecret: data.razorpay_secret,
      upiEnabled: data.upi_enabled,
      upiId: data.upi_id
    };
  }
}

export const supabaseService = new SupabaseService();