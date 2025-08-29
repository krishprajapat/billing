import { RequestHandler } from "express";
import {
  ApiResponse,
  MonthlyReport,
  WorkerPerformance,
  AreaReport,
  PaymentMethodReport,
  PaymentMethod,
} from "@shared/api";
import { supabase } from "../database/supabase";
import { supabaseDatabase } from "../database/supabase-models";

export const getMonthlyReports: RequestHandler = async (req, res) => {
  try {
    const { period = "6months" } = req.query as any;
    const customers = await supabaseDatabase.getCustomers({ status: "active" });
    const { data: payments } = await (supabase as any)
      .from("payments")
      .select("*");
    const { data: allDeliveries } = await (supabase as any)
      .from("daily_deliveries")
      .select("*");

    const now = new Date();
    const months =
      period === "1month"
        ? 1
        : period === "3months"
          ? 3
          : period === "1year"
            ? 12
            : 6;
    const reports: MonthlyReport[] = [];
    for (let i = months - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthIdx = d.getMonth();
      const year = d.getFullYear();
      const monthName = d.toLocaleString("default", { month: "long" });
      const monthCustomers = customers.filter(
        (c) => new Date(c.joinDate) <= new Date(year, monthIdx + 1, 0),
      );
      const monthDeliveries = (allDeliveries || []).filter((del: any) => {
        const dd = new Date(del.date);
        return dd.getMonth() === monthIdx && dd.getFullYear() === year;
      });
      const totalRevenue = monthDeliveries.reduce(
        (sum: number, del: any) => sum + (del.daily_amount || 0),
        0,
      );
      const milkSold = monthDeliveries.reduce(
        (sum: number, del: any) => sum + (del.quantity_delivered || 0),
        0,
      );
      const collectedRevenue = (payments || [])
        .filter(
          (p: any) =>
            p.month === monthName && p.year === year && p.status === "paid",
        )
        .reduce((s: number, p: any) => s + p.amount, 0);
      const pendingRevenue = monthCustomers.reduce(
        (s, c) => s + (c.pendingDues || 0),
        0,
      );
      const newCustomers = customers.filter((c) => {
        const jd = new Date(c.joinDate);
        return jd.getMonth() === monthIdx && jd.getFullYear() === year;
      }).length;
      reports.push({
        month: monthName,
        year,
        totalCustomers: monthCustomers.length,
        activeCustomers: monthCustomers.length,
        totalRevenue,
        collectedRevenue,
        pendingRevenue,
        milkSold,
        newCustomers,
      });
    }
    const response: ApiResponse<MonthlyReport[]> = {
      success: true,
      data: reports,
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

export const getWorkerPerformanceReport: RequestHandler = async (req, res) => {
  try {
    const workers = await supabaseDatabase.getWorkers({ status: "active" });
    const customers = await supabaseDatabase.getCustomers({ status: "active" });
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    const { data: deliveries } = await (supabase as any)
      .from("daily_deliveries")
      .select("worker_id,quantity_delivered,date");
    const workerPerformance: WorkerPerformance[] = workers.map((worker) => {
      const workerCustomers = customers.filter((c) => c.workerId === worker.id);
      const workerDeliveries = (deliveries || []).filter((d: any) => {
        const deliveryDate = new Date(d.date);
        return (
          d.worker_id === worker.id &&
          deliveryDate.getMonth() === currentMonth &&
          deliveryDate.getFullYear() === currentYear
        );
      });
      const milkDelivered = workerDeliveries.reduce(
        (sum: number, d: any) => sum + (d.quantity_delivered || 0),
        0,
      );
      return {
        workerId: worker.id,
        workerName: worker.name,
        area: worker.areaName,
        customers: workerCustomers.length,
        revenue: workerCustomers.reduce(
          (sum, c) => sum + (c.currentMonthAmount || 0),
          0,
        ),
        milkDelivered,
        efficiency: worker.efficiency || 0,
        onTimeDeliveries: worker.onTimeDeliveries || 0,
        totalDeliveries: worker.totalDeliveries || 0,
        rating: worker.rating || 0,
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

export const getAreaWiseReport: RequestHandler = async (_req, res) => {
  try {
    const customers = await supabaseDatabase.getCustomers({ status: "active" });
    const workers = await supabaseDatabase.getWorkers({ status: "active" });
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    const { data: monthlyDeliveries } = await (supabase as any)
      .from("daily_deliveries")
      .select("*");
    const areaData = customers.reduce((acc: any, customer) => {
      const areaName = customer.areaName || "Unknown Area";
      if (!acc[areaName]) {
        acc[areaName] = {
          area: areaName,
          customers: 0,
          revenue: 0,
          milkSold: 0,
          pendingDues: 0,
          workers: new Set<number>(),
        };
      }
      acc[areaName].customers++;
      acc[areaName].revenue += customer.currentMonthAmount || 0;
      acc[areaName].pendingDues += customer.pendingDues || 0;
      const custDeliveries = (monthlyDeliveries || []).filter((d: any) => {
        const dd = new Date(d.date);
        return (
          d.customer_id === customer.id &&
          dd.getMonth() === currentMonth &&
          dd.getFullYear() === currentYear
        );
      });
      const actualMilk = custDeliveries.reduce(
        (s: number, d: any) => s + (d.quantity_delivered || 0),
        0,
      );
      acc[areaName].milkSold += actualMilk;
      const worker = workers.find((w) => w.id === customer.workerId);
      if (worker) acc[areaName].workers.add(worker.id);
      return acc;
    }, {} as any);
    const areaReports: AreaReport[] = Object.values(areaData).map(
      (area: any) => ({
        area: area.area,
        customers: area.customers,
        revenue: area.revenue,
        milkSold: area.milkSold,
        pendingDues: area.pendingDues,
        workers: area.workers.size,
      }),
    );
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

export const getPaymentMethodReport: RequestHandler = async (req, res) => {
  try {
    const { period = "6months" } = req.query as any;
    const { data: payments } = await (supabase as any)
      .from("payments")
      .select("*");
    const currentDate = new Date();
    const monthsToInclude =
      period === "1month"
        ? 1
        : period === "3months"
          ? 3
          : period === "1year"
            ? 12
            : 6;
    const cutoff = new Date(currentDate);
    cutoff.setMonth(cutoff.getMonth() - monthsToInclude);
    const filtered = (payments || []).filter(
      (p: any) => new Date(p.paid_date || p.created_at) >= cutoff,
    );
    type Stat = { method: PaymentMethod; amount: number; transactions: number };
    const paymentMethodStats: Record<string, Stat> = filtered.reduce(
      (acc: Record<string, Stat>, p: any) => {
        const method = p.payment_method as PaymentMethod;
        if (!acc[method]) acc[method] = { method, amount: 0, transactions: 0 };
        acc[method].amount += p.amount;
        acc[method].transactions++;
        return acc;
      },
      {} as Record<string, Stat>,
    );
    const totalAmount = Object.values(paymentMethodStats).reduce(
      (s, st) => s + st.amount,
      0,
    );
    const paymentMethodReports: PaymentMethodReport[] = Object.values(
      paymentMethodStats,
    ).map((st) => ({
      method: st.method,
      percentage: totalAmount > 0 ? (st.amount / totalAmount) * 100 : 0,
      amount: st.amount,
      transactions: st.transactions,
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
    const customers = db.getCustomers({ status: "active" });
    const payments = db.getPayments();

    const totalPossibleRevenue = customers.reduce(
      (sum, c) => sum + c.monthlyAmount,
      0,
    );
    const actualRevenue = payments
      .filter((p) => p.status === "paid")
      .reduce((sum, p) => sum + p.amount, 0);
    const pendingRevenue = customers.reduce((sum, c) => sum + c.pendingDues, 0);

    const revenueAnalysis = {
      totalPossibleRevenue,
      actualRevenue,
      pendingRevenue,
      collectionEfficiency:
        totalPossibleRevenue > 0
          ? (actualRevenue / totalPossibleRevenue) * 100
          : 0,
      averageRevenuePerCustomer:
        customers.length > 0 ? totalPossibleRevenue / customers.length : 0,
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
    const { reportType, format = "json" } = req.query;

    let data: any = {};

    switch (reportType) {
      case "customers":
        data = db.getCustomers();
        break;
      case "workers":
        data = db.getWorkers();
        break;
      case "payments":
        data = db.getPayments();
        break;
      case "monthly":
        // Would call getMonthlyReports logic here
        data = [];
        break;
      default:
        return res.status(400).json({
          success: false,
          error: "Invalid report type",
        });
    }

    if (format === "csv") {
      // In a real app, convert to CSV format
      res.setHeader("Content-Type", "text/csv");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename=${reportType}-report.csv`,
      );
      res.send("CSV export not implemented in demo");
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

    const activeCustomers = customers.filter((c) => c.status === "active");
    const activeWorkers = workers.filter((w) => w.status === "active");

    const summary = {
      totalCustomers: customers.length,
      activeCustomers: activeCustomers.length,
      totalWorkers: workers.length,
      activeWorkers: activeWorkers.length,
      totalRevenue: activeCustomers.reduce(
        (sum, c) => sum + c.monthlyAmount,
        0,
      ),
      totalMilkVolume: activeCustomers.reduce(
        (sum, c) => sum + c.dailyQuantity * 30,
        0,
      ),
      pendingDues: activeCustomers.reduce((sum, c) => sum + c.pendingDues, 0),
      totalTransactions: payments.length,
      averageOrderValue:
        activeCustomers.length > 0
          ? activeCustomers.reduce((sum, c) => sum + c.monthlyAmount, 0) /
            activeCustomers.length
          : 0,
      customerRetentionRate: 96.8, // Mock value
      workerEfficiency:
        activeWorkers.length > 0
          ? activeWorkers.reduce((sum, w) => sum + w.efficiency, 0) /
            activeWorkers.length
          : 0,
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

export const exportReportsPDF: RequestHandler = (req, res) => {
  try {
    const { period = "6months", reportType = "complete" } = req.query;

    // Get all report data based on period
    const periodParams = { period: period as string };

    // In a real implementation, you would:
    // 1. Fetch all the report data using the existing functions
    // 2. Use a PDF generation library like puppeteer, jsPDF, or PDFKit
    // 3. Generate a professional PDF report

    // For now, return a simple text response that would be a PDF
    const pdfContent = generatePDFContent(
      period as string,
      reportType as string,
    );

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=business-report-${period}-${new Date().toISOString().split("T")[0]}.pdf`,
    );
    res.send(pdfContent);
  } catch (error) {
    const response: ApiResponse = {
      success: false,
      error: "Failed to export PDF report",
    };
    res.status(500).json(response);
  }
};

function generatePDFContent(period: string, reportType: string): string {
  const periodText =
    {
      "1month": "Last Month",
      "3months": "Last 3 Months",
      "6months": "Last 6 Months",
      "1year": "Last Year",
    }[period] || "Selected Period";

  // In production, use proper PDF generation libraries
  return `
MILKFLOW BUSINESS REPORT
${periodText}
Generated: ${new Date().toLocaleDateString()}

This would be a professionally formatted PDF report with:
- Charts and graphs
- Detailed tables
- Financial summaries
- Performance metrics
- Area-wise breakdowns
- Worker performance
- Payment analytics

Report Type: ${reportType}
Period: ${periodText}

In production, this would be generated using libraries like:
- Puppeteer for HTML to PDF conversion
- jsPDF for client-side PDF generation
- PDFKit for server-side PDF creation
- Chart.js or D3.js for embedded charts
  `;
}
