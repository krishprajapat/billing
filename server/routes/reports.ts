import { RequestHandler } from "express";
import { ApiResponse, MonthlyReport, WorkerPerformance, AreaReport, PaymentMethodReport, PaymentMethod } from "@shared/api";
import { supabaseService } from "../database/supabase-service";

export const getMonthlyReports: RequestHandler = async (req, res) => {
  try {
    const { period = '6months', startDate, endDate } = req.query;

    const monthlyReports = await supabaseService.getMonthlyReports(period as string);

    const response: ApiResponse<MonthlyReport[]> = {
      success: true,
      data: monthlyReports,
    };
    res.json(response);
  } catch (error) {
    console.error('Error fetching monthly reports:', error);
    const response: ApiResponse = {
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch monthly reports",
    };
    res.status(500).json(response);
  }
};

export const getWorkerPerformanceReport: RequestHandler = async (req, res) => {
  try {
    const { period = '6months' } = req.query;
    const workerPerformance = await supabaseService.getWorkerPerformanceReport(period as string);

    const response: ApiResponse<WorkerPerformance[]> = {
      success: true,
      data: workerPerformance,
    };
    res.json(response);
  } catch (error) {
    console.error('Error fetching worker performance report:', error);
    const response: ApiResponse = {
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch worker performance report",
    };
    res.status(500).json(response);
  }
};

export const getAreaWiseReport: RequestHandler = async (req, res) => {
  try {
    const { period = '6months' } = req.query;
    const areaReports = await supabaseService.getAreaWiseReport(period as string);

    const response: ApiResponse<AreaReport[]> = {
      success: true,
      data: areaReports,
    };
    res.json(response);
  } catch (error) {
    console.error('Error fetching area-wise report:', error);
    const response: ApiResponse = {
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch area-wise report",
    };
    res.status(500).json(response);
  }
};

export const getPaymentMethodReport: RequestHandler = async (req, res) => {
  try {
    const { period = '6months' } = req.query;
    const paymentMethodReports = await supabaseService.getPaymentMethodReport(period as string);

    const response: ApiResponse<PaymentMethodReport[]> = {
      success: true,
      data: paymentMethodReports,
    };
    res.json(response);
  } catch (error) {
    console.error('Error fetching payment method report:', error);
    const response: ApiResponse = {
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch payment method report",
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

export const exportReportsPDF: RequestHandler = (req, res) => {
  try {
    const { period = '6months', reportType = 'complete' } = req.query;

    // Get all report data based on period
    const periodParams = { period: period as string };

    // In a real implementation, you would:
    // 1. Fetch all the report data using the existing functions
    // 2. Use a PDF generation library like puppeteer, jsPDF, or PDFKit
    // 3. Generate a professional PDF report

    // For now, return a simple text response that would be a PDF
    const pdfContent = generatePDFContent(period as string, reportType as string);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=business-report-${period}-${new Date().toISOString().split('T')[0]}.pdf`);
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
  const periodText = {
    '1month': 'Last Month',
    '3months': 'Last 3 Months',
    '6months': 'Last 6 Months',
    '1year': 'Last Year'
  }[period] || 'Selected Period';

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
