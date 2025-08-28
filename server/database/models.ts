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
  CustomerStatus,
  WorkerStatus,
  PaymentStatus,
  PaymentMethod,
  UserRole,
  Area
} from '@shared/api';

// In-memory database for demo purposes
// In production, this would be replaced with actual database calls (Supabase, PostgreSQL, etc.)

class Database {
  private customers: Customer[] = [];
  private workers: Worker[] = [];
  private payments: Payment[] = [];
  private monthlyBills: MonthlyBill[] = [];
  private dailyDeliveries: DailyDelivery[] = [];
  private dailyQuantities: DailyQuantity[] = [];
  private dailyBillings: DailyBilling[] = [];
  private customerQuantityLinks: CustomerQuantityLink[] = [];
  private users: User[] = [];
  private areas: Area[] = [];
  private businessSettings: BusinessSettings | null = null;
  private pricingSettings: PricingSettings | null = null;
  private paymentGatewaySettings: PaymentGatewaySettings | null = null;
  private nextCustomerId = 1;
  private nextWorkerId = 1;
  private nextPaymentId = 1;
  private nextBillId = 1;
  private nextUserId = 1;
  private nextDeliveryId = 1;
  private nextQuantityId = 1;
  private nextBillingId = 1;
  private nextAreaId = 1;

  constructor() {
    this.initializeSampleData();
  }

  private initializeSampleData() {
    // Initialize sample areas
    this.areas = [
      {
        id: 1,
        name: "Sector 15",
        description: "Residential area near Metro Station",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: 2,
        name: "Sector 12",
        description: "Commercial and residential mixed area",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: 3,
        name: "Sector 21",
        description: "High-density residential area",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: 4,
        name: "Sector 25",
        description: "New development area",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }
    ];
    this.nextAreaId = 5;

    // Initialize sample workers
    this.workers = [
      {
        id: 1,
        name: "Suresh Kumar",
        phone: "+91 98765 43210",
        email: "suresh@milkflow.com",
        areaId: 1,
        areaName: "Sector 15",
        address: "Village Dadri, Near Main Market",
        emergencyContact: "+91 98765 43211",
        joinDate: "2023-05-15",
        status: "active",
        customersAssigned: 0,
        monthlyRevenue: 0,
        efficiency: 98,
        onTimeDeliveries: 42,
        totalDeliveries: 45,
        rating: 4.8,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: 2,
        name: "Mohan Lal",
        phone: "+91 87654 32109",
        email: "mohan@milkflow.com",
        areaId: 3,
        areaName: "Sector 21",
        address: "Village Mamura, Near Bus Stand",
        emergencyContact: "+91 87654 32110",
        joinDate: "2023-08-20",
        status: "active",
        customersAssigned: 0,
        monthlyRevenue: 0,
        efficiency: 95,
        onTimeDeliveries: 36,
        totalDeliveries: 38,
        rating: 4.6,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }
    ];

    // Initialize sample customers with daily billing support
    this.customers = [
      {
        id: 1,
        name: "Ramesh Kumar",
        phone: "+91 98765 43210",
        address: "123 Main Street, Sector 15, Noida",
        areaId: 1,
        areaName: "Sector 15",
        dailyQuantity: 2,
        ratePerLiter: 60,
        monthlyAmount: 0, // Will be calculated from daily deliveries
        workerId: 1,
        workerName: "Suresh Kumar",
        status: "active",
        joinDate: "2024-01-15",
        lastPayment: "2024-12-01",
        pendingDues: 0,
        currentMonthDeliveries: 0,
        currentMonthAmount: 0,
        nextDayQuantity: 2,
        canChangeQuantity: true,
        uniqueLink: this.generateUniqueToken(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: 2,
        name: "Priya Sharma",
        phone: "+91 87654 32109",
        address: "456 Park Road, Sector 21, Noida",
        areaId: 3,
        areaName: "Sector 21",
        dailyQuantity: 1.5,
        ratePerLiter: 60,
        monthlyAmount: 0, // Will be calculated from daily deliveries
        workerId: 2,
        workerName: "Mohan Lal",
        status: "active",
        joinDate: "2024-02-20",
        lastPayment: "2024-11-28",
        pendingDues: 0,
        currentMonthDeliveries: 0,
        currentMonthAmount: 0,
        nextDayQuantity: 1.5,
        canChangeQuantity: true,
        uniqueLink: this.generateUniqueToken(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }
    ];

    // Initialize sample daily deliveries for current month
    this.initializeDailyDeliveries();

    // Initialize sample users
    this.users = [
      {
        id: 1,
        name: "Admin User",
        email: "admin@milkflow.com",
        role: "Super Admin",
        status: "active",
        lastLogin: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }
    ];

    // Initialize default settings
    this.businessSettings = {
      businessName: "MilkFlow Dairy Services",
      ownerName: "Rajesh Kumar",
      phone: "+91 98765 43210",
      email: "contact@milkflow.com",
      address: "123 Dairy Complex, Sector 15, Noida, UP 201301",
      gstNumber: "09ABCDE1234F1Z5",
      registrationNumber: "12345678901234",
      website: "www.milkflow.com",
    };

    this.pricingSettings = {
      defaultRate: 60,
      premiumRate: 65,
      bulkRate: 55,
      minimumOrder: 0.5,
      deliveryCharge: 0,
      lateFee: 50,
      currency: "INR",
    };

    this.paymentGatewaySettings = {
      razorpayEnabled: true,
      razorpayKeyId: "rzp_test_1234567890",
      upiEnabled: true,
      upiId: "milkflow@paytm",
      bankAccount: "123456789012",
      ifscCode: "HDFC0001234",
      bankName: "HDFC Bank",
      accountHolder: "MilkFlow Dairy Services",
    };

    this.nextCustomerId = Math.max(...this.customers.map(c => c.id), 0) + 1;
    this.nextWorkerId = Math.max(...this.workers.map(w => w.id), 0) + 1;
    this.nextUserId = Math.max(...this.users.map(u => u.id), 0) + 1;

    this.updateWorkerStats();
    this.calculateCustomerMonthlyAmounts();

    // Validate and fix any area consistency issues on startup
    const consistency = this.validateAreaConsistency();
    if (consistency.fixed > 0) {
      console.log(`Fixed ${consistency.fixed} area consistency issues on startup:`, consistency.issues);
    }
  }

  private generateUniqueToken(): string {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  }

  private initializeDailyDeliveries() {
    const today = new Date();
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const currentDate = today.getDate();

    // Generate deliveries for the current month up to today
    for (let day = 1; day <= currentDate; day++) {
      const deliveryDate = new Date(currentYear, currentMonth, day);
      const dateStr = deliveryDate.toISOString().split('T')[0];

      this.customers.forEach(customer => {
        if (customer.status === 'active') {
          // Create delivery record
          const delivery: DailyDelivery = {
            id: this.nextDeliveryId++,
            customerId: customer.id,
            customerName: customer.name,
            workerId: customer.workerId,
            workerName: customer.workerName,
            date: dateStr,
            quantityDelivered: customer.dailyQuantity,
            ratePerLiter: customer.ratePerLiter,
            dailyAmount: customer.dailyQuantity * customer.ratePerLiter,
            status: 'delivered',
            deliveryTime: '07:00',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };
          this.dailyDeliveries.push(delivery);

          // Create quantity record for next day (if not last day of month)
          if (day < daysInMonth) {
            const nextDay = new Date(currentYear, currentMonth, day + 1);
            const nextDayStr = nextDay.toISOString().split('T')[0];

            const quantity: DailyQuantity = {
              id: this.nextQuantityId++,
              customerId: customer.id,
              date: nextDayStr,
              requestedQuantity: customer.dailyQuantity,
              currentQuantity: customer.dailyQuantity,
              isLocked: day >= currentDate, // Lock if it's today or future
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            };
            this.dailyQuantities.push(quantity);
          }
        }
      });
    }
  }

  private calculateCustomerMonthlyAmounts() {
    const today = new Date();
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();

    this.customers.forEach(customer => {
      const customerDeliveries = this.dailyDeliveries.filter(d =>
        d.customerId === customer.id &&
        new Date(d.date).getMonth() === currentMonth &&
        new Date(d.date).getFullYear() === currentYear
      );

      customer.currentMonthDeliveries = customerDeliveries.length;
      customer.currentMonthAmount = customerDeliveries.reduce((sum, d) => sum + d.dailyAmount, 0);
      customer.monthlyAmount = customer.currentMonthAmount;
    });
  }

  private updateWorkerStats() {
    this.workers.forEach(worker => {
      const assignedCustomers = this.customers.filter(c => c.workerId === worker.id && c.status === 'active');
      worker.customersAssigned = assignedCustomers.length;
      worker.monthlyRevenue = assignedCustomers.reduce((sum, c) => sum + c.monthlyAmount, 0);
    });
  }

  // Customer methods
  getCustomers(filters?: any): Customer[] {
    let result = [...this.customers];

    if (filters?.search) {
      const search = filters.search.toLowerCase();
      result = result.filter(c => 
        c.name.toLowerCase().includes(search) ||
        c.phone.includes(search) ||
        c.address.toLowerCase().includes(search)
      );
    }

    if (filters?.status) {
      result = result.filter(c => c.status === filters.status);
    }

    if (filters?.area) {
      result = result.filter(c => c.area === filters.area);
    }

    if (filters?.worker) {
      result = result.filter(c => c.workerId === parseInt(filters.worker));
    }

    return result;
  }

  getCustomerById(id: number): Customer | null {
    return this.customers.find(c => c.id === id) || null;
  }

  createCustomer(data: any): Customer {
    const worker = data.workerId ? this.workers.find(w => w.id === data.workerId) : null;
    const area = this.areas.find(a => a.id === data.areaId);

    // Validate that worker serves the same area as customer (if worker is assigned)
    if (data.workerId && worker && worker.areaId !== data.areaId) {
      throw new Error('Worker does not serve the selected area');
    }

    const customer: Customer = {
      id: this.nextCustomerId++,
      name: data.name,
      phone: data.phone,
      address: data.address,
      areaId: data.areaId || 0,
      areaName: area?.name,
      dailyQuantity: data.dailyQuantity,
      ratePerLiter: data.ratePerLiter,
      monthlyAmount: data.dailyQuantity * data.ratePerLiter * 30,
      workerId: data.workerId || 0,
      workerName: worker?.name,
      status: data.status || 'active',
      joinDate: new Date().toISOString().split('T')[0],
      pendingDues: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.customers.push(customer);
    this.updateWorkerStats();
    return customer;
  }

  updateCustomer(id: number, data: any): Customer | null {
    const index = this.customers.findIndex(c => c.id === id);
    if (index === -1) return null;

    const customer = this.customers[index];
    const worker = data.workerId ? this.workers.find(w => w.id === data.workerId) : null;
    const area = data.areaId ? this.areas.find(a => a.id === data.areaId) : null;

    // Check if quantity is being changed and validate time window
    if (data.dailyQuantity && data.dailyQuantity !== customer.dailyQuantity) {
      const now = new Date();
      const currentHour = now.getHours();
      const isValidTime = currentHour >= 18 && currentHour < 22; // 6 PM to 10 PM

      if (!isValidTime) {
        throw new Error('Quantity changes are only allowed between 6:00 PM and 10:00 PM');
      }
    }

    // If area is being changed and customer has a worker, check if worker serves the new area
    if (data.areaId && data.areaId !== customer.areaId && customer.workerId > 0) {
      const currentWorker = this.workers.find(w => w.id === customer.workerId);
      if (currentWorker && currentWorker.areaId !== data.areaId) {
        // Unassign worker if they don't serve the new area
        data.workerId = 0;
        data.workerName = undefined;
      }
    }

    // Calculate new monthly amount with partial month logic
    let newMonthlyAmount = customer.monthlyAmount;
    if (data.dailyQuantity && data.ratePerLiter &&
        (data.dailyQuantity !== customer.dailyQuantity || data.ratePerLiter !== customer.ratePerLiter)) {

      // Get remaining days in current month
      const today = new Date();
      const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
      const currentDaysDelivered = customer.currentMonthDeliveries || 0;
      const remainingDays = daysInMonth - currentDaysDelivered;

      // Current amount + (remaining days × new rate per day)
      const newDailyRate = data.dailyQuantity * data.ratePerLiter;
      const additionalAmount = remainingDays * newDailyRate;
      newMonthlyAmount = customer.monthlyAmount + additionalAmount;
    }

    this.customers[index] = {
      ...customer,
      ...data,
      areaName: area?.name || customer.areaName,
      monthlyAmount: newMonthlyAmount,
      workerName: worker?.name || (data.workerId === 0 ? undefined : customer.workerName),
      updatedAt: new Date().toISOString(),
    };

    this.updateWorkerStats();
    return this.customers[index];
  }

  deleteCustomer(id: number): boolean {
    const index = this.customers.findIndex(c => c.id === id);
    if (index === -1) return false;

    this.customers.splice(index, 1);
    this.updateWorkerStats();
    return true;
  }

  // Worker methods
  getWorkers(filters?: any): Worker[] {
    let result = [...this.workers];

    if (filters?.search) {
      const search = filters.search.toLowerCase();
      result = result.filter(w =>
        w.name.toLowerCase().includes(search) ||
        w.phone.includes(search) ||
        (w.areaName && w.areaName.toLowerCase().includes(search))
      );
    }

    if (filters?.status) {
      result = result.filter(w => w.status === filters.status);
    }

    return result;
  }

  getWorkerById(id: number): Worker | null {
    return this.workers.find(w => w.id === id) || null;
  }

  createWorker(data: any): Worker {
    const area = this.areas.find(a => a.id === data.areaId);

    if (data.areaId && !area) {
      throw new Error('Selected area does not exist');
    }

    const worker: Worker = {
      id: this.nextWorkerId++,
      name: data.name,
      phone: data.phone,
      email: data.email,
      areaId: data.areaId || 0,
      areaName: area?.name,
      address: data.address,
      emergencyContact: data.emergencyContact,
      joinDate: new Date().toISOString().split('T')[0],
      status: data.status || 'active',
      customersAssigned: 0,
      monthlyRevenue: 0,
      efficiency: 100,
      onTimeDeliveries: 0,
      totalDeliveries: 0,
      rating: 5.0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.workers.push(worker);
    return worker;
  }

  updateWorker(id: number, data: any): Worker | null {
    const index = this.workers.findIndex(w => w.id === id);
    if (index === -1) return null;

    const oldWorker = this.workers[index];
    const area = data.areaId ? this.areas.find(a => a.id === data.areaId) : null;

    // If area is being changed, unassign all customers from this worker
    if (data.areaId && data.areaId !== oldWorker.areaId) {
      this.customers.forEach(customer => {
        if (customer.workerId === id) {
          customer.workerId = 0;
          customer.workerName = undefined;
          customer.updatedAt = new Date().toISOString();
        }
      });
    }

    this.workers[index] = {
      ...oldWorker,
      ...data,
      areaName: area?.name || oldWorker.areaName,
      updatedAt: new Date().toISOString(),
    };

    this.updateWorkerStats();
    return this.workers[index];
  }

  deleteWorker(id: number): boolean {
    const index = this.workers.findIndex(w => w.id === id);
    if (index === -1) return false;

    // Check if worker has assigned customers
    const hasCustomers = this.customers.some(c => c.workerId === id && c.status === 'active');
    if (hasCustomers) return false;

    this.workers.splice(index, 1);
    return true;
  }

  // Payment methods
  getPayments(filters?: any): Payment[] {
    let result = [...this.payments];

    if (filters?.customerId) {
      result = result.filter(p => p.customerId === parseInt(filters.customerId));
    }

    if (filters?.status) {
      result = result.filter(p => p.status === filters.status);
    }

    if (filters?.month && filters?.year) {
      result = result.filter(p => p.month === filters.month && p.year === parseInt(filters.year));
    }

    return result;
  }

  createPayment(data: any): Payment {
    const customer = this.customers.find(c => c.id === data.customerId);
    const payment: Payment = {
      id: this.nextPaymentId++,
      customerId: data.customerId,
      customerName: customer?.name,
      amount: data.amount,
      paymentMethod: data.paymentMethod,
      status: data.status || 'paid',
      month: data.month,
      year: data.year,
      dueDate: data.dueDate,
      paidDate: data.paidDate,
      notes: data.notes,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.payments.push(payment);

    // Update customer pending dues
    if (customer && data.paidDate) {
      // For positive amounts (payments), reduce pending dues
      // For negative amounts (deductions), also reduce pending dues (since negative minus negative = reduction)
      customer.pendingDues = Math.max(0, customer.pendingDues - Math.abs(data.amount));
      customer.lastPayment = data.paidDate;
    }

    return payment;
  }

  // Settings methods
  getBusinessSettings(): BusinessSettings | null {
    return this.businessSettings;
  }

  updateBusinessSettings(data: BusinessSettings): BusinessSettings {
    this.businessSettings = { ...this.businessSettings, ...data };
    return this.businessSettings;
  }

  getPricingSettings(): PricingSettings | null {
    return this.pricingSettings;
  }

  updatePricingSettings(data: PricingSettings): PricingSettings {
    this.pricingSettings = { ...this.pricingSettings, ...data };
    return this.pricingSettings;
  }

  getPaymentGatewaySettings(): PaymentGatewaySettings | null {
    return this.paymentGatewaySettings;
  }

  updatePaymentGatewaySettings(data: PaymentGatewaySettings): PaymentGatewaySettings {
    this.paymentGatewaySettings = { ...this.paymentGatewaySettings, ...data };
    return this.paymentGatewaySettings;
  }

  // Dashboard methods
  getDashboardStats() {
    const activeCustomers = this.customers.filter(c => c.status === 'active');
    const activeWorkers = this.workers.filter(w => w.status === 'active');

    const today = new Date().toISOString().split('T')[0];
    const todayDeliveries = this.getDailyDeliveries(today);
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];
    const tomorrowOrders = this.getDailyQuantities(undefined, tomorrowStr);

    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    const daysInMonth = new Date().getDate(); // Current day of month

    // Calculate monthly revenue from daily deliveries till current date
    const monthlyRevenue = activeCustomers.reduce((sum, c) => sum + (c.currentMonthAmount || 0), 0);

    // Calculate total milk sold this month till current date
    const totalMilkSold = this.dailyDeliveries
      .filter(d => {
        const deliveryDate = new Date(d.date);
        return deliveryDate.getMonth() === currentMonth &&
               deliveryDate.getFullYear() === currentYear;
      })
      .reduce((sum, d) => sum + d.quantityDelivered, 0);

    return {
      totalCustomers: activeCustomers.length,
      activeWorkers: activeWorkers.length,
      todayRevenue: todayDeliveries.reduce((sum, d) => sum + d.dailyAmount, 0),
      milkDelivered: todayDeliveries.reduce((sum, d) => sum + d.quantityDelivered, 0),
      monthlyRevenue, // Accumulated daily totals till current date
      totalMilkSold, // Accumulated daily milk sold till current date
      pendingDues: activeCustomers.reduce((sum, c) => sum + c.pendingDues, 0),
      newCustomers: this.customers.filter(c => {
        const joinDate = new Date(c.joinDate);
        const thisMonth = new Date();
        return joinDate.getMonth() === thisMonth.getMonth() && joinDate.getFullYear() === thisMonth.getFullYear();
      }).length,
      collectionRate: monthlyRevenue > 0 ?
        ((monthlyRevenue - activeCustomers.reduce((sum, c) => sum + c.pendingDues, 0)) / monthlyRevenue) * 100 : 0,
      // Daily billing specific stats
      todayDeliveries: todayDeliveries.length,
      tomorrowOrders: tomorrowOrders.reduce((sum, q) => sum + q.requestedQuantity, 0),
      dailyAverageRevenue: daysInMonth > 0 ? monthlyRevenue / daysInMonth : 0,
      currentMonthDays: daysInMonth,
    };
  }

  // Daily Delivery methods
  getDailyDeliveries(date?: string, customerId?: number, workerId?: number): DailyDelivery[] {
    let result = [...this.dailyDeliveries];

    if (date) {
      result = result.filter(d => d.date === date);
    }

    if (customerId) {
      result = result.filter(d => d.customerId === customerId);
    }

    if (workerId) {
      result = result.filter(d => d.workerId === workerId);
    }

    return result;
  }

  createDailyDelivery(data: any): DailyDelivery {
    const customer = this.customers.find(c => c.id === data.customerId);
    const worker = this.workers.find(w => w.id === data.workerId);

    const delivery: DailyDelivery = {
      id: this.nextDeliveryId++,
      customerId: data.customerId,
      customerName: customer?.name,
      workerId: data.workerId,
      workerName: worker?.name,
      date: data.date,
      quantityDelivered: data.quantityDelivered,
      ratePerLiter: data.ratePerLiter,
      dailyAmount: data.quantityDelivered * data.ratePerLiter,
      status: data.status || 'delivered',
      notes: data.notes,
      deliveryTime: data.deliveryTime,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.dailyDeliveries.push(delivery);
    this.calculateCustomerMonthlyAmounts();
    this.updateWorkerStats();

    return delivery;
  }

  // Daily Quantity methods
  getDailyQuantities(customerId?: number, date?: string): DailyQuantity[] {
    let result = [...this.dailyQuantities];

    if (customerId) {
      result = result.filter(q => q.customerId === customerId);
    }

    if (date) {
      result = result.filter(q => q.date === date);
    }

    return result;
  }

  updateCustomerQuantity(customerId: number, date: string, quantity: number): boolean {
    const quantityRecord = this.dailyQuantities.find(q =>
      q.customerId === customerId && q.date === date
    );

    if (!quantityRecord || quantityRecord.isLocked) {
      return false;
    }

    // Check if current time is between 6 PM and 10 PM
    const now = new Date();
    const currentHour = now.getHours();
    const isValidTime = currentHour >= 18 && currentHour < 22; // 6 PM to 10 PM

    if (!isValidTime) {
      return false; // Changes only allowed between 6 PM to 10 PM
    }

    // Check if date is for tomorrow only
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];

    if (date !== tomorrowStr) {
      return false; // Can only change quantity for tomorrow
    }

    quantityRecord.requestedQuantity = quantity;
    quantityRecord.requestedAt = new Date().toISOString();
    quantityRecord.updatedAt = new Date().toISOString();

    // Update customer's next day quantity
    const customer = this.customers.find(c => c.id === customerId);
    if (customer) {
      customer.nextDayQuantity = quantity;
    }

    return true;
  }


  // Customer quantity link management
  generateCustomerQuantityLink(customerId: number): CustomerQuantityLink | null {
    const customer = this.customers.find(c => c.id === customerId);
    if (!customer) return null;

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];

    // Check if current time is between 6 PM and 10 PM
    const now = new Date();
    const currentHour = now.getHours();
    const isValidTime = currentHour >= 18 && currentHour < 22; // 6 PM to 10 PM

    const link: CustomerQuantityLink = {
      customerId: customer.id,
      customerName: customer.name,
      currentQuantity: customer.dailyQuantity,
      nextDayQuantity: customer.nextDayQuantity || customer.dailyQuantity,
      uniqueToken: customer.uniqueLink || this.generateUniqueToken(),
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours
      canChange: customer.canChangeQuantity !== false && isValidTime,
    };

    // Update or add to customer quantity links
    const existingIndex = this.customerQuantityLinks.findIndex(l => l.customerId === customerId);
    if (existingIndex >= 0) {
      this.customerQuantityLinks[existingIndex] = link;
    } else {
      this.customerQuantityLinks.push(link);
    }

    return link;
  }

  getCustomerByToken(token: string): CustomerQuantityLink | null {
    return this.customerQuantityLinks.find(l => l.uniqueToken === token) || null;
  }

  // Calculate daily totals for reporting
  calculateDailyTotals(date: string) {
    const deliveries = this.getDailyDeliveries(date);
    return {
      totalRevenue: deliveries.reduce((sum, d) => sum + d.dailyAmount, 0),
      totalMilk: deliveries.reduce((sum, d) => sum + d.quantityDelivered, 0),
      customerCount: new Set(deliveries.map(d => d.customerId)).size,
    };
  }

  // Helper method to validate and fix area-worker-customer consistency
  validateAreaConsistency(): {
    fixed: number;
    issues: string[];
  } {
    let fixedCount = 0;
    const issues: string[] = [];

    // Check customers assigned to workers in different areas
    this.customers.forEach(customer => {
      if (customer.workerId > 0) {
        const worker = this.workers.find(w => w.id === customer.workerId);
        if (worker && worker.areaId !== customer.areaId) {
          // Unassign worker from customer in different area
          customer.workerId = 0;
          customer.workerName = undefined;
          customer.updatedAt = new Date().toISOString();
          fixedCount++;
          issues.push(`Unassigned worker "${worker.name}" from customer "${customer.name}" due to area mismatch`);
        }
      }

      // Update area names for customers
      if (customer.areaId > 0) {
        const area = this.areas.find(a => a.id === customer.areaId);
        if (area && customer.areaName !== area.name) {
          customer.areaName = area.name;
          customer.updatedAt = new Date().toISOString();
          fixedCount++;
        } else if (!area) {
          customer.areaId = 0;
          customer.areaName = undefined;
          customer.workerId = 0;
          customer.workerName = undefined;
          customer.updatedAt = new Date().toISOString();
          fixedCount++;
          issues.push(`Reset area for customer "${customer.name}" - area no longer exists`);
        }
      }
    });

    // Update area names for workers
    this.workers.forEach(worker => {
      if (worker.areaId > 0) {
        const area = this.areas.find(a => a.id === worker.areaId);
        if (area && worker.areaName !== area.name) {
          worker.areaName = area.name;
          worker.updatedAt = new Date().toISOString();
          fixedCount++;
        } else if (!area) {
          worker.areaId = 0;
          worker.areaName = undefined;
          worker.updatedAt = new Date().toISOString();
          fixedCount++;
          issues.push(`Reset area for worker "${worker.name}" - area no longer exists`);
        }
      }
    });

    this.updateWorkerStats();
    return { fixed: fixedCount, issues };
  }

  // User methods
  getUsers(): User[] {
    return [...this.users];
  }

  getUserById(id: number): User | null {
    return this.users.find(u => u.id === id) || null;
  }

  createUser(data: any): User {
    const user: User = {
      id: this.nextUserId++,
      name: data.name,
      email: data.email,
      role: data.role,
      status: 'active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.users.push(user);
    return user;
  }

  // Area methods
  getAreas(): Area[] {
    return [...this.areas];
  }

  getAreaById(id: number): Area | null {
    return this.areas.find(a => a.id === id) || null;
  }

  createArea(data: any): Area {
    const area: Area = {
      id: this.nextAreaId++,
      name: data.name,
      description: data.description || '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.areas.push(area);
    return area;
  }

  updateArea(id: number, data: any): Area | null {
    const index = this.areas.findIndex(a => a.id === id);
    if (index === -1) return null;

    this.areas[index] = {
      ...this.areas[index],
      ...data,
      updatedAt: new Date().toISOString(),
    };

    return this.areas[index];
  }

  deleteArea(id: number): boolean {
    const index = this.areas.findIndex(a => a.id === id);
    if (index === -1) return false;

    // Check if area has assigned customers or workers
    const activeCustomers = this.customers.filter(c => c.areaId === id && c.status === 'active');
    const activeWorkers = this.workers.filter(w => w.areaId === id && w.status === 'active');

    if (activeCustomers.length > 0 || activeWorkers.length > 0) {
      const errorParts = [];
      if (activeCustomers.length > 0) {
        errorParts.push(`${activeCustomers.length} active customer(s)`);
      }
      if (activeWorkers.length > 0) {
        errorParts.push(`${activeWorkers.length} active worker(s)`);
      }
      throw new Error(`Cannot delete area. It has ${errorParts.join(' and ')} assigned.`);
    }

    this.areas.splice(index, 1);
    return true;
  }
}

export const db = new Database();
