import { RequestHandler } from "express";
import { ApiResponse, DashboardStats, RecentActivity } from "@shared/api";
import { supabase } from "../database/supabase";
import { supabaseDatabase } from "../database/supabase-models";

export const getDashboardStats: RequestHandler = async (_req, res) => {
  try {
    const customers = await supabaseDatabase.getCustomers({ status: "active" });
    const workers = await supabaseDatabase.getWorkers({ status: "active" });

    const today = new Date().toISOString().split("T")[0];
    const { data: todayDeliveries } = await (supabase as any)
      .from("daily_deliveries")
      .select("quantity_delivered,daily_amount")
      .eq("date", today);

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split("T")[0];
    const { data: tomorrowQuantities } = await (supabase as any)
      .from("daily_quantities")
      .select("requested_quantity")
      .eq("date", tomorrowStr);

    const daysInMonth = new Date().getDate();
    const monthlyRevenue = customers.reduce(
      (sum, c) => sum + (c.currentMonthAmount || 0),
      0,
    );
    const totalMilkSold = (todayDeliveries || []).reduce(
      (sum: number, d: any) => sum + (d.quantity_delivered || 0),
      0,
    );

    const stats: DashboardStats = {
      totalCustomers: customers.length,
      activeWorkers: workers.length,
      todayRevenue: (todayDeliveries || []).reduce(
        (sum: number, d: any) => sum + (d.daily_amount || 0),
        0,
      ),
      milkDelivered: (todayDeliveries || []).reduce(
        (sum: number, d: any) => sum + (d.quantity_delivered || 0),
        0,
      ),
      monthlyRevenue,
      totalMilkSold,
      pendingDues: customers.reduce((sum, c) => sum + (c.pendingDues || 0), 0),
      newCustomers: customers.filter((c) => {
        const join = new Date(c.joinDate);
        const now = new Date();
        return (
          join.getMonth() === now.getMonth() &&
          join.getFullYear() === now.getFullYear()
        );
      }).length,
      collectionRate:
        monthlyRevenue > 0
          ? ((monthlyRevenue -
              customers.reduce((sum, c) => sum + (c.pendingDues || 0), 0)) /
              monthlyRevenue) *
            100
          : 0,
      todayDeliveries: (todayDeliveries || []).length,
      tomorrowOrders: (tomorrowQuantities || []).reduce(
        (sum: number, q: any) => sum + (q.requested_quantity || 0),
        0,
      ),
      dailyAverageRevenue: daysInMonth > 0 ? monthlyRevenue / daysInMonth : 0,
      currentMonthDays: daysInMonth,
    } as any;

    const response: ApiResponse<DashboardStats> = {
      success: true,
      data: stats,
    };
    res.json(response);
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    const response: ApiResponse = {
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch dashboard statistics",
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
        type: "payment",
        description: "Ramesh Kumar paid ₹3,600",
        amount: 3600,
        customer: "Ramesh Kumar",
        time: "2 hours ago",
      },
      {
        id: 2,
        type: "delivery",
        description: "Suresh completed delivery to 15 customers",
        worker: "Suresh Kumar",
        time: "3 hours ago",
      },
      {
        id: 3,
        type: "new_customer",
        description: "New customer Priya Sharma added from Sector 21",
        customer: "Priya Sharma",
        time: "5 hours ago",
      },
      {
        id: 4,
        type: "payment_due",
        description: "Amit Singh has pending dues of ₹1,200",
        amount: 1200,
        customer: "Amit Singh",
        time: "1 day ago",
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

export const getTopPerformers: RequestHandler = async (_req, res) => {
  try {
    const workers = await supabaseDatabase.getWorkers({ status: "active" });
    const topPerformers = workers
      .sort((a, b) => (b.efficiency || 0) - (a.efficiency || 0))
      .slice(0, 5)
      .map((worker) => ({
        id: worker.id,
        name: worker.name,
        customers: worker.customersAssigned || 0,
        revenue: worker.monthlyRevenue || 0,
        efficiency: worker.efficiency || 0,
        rating: worker.rating || 0,
        area: worker.areaName,
      }));
    const response: ApiResponse = { success: true, data: topPerformers };
    res.json(response);
  } catch (error) {
    const response: ApiResponse = {
      success: false,
      error: "Failed to fetch top performers",
    };
    res.status(500).json(response);
  }
};

export const getQuickStats: RequestHandler = async (_req, res) => {
  try {
    const customers = await supabaseDatabase.getCustomers();
    const activeCustomers = customers.filter((c) => c.status === "active");
    const { data: payments } = await (supabase as any)
      .from("payments")
      .select("*");
    const today = new Date().toISOString().split("T")[0];
    const { data: deliveries } = await (supabase as any)
      .from("daily_deliveries")
      .select("daily_amount,quantity_delivered")
      .eq("date", today);

    const todayRevenue = (deliveries || []).reduce(
      (sum: number, d: any) => sum + (d.daily_amount || 0),
      0,
    );
    const pendingDues = activeCustomers.reduce(
      (sum, c) => sum + (c.pendingDues || 0),
      0,
    );
    const totalMilkToday = (deliveries || []).reduce(
      (sum: number, d: any) => sum + (d.quantity_delivered || 0),
      0,
    );
    const currentDate = new Date();
    const newCustomersThisMonth = customers.filter((c) => {
      const joinDate = new Date(c.joinDate);
      return (
        joinDate.getMonth() === currentDate.getMonth() &&
        joinDate.getFullYear() === currentDate.getFullYear()
      );
    }).length;

    const quickStats = {
      activeCustomers: activeCustomers.length,
      activeWorkers: (await supabaseDatabase.getWorkers({ status: "active" }))
        .length,
      todayRevenue,
      milkDeliveredToday: totalMilkToday,
      pendingDues,
      overdueCustomers: 0,
      newCustomersThisMonth,
      collectionRate: 0,
    };
    const response: ApiResponse = { success: true, data: quickStats };
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
      { month: "Jul 2024", customers: 180, revenue: 925000, milkSold: 18500 },
      { month: "Aug 2024", customers: 195, revenue: 1010000, milkSold: 20200 },
      { month: "Sep 2024", customers: 210, revenue: 1105000, milkSold: 22100 },
      { month: "Oct 2024", customers: 225, revenue: 1215000, milkSold: 24300 },
      { month: "Nov 2024", customers: 240, revenue: 1284000, milkSold: 25680 },
      { month: "Dec 2024", customers: 247, revenue: 1360000, milkSold: 27200 },
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

export const getAreaWiseStats: RequestHandler = async (_req, res) => {
  try {
    const customers = await supabaseDatabase.getCustomers({ status: "active" });
    const areaStats = customers.reduce(
      (acc: any, customer) => {
        const areaName = customer.areaName || "Unknown Area";
        if (!acc[areaName]) {
          acc[areaName] = {
            area: areaName,
            customers: 0,
            revenue: 0,
            milkSold: 0,
            pendingDues: 0,
          };
        }
        acc[areaName].customers++;
        acc[areaName].revenue += customer.currentMonthAmount || 0;
        acc[areaName].milkSold += customer.dailyQuantity * 30;
        acc[areaName].pendingDues += customer.pendingDues || 0;
        return acc;
      },
      {} as Record<
        string,
        {
          area: string;
          customers: number;
          revenue: number;
          milkSold: number;
          pendingDues: number;
        }
      >,
    );
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
