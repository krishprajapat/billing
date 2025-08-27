import { RequestHandler } from "express";
import { ApiResponse, MonthlyReport, WorkerPerformance, AreaReport, PaymentMethodReport, PaymentMethod } from "@shared/api";
import { db } from "../database/models";

export const getMonthlyReports: RequestHandler = (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    const customers = db.getCustomers();
    const payments = db.getPayments();

    // Generate monthly reports based on actual daily billing data
    const monthlyReports: MonthlyReport[] = [];

    // Get current month data from daily deliveries
    const currentDate = new Date();
    const currentMonth = currentDate.getMonth();
    const currentYear = currentDate.getFullYear();

    // Generate reports for last 6 months including current month
    for (let i = 5; i >= 0; i--) {
      const reportDate = new Date(currentYear, currentMonth - i, 1);
      const monthName = reportDate.toLocaleString('default', { month: 'long' });
      const year = reportDate.getFullYear();
      const month = reportDate.getMonth();

      // Get customers active during this month
      const monthCustomers = customers.filter(c => {
        const joinDate = new Date(c.joinDate);
        return joinDate <= new Date(year, month + 1, 0); // Before end of month
      });

      const activeCustomers = monthCustomers.filter(c => c.status === 'active');

      // Calculate revenue from daily deliveries for this month
      const dailyDeliveries = db.getDailyDeliveries().filter(d => {
        const deliveryDate = new Date(d.date);
        return deliveryDate.getMonth() === month && deliveryDate.getFullYear() === year;
      });

      const totalRevenue = dailyDeliveries.reduce((sum, d) => sum + d.dailyAmount, 0);
      const milkSold = dailyDeliveries.reduce((sum, d) => sum + d.quantityDelivered, 0);

      // Calculate payments for this month
      const monthPayments = payments.filter(p => {
        return p.month === monthName && p.year === year;
      });

      const collectedRevenue = monthPayments
        .filter(p => p.status === 'paid')
        .reduce((sum, p) => sum + p.amount, 0);

      const pendingRevenue = activeCustomers.reduce((sum, c) => sum + c.pendingDues, 0);

      // Count new customers for this month
      const newCustomers = monthCustomers.filter(c => {
        const joinDate = new Date(c.joinDate);
        return joinDate.getMonth() === month && joinDate.getFullYear() === year;
      }).length;

      monthlyReports.push({
        month: monthName,
        year,
        totalCustomers: monthCustomers.length,
        activeCustomers: activeCustomers.length,
        totalRevenue: totalRevenue || (activeCustomers.length * 1800), // Fallback for mock data
        collectedRevenue: collectedRevenue || (totalRevenue * 0.9),
        pendingRevenue,
        milkSold: milkSold || (activeCustomers.length * 45), // Fallback for mock data
        newCustomers,
      });
    }

    const response: ApiResponse<MonthlyReport[]> = {
      success: true,
      data: monthlyReports,
    };
    res.json(response);
  } catch (error) {
    const response: ApiResponse = {
      success: false,
      error: "Failed to fetch monthly reports",
    };
    res.status(500).json(response);
  }
};

export const getWorkerPerformanceReport: RequestHandler = (req, res) => {
  try {
    const workers = db.getWorkers({ status: 'active' });
    const customers = db.getCustomers({ status: 'active' });

    const workerPerformance: WorkerPerformance[] = workers.map(worker => {
      const workerCustomers = customers.filter(c => c.workerId === worker.id);

      // Calculate actual milk delivered from daily deliveries for current month
      const currentMonth = new Date().getMonth();
      const currentYear = new Date().getFullYear();

      const workerDeliveries = db.getDailyDeliveries().filter(d => {
        const deliveryDate = new Date(d.date);
        return d.workerId === worker.id &&
               deliveryDate.getMonth() === currentMonth &&
               deliveryDate.getFullYear() === currentYear;
      });

      const milkDelivered = workerDeliveries.reduce((sum, d) => sum + d.quantityDelivered, 0);

      return {
        workerId: worker.id,
        workerName: worker.name,
        area: worker.area,
        customers: workerCustomers.length,
        revenue: workerCustomers.reduce((sum, c) => sum + (c.monthlyAmount || 0), 0),
        milkDelivered: milkDelivered || (workerCustomers.reduce((sum, c) => sum + c.dailyQuantity, 0) * 15), // Fallback
        efficiency: worker.efficiency,
        onTimeDeliveries: worker.onTimeDeliveries,
        totalDeliveries: worker.totalDeliveries,
        rating: worker.rating,
      };
    });

    const response: ApiResponse<WorkerPerformance[]> = {
      success: true,
      data: workerPerformance,
    };
    res.json(response);
  } catch (error) {
    const response: ApiResponse = {
      success: false,
      error: "Failed to fetch worker performance report",
    };
    res.status(500).json(response);
  }
};

export const getAreaWiseReport: RequestHandler = (req, res) => {
  try {
    const customers = db.getCustomers({ status: 'active' });
    const workers = db.getWorkers({ status: 'active' });

    // Get current month daily deliveries
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();

    const monthlyDeliveries = db.getDailyDeliveries().filter(d => {
      const deliveryDate = new Date(d.date);
      return deliveryDate.getMonth() === currentMonth && deliveryDate.getFullYear() === currentYear;
    });

    const areaData = customers.reduce((acc: any, customer) => {
      if (!acc[customer.area]) {
        acc[customer.area] = {
          area: customer.area,
          customers: 0,
          revenue: 0,
          milkSold: 0,
          pendingDues: 0,
          workers: new Set(),
        };
      }

      acc[customer.area].customers++;
      acc[customer.area].revenue += customer.monthlyAmount || 0;
      acc[customer.area].pendingDues += customer.pendingDues;

      // Calculate actual milk sold from daily deliveries
      const customerDeliveries = monthlyDeliveries.filter(d => d.customerId === customer.id);
      const actualMilkSold = customerDeliveries.reduce((sum, d) => sum + d.quantityDelivered, 0);
      acc[customer.area].milkSold += actualMilkSold || (customer.dailyQuantity * 15); // Fallback

      // Find worker for this customer
      const worker = workers.find(w => w.id === customer.workerId);
      if (worker) {
        acc[customer.area].workers.add(worker.id);
      }

      return acc;
    }, {});

    const areaReports: AreaReport[] = Object.values(areaData).map((area: any) => ({
      area: area.area,
      customers: area.customers,
      revenue: area.revenue,
      milkSold: area.milkSold,
      pendingDues: area.pendingDues,
      workers: area.workers.size,
    }));

    const response: ApiResponse<AreaReport[]> = {
      success: true,
      data: areaReports,
    };
    res.json(response);
  } catch (error) {
    const response: ApiResponse = {
      success: false,
      error: "Failed to fetch area-wise report",
    };
    res.status(500).json(response);
  }
};

export const getPaymentMethodReport: RequestHandler = (req, res) => {
  try {
    const payments = db.getPayments();
    
    // Calculate payment method statistics
    interface PaymentMethodStat {
      method: PaymentMethod;
      amount: number;
      transactions: number;
    }

    const paymentMethodStats: Record<string, PaymentMethodStat> = payments.reduce((acc: Record<string, PaymentMethodStat>, payment) => {
      if (!acc[payment.paymentMethod]) {
        acc[payment.paymentMethod] = {
          method: payment.paymentMethod,
          amount: 0,
          transactions: 0,
        };
      }

      acc[payment.paymentMethod].amount += payment.amount;
      acc[payment.paymentMethod].transactions++;

      return acc;
    }, {});

    const totalAmount = Object.values(paymentMethodStats).reduce((sum: number, stat: PaymentMethodStat) => sum + stat.amount, 0);

    const paymentMethodReports: PaymentMethodReport[] = Object.values(paymentMethodStats).map((stat: PaymentMethodStat) => ({
      method: stat.method,
      percentage: totalAmount > 0 ? (stat.amount / totalAmount) * 100 : 0,
      amount: stat.amount,
      transactions: stat.transactions,
    }));

    const response: ApiResponse<PaymentMethodReport[]> = {
      success: true,
      data: paymentMethodReports,
    };
    res.json(response);
  } catch (error) {
    const response: ApiResponse = {
      success: false,
      error: "Failed to fetch payment method report",
    };
    res.status(500).json(response);
  }
};

export const getCustomerGrowthReport: RequestHandler = (req, res) => {
  try {
    // Mock customer growth data - in a real app, this would come from historical data
    const customerGrowth = [
      { month: "Jul", newCustomers: 8, totalCustomers: 180, churnRate: 2.1 },
      { month: "Aug", newCustomers: 15, totalCustomers: 195, churnRate: 1.8 },
      { month: "Sep", newCustomers: 15, totalCustomers: 210, churnRate: 1.5 },
      { month: "Oct", newCustomers: 15, totalCustomers: 225, churnRate: 1.2 },
      { month: "Nov", newCustomers: 15, totalCustomers: 240, churnRate: 1.0 },
      { month: "Dec", newCustomers: 7, totalCustomers: 247, churnRate: 0.8 },
    ];

    const response: ApiResponse = {
      success: true,
      data: customerGrowth,
    };
    res.json(response);
  } catch (error) {
    const response: ApiResponse = {
      success: false,
      error: "Failed to fetch customer growth report",
    };
    res.status(500).json(response);
  }
};

export const getRevenueAnalysis: RequestHandler = (req, res) => {
  try {
    const customers = db.getCustomers({ status: 'active' });
    const payments = db.getPayments();

    const totalPossibleRevenue = customers.reduce((sum, c) => sum + c.monthlyAmount, 0);
    const actualRevenue = payments.filter(p => p.status === 'paid').reduce((sum, p) => sum + p.amount, 0);
    const pendingRevenue = customers.reduce((sum, c) => sum + c.pendingDues, 0);

    const revenueAnalysis = {
      totalPossibleRevenue,
      actualRevenue,
      pendingRevenue,
      collectionEfficiency: totalPossibleRevenue > 0 ? (actualRevenue / totalPossibleRevenue) * 100 : 0,
      averageRevenuePerCustomer: customers.length > 0 ? totalPossibleRevenue / customers.length : 0,
      topRevenueAreas: customers.reduce((acc: any, customer) => {
        if (!acc[customer.area]) {
          acc[customer.area] = 0;
        }
        acc[customer.area] += customer.monthlyAmount;
        return acc;
      }, {}),
    };

    const response: ApiResponse = {
      success: true,
      data: revenueAnalysis,
    };
    res.json(response);
  } catch (error) {
    const response: ApiResponse = {
      success: false,
      error: "Failed to fetch revenue analysis",
    };
    res.status(500).json(response);
  }
};

export const exportReportData: RequestHandler = (req, res) => {
  try {
    const { reportType, format = 'json' } = req.query;

    let data: any = {};

    switch (reportType) {
      case 'customers':
        data = db.getCustomers();
        break;
      case 'workers':
        data = db.getWorkers();
        break;
      case 'payments':
        data = db.getPayments();
        break;
      case 'monthly':
        // Would call getMonthlyReports logic here
        data = [];
        break;
      default:
        return res.status(400).json({
          success: false,
          error: "Invalid report type",
        });
    }

    if (format === 'csv') {
      // In a real app, convert to CSV format
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename=${reportType}-report.csv`);
      res.send('CSV export not implemented in demo');
    } else {
      const response: ApiResponse = {
        success: true,
        data,
        message: `${reportType} report exported successfully`,
      };
      res.json(response);
    }
  } catch (error) {
    const response: ApiResponse = {
      success: false,
      error: "Failed to export report data",
    };
    res.status(500).json(response);
  }
};

export const getBusinessSummary: RequestHandler = (req, res) => {
  try {
    const customers = db.getCustomers();
    const workers = db.getWorkers();
    const payments = db.getPayments();

    const activeCustomers = customers.filter(c => c.status === 'active');
    const activeWorkers = workers.filter(w => w.status === 'active');

    const summary = {
      totalCustomers: customers.length,
      activeCustomers: activeCustomers.length,
      totalWorkers: workers.length,
      activeWorkers: activeWorkers.length,
      totalRevenue: activeCustomers.reduce((sum, c) => sum + c.monthlyAmount, 0),
      totalMilkVolume: activeCustomers.reduce((sum, c) => sum + (c.dailyQuantity * 30), 0),
      pendingDues: activeCustomers.reduce((sum, c) => sum + c.pendingDues, 0),
      totalTransactions: payments.length,
      averageOrderValue: activeCustomers.length > 0 ? 
        activeCustomers.reduce((sum, c) => sum + c.monthlyAmount, 0) / activeCustomers.length : 0,
      customerRetentionRate: 96.8, // Mock value
      workerEfficiency: activeWorkers.length > 0 ? 
        activeWorkers.reduce((sum, w) => sum + w.efficiency, 0) / activeWorkers.length : 0,
    };

    const response: ApiResponse = {
      success: true,
      data: summary,
    };
    res.json(response);
  } catch (error) {
    const response: ApiResponse = {
      success: false,
      error: "Failed to fetch business summary",
    };
    res.status(500).json(response);
  }
};
