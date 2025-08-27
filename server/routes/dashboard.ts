import { RequestHandler } from "express";
import { ApiResponse, DashboardStats, RecentActivity } from "@shared/api";
import { db } from "../database/models";

export const getDashboardStats: RequestHandler = (req, res) => {
  try {
    const stats = db.getDashboardStats();
    
    const response: ApiResponse<DashboardStats> = {
      success: true,
      data: stats,
    };
    res.json(response);
  } catch (error) {
    const response: ApiResponse = {
      success: false,
      error: "Failed to fetch dashboard statistics",
    };
    res.status(500).json(response);
  }
};

export const getRecentActivities: RequestHandler = (req, res) => {
  try {
    // Mock recent activities - in a real app, this would come from an activity log
    const activities: RecentActivity[] = [
      {
        id: 1,
        type: 'payment',
        description: 'Ramesh Kumar paid ₹3,600',
        amount: 3600,
        customer: 'Ramesh Kumar',
        time: '2 hours ago',
      },
      {
        id: 2,
        type: 'delivery',
        description: 'Suresh completed delivery to 15 customers',
        worker: 'Suresh Kumar',
        time: '3 hours ago',
      },
      {
        id: 3,
        type: 'new_customer',
        description: 'New customer Priya Sharma added from Sector 21',
        customer: 'Priya Sharma',
        time: '5 hours ago',
      },
      {
        id: 4,
        type: 'payment_due',
        description: 'Amit Singh has pending dues of ₹1,200',
        amount: 1200,
        customer: 'Amit Singh',
        time: '1 day ago',
      },
    ];

    const response: ApiResponse<RecentActivity[]> = {
      success: true,
      data: activities,
    };
    res.json(response);
  } catch (error) {
    const response: ApiResponse = {
      success: false,
      error: "Failed to fetch recent activities",
    };
    res.status(500).json(response);
  }
};

export const getTopPerformers: RequestHandler = (req, res) => {
  try {
    const workers = db.getWorkers({ status: 'active' });
    const topPerformers = workers
      .sort((a, b) => b.efficiency - a.efficiency)
      .slice(0, 5)
      .map(worker => ({
        id: worker.id,
        name: worker.name,
        customers: worker.customersAssigned,
        revenue: worker.monthlyRevenue,
        efficiency: worker.efficiency,
        rating: worker.rating,
        area: worker.area,
      }));

    const response: ApiResponse = {
      success: true,
      data: topPerformers,
    };
    res.json(response);
  } catch (error) {
    const response: ApiResponse = {
      success: false,
      error: "Failed to fetch top performers",
    };
    res.status(500).json(response);
  }
};

export const getQuickStats: RequestHandler = (req, res) => {
  try {
    const customers = db.getCustomers();
    const workers = db.getWorkers();
    const payments = db.getPayments();

    const activeCustomers = customers.filter(c => c.status === 'active');
    const activeWorkers = workers.filter(w => w.status === 'active');
    
    const currentDate = new Date();
    const currentMonth = currentDate.toLocaleString('default', { month: 'long' });
    const currentYear = currentDate.getFullYear();
    
    const currentMonthPayments = payments.filter(p => 
      p.month === currentMonth && p.year === currentYear && p.status === 'paid'
    );

    const todayRevenue = currentMonthPayments.reduce((sum, p) => sum + p.amount, 0);
    const pendingDues = activeCustomers.reduce((sum, c) => sum + c.pendingDues, 0);
    const totalMilkToday = activeCustomers.reduce((sum, c) => sum + c.dailyQuantity, 0);

    const quickStats = {
      activeCustomers: activeCustomers.length,
      activeWorkers: activeWorkers.length,
      todayRevenue,
      milkDeliveredToday: totalMilkToday,
      pendingDues,
      overdueCustomers: activeCustomers.filter(c => c.pendingDues > c.monthlyAmount).length,
      newCustomersThisMonth: customers.filter(c => {
        const joinDate = new Date(c.joinDate);
        return joinDate.getMonth() === currentDate.getMonth() && 
               joinDate.getFullYear() === currentDate.getFullYear();
      }).length,
      collectionRate: activeCustomers.length > 0 ? 
        ((activeCustomers.length - activeCustomers.filter(c => c.pendingDues > 0).length) / activeCustomers.length) * 100 : 0,
    };

    const response: ApiResponse = {
      success: true,
      data: quickStats,
    };
    res.json(response);
  } catch (error) {
    const response: ApiResponse = {
      success: false,
      error: "Failed to fetch quick statistics",
    };
    res.status(500).json(response);
  }
};

export const getMonthlyTrend: RequestHandler = (req, res) => {
  try {
    // Mock monthly trend data - in a real app, this would come from historical data
    const monthlyTrend = [
      { month: 'Jul 2024', customers: 180, revenue: 925000, milkSold: 18500 },
      { month: 'Aug 2024', customers: 195, revenue: 1010000, milkSold: 20200 },
      { month: 'Sep 2024', customers: 210, revenue: 1105000, milkSold: 22100 },
      { month: 'Oct 2024', customers: 225, revenue: 1215000, milkSold: 24300 },
      { month: 'Nov 2024', customers: 240, revenue: 1284000, milkSold: 25680 },
      { month: 'Dec 2024', customers: 247, revenue: 1360000, milkSold: 27200 },
    ];

    const response: ApiResponse = {
      success: true,
      data: monthlyTrend,
    };
    res.json(response);
  } catch (error) {
    const response: ApiResponse = {
      success: false,
      error: "Failed to fetch monthly trend",
    };
    res.status(500).json(response);
  }
};

export const getAreaWiseStats: RequestHandler = (req, res) => {
  try {
    const customers = db.getCustomers({ status: 'active' });
    const areaStats = customers.reduce((acc: any, customer) => {
      if (!acc[customer.area]) {
        acc[customer.area] = {
          area: customer.area,
          customers: 0,
          revenue: 0,
          milkSold: 0,
          pendingDues: 0,
        };
      }
      
      acc[customer.area].customers++;
      acc[customer.area].revenue += customer.monthlyAmount;
      acc[customer.area].milkSold += customer.dailyQuantity * 30;
      acc[customer.area].pendingDues += customer.pendingDues;
      
      return acc;
    }, {});

    const response: ApiResponse = {
      success: true,
      data: Object.values(areaStats),
    };
    res.json(response);
  } catch (error) {
    const response: ApiResponse = {
      success: false,
      error: "Failed to fetch area-wise statistics",
    };
    res.status(500).json(response);
  }
};
