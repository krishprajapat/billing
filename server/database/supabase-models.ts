import {
  Customer,
  Worker,
  Payment,
  MonthlyBill,
  DailyDelivery,
  DailyQuantity,
  DailyBilling,
  CustomerQuantityLink,
  User,
  BusinessSettings,
  PricingSettings,
  PaymentGatewaySettings,
  Area,
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
import { supabase } from './supabase';
import { PaymentCalculationEngine, PaymentSummary } from './payment-engine';

export class SupabaseDatabase {
  private paymentEngine = new PaymentCalculationEngine();

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
      if (error.code === 'PGRST116') return null; // Not found
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
      if (error.code === 'PGRST116') return null; // Not found
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

    // Apply filters
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
      if (error.code === 'PGRST116') return null; // Not found
      throw new Error(`Failed to get customer: ${error.message}`);
    }

    return data ? this.mapCustomerFromDB(data) : null;
  }

  async createCustomer(data: CreateCustomerRequest): Promise<Customer> {
    // Get universal pricing
    const pricingSettings = await this.getPricingSettings();
    const appliedRate = pricingSettings?.defaultRate ?? data.ratePerLiter;

    // Validate worker serves the area
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
        monthly_amount: 0, // New customers start with 0
        worker_id: data.workerId || null,
        status: data.status || 'active'
      })
      .select(`
        *,
        areas!customers_area_id_fkey(name),
        workers!customers_worker_id_fkey(name)
      `)
      .single();

    if (error) throw new Error(`Failed to create customer: ${error.message}`);

    // Update worker stats
    if (newCustomer.worker_id) {
      await this.updateWorkerStats(newCustomer.worker_id);
    }

    return this.mapCustomerFromDB(newCustomer);
  }

  async updateCustomer(id: number, data: UpdateCustomerRequest): Promise<Customer | null> {
    // Get current customer
    const currentCustomer = await this.getCustomerById(id);
    if (!currentCustomer) return null;

    // Check if quantity is being changed and validate time window
    if (data.dailyQuantity && data.dailyQuantity !== currentCustomer.dailyQuantity) {
      const now = new Date();
      const currentHour = now.getHours();
      const isValidTime = currentHour >= 18 && currentHour < 22; // 6 PM to 10 PM

      if (!isValidTime) {
        throw new Error('Quantity changes are only allowed between 6:00 PM and 10:00 PM');
      }
    }

    // If area is changing, check worker compatibility
    if (data.areaId && data.areaId !== currentCustomer.areaId && currentCustomer.workerId) {
      const { data: worker } = await supabase
        .from('workers')
        .select('area_id')
        .eq('id', currentCustomer.workerId)
        .single();

      if (worker && worker.area_id !== data.areaId) {
        // Unassign worker if they don't serve the new area
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
      if (error.code === 'PGRST116') return null; // Not found
      throw new Error(`Failed to update customer: ${error.message}`);
    }

    // Update worker stats for old and new workers
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

    // Update worker stats
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

    // Apply filters
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

  async createWorker(data: CreateWorkerRequest): Promise<Worker> {
    // Verify area exists
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
    // If area is changing, unassign all customers
    const currentWorker = await this.getWorkerById(id);
    if (currentWorker && data.areaId && data.areaId !== currentWorker.areaId) {
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
      if (error.code === 'PGRST116') return null; // Not found
      throw new Error(`Failed to update worker: ${error.message}`);
    }

    // Update stats
    await this.updateWorkerStats(id);

    return this.mapWorkerFromDB(updatedWorker);
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
      if (error.code === 'PGRST116') return null; // Not found
      throw new Error(`Failed to get worker: ${error.message}`);
    }

    return data ? this.mapWorkerFromDB(data) : null;
  }

  async deleteWorker(id: number): Promise<boolean> {
    // Check if worker has assigned customers
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
      if (error.code === 'PGRST116') return null; // Not found
      throw new Error(`Failed to get business settings: ${error.message}`);
    }

    return data ? this.mapBusinessSettingsFromDB(data) : null;
  }

  async updateBusinessSettings(data: BusinessSettings): Promise<BusinessSettings> {
    const { data: updated, error } = await supabase
      .from('business_settings')
      .upsert({
        id: 1, // Single row table
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
      if (error.code === 'PGRST116') return null; // Not found
      throw new Error(`Failed to get pricing settings: ${error.message}`);
    }

    return data ? this.mapPricingSettingsFromDB(data) : null;
  }

  async updatePricingSettings(data: PricingSettings): Promise<PricingSettings> {
    const { data: updated, error } = await supabase
      .from('pricing_settings')
      .upsert({
        id: 1, // Single row table
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
      if (error.code === 'PGRST116') return null; // Not found
      throw new Error(`Failed to get payment gateway settings: ${error.message}`);
    }

    return data ? this.mapPaymentGatewaySettingsFromDB(data) : null;
  }

  async updatePaymentGatewaySettings(data: PaymentGatewaySettings): Promise<PaymentGatewaySettings> {
    const { data: updated, error } = await supabase
      .from('payment_gateway_settings')
      .upsert({
        id: 1, // Single row table
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
  // HELPER METHODS - DATA MAPPING
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
      monthlyAmount: data.monthly_amount,
      workerId: data.worker_id || 0,
      workerName: data.workers?.name,
      status: data.status,
      joinDate: data.join_date,
      lastPayment: data.last_payment,
      pendingDues: data.pending_dues,
      currentMonthDeliveries: data.current_month_deliveries,
      currentMonthAmount: data.current_month_amount,
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
      customersAssigned: data.customers_assigned,
      monthlyRevenue: data.monthly_revenue,
      efficiency: data.efficiency,
      onTimeDeliveries: data.on_time_deliveries,
      totalDeliveries: data.total_deliveries,
      rating: data.rating,
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

  // =====================================
  // WORKER STATS UPDATE
  // =====================================

  private async updateWorkerStats(workerId: number): Promise<void> {
    // Get customers assigned to worker
    const { data: customers } = await supabase
      .from('customers')
      .select('current_month_amount')
      .eq('worker_id', workerId)
      .eq('status', 'active');

    const customersAssigned = customers?.length || 0;
    const monthlyRevenue = customers?.reduce((sum, c) => sum + (c.current_month_amount || 0), 0) || 0;

    // Get delivery stats for current month
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

    // Update worker stats
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

  // TODO: Implement remaining methods (payments, deliveries, etc.)
  // This is a partial implementation focusing on core entities
  // Additional methods will be added in the next iteration
}

// Export singleton instance
export const supabaseDatabase = new SupabaseDatabase();
