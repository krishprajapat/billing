import { RequestHandler } from "express";
import { ApiResponse, Payment, CreatePaymentRequest, RecordPaymentRequest, MonthlyBill } from "@shared/api";
import { supabaseService } from "../database/supabase-service";

export const getPayments: RequestHandler = async (req, res) => {
  try {
    const payments = await supabaseService.getPayments(req.query);
    const response: ApiResponse<Payment[]> = {
      success: true,
      data: payments,
    };
    res.json(response);
  } catch (error) {
    console.error('Error fetching payments:', error);
    const response: ApiResponse = {
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch payments",
    };
    res.status(500).json(response);
  }
};


export const recordPayment: RequestHandler = async (req, res) => {
  try {
    const paymentData: RecordPaymentRequest = req.body;

    // Basic validation
    if (!paymentData.customerId || paymentData.amount === undefined || paymentData.amount === null || !paymentData.paymentMethod) {
      const response: ApiResponse = {
        success: false,
        error: "Customer ID, amount, and payment method are required",
      };
      return res.status(400).json(response);
    }

    if (paymentData.amount <= 0) {
      const response: ApiResponse = {
        success: false,
        error: "Payment amount must be greater than zero",
      };
      return res.status(400).json(response);
    }

    const customer = await supabaseService.getCustomerById(paymentData.customerId);
    if (!customer) {
      const response: ApiResponse = {
        success: false,
        error: "Customer not found",
      };
      return res.status(404).json(response);
    }

    // Process payment using the new engine
    const result = await supabaseService.createPayment({
      customerId: paymentData.customerId,
      amount: paymentData.amount,
      paymentMethod: paymentData.paymentMethod,
      paidDate: paymentData.paidDate,
      notes: paymentData.notes,
    });

    // Check for processing errors
    if (result.errors.length > 0) {
      const response: ApiResponse = {
        success: false,
        error: result.errors.join(', '),
      };
      return res.status(400).json(response);
    }

    // Generate success message
    let message = "Payment recorded successfully";
    const remainingBalance = result.summary?.totalDue || 0;

    if (remainingBalance > 0) {
      message = `Partial payment recorded. Remaining balance: ₹${remainingBalance.toLocaleString()}`;
    } else if (remainingBalance === 0) {
      message = "Full payment recorded. Account is now settled.";
    }

    // Add warnings if any
    if (result.warnings.length > 0) {
      message += ` Note: ${result.warnings.join(', ')}`;
    }

    const response: ApiResponse<{
      payment: Payment;
      summary: any;
      remainingBalance: number;
      warnings: string[];
    }> = {
      success: true,
      data: {
        payment: result.payment,
        summary: result.summary,
        remainingBalance,
        warnings: result.warnings || []
      },
      message,
    };
    res.status(201).json(response);
  } catch (error) {
    console.error('Payment recording error:', error);
    const response: ApiResponse = {
      success: false,
      error: error instanceof Error ? error.message : "Failed to record payment. Please try again.",
    };
    res.status(500).json(response);
  }
};

export const getCustomerPayments: RequestHandler = async (req, res) => {
  try {
    const customerId = parseInt(req.params.customerId);
    const payments = await supabaseService.getPayments({ customerId });

    const response: ApiResponse<Payment[]> = {
      success: true,
      data: payments,
    };
    res.json(response);
  } catch (error) {
    console.error('Error fetching customer payments:', error);
    const response: ApiResponse = {
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch customer payments",
    };
    res.status(500).json(response);
  }
};

export const getPaymentStats: RequestHandler = async (req, res) => {
  try {
    const customers = await supabaseService.getCustomers({ status: 'active' });
    const payments = await supabaseService.getPayments();

    // Use new payment summary calculations
    const paymentSummaries = await Promise.all(
      customers.map(c => supabaseService.getCustomerPaymentSummary(c.id))
    );
    const validSummaries = paymentSummaries.filter(Boolean);

    const currentDate = new Date();
    const currentMonth = currentDate.toLocaleString('default', { month: 'long' });
    const currentYear = currentDate.getFullYear();

    const currentMonthPayments = payments.filter(p =>
      p.month === currentMonth && p.year === currentYear
    );

    const totalRevenue = validSummaries.reduce((sum, s) => sum + s!.currentMonthAmount, 0);
    const collectedRevenue = currentMonthPayments
      .filter(p => p.status === 'paid')
      .reduce((sum, p) => sum + p.amount, 0);
    const pendingRevenue = validSummaries.reduce((sum, s) => sum + s!.totalDue, 0);

    const paidCustomers = validSummaries.filter(s => s!.paymentStatus === 'paid').length;
    const overdueCustomers = validSummaries.filter(s => s!.isOverdue && s!.totalDue > 0).length;
    const pendingCustomers = customers.length - paidCustomers;

    const paymentMethodStats = payments.reduce((acc: any, payment) => {
      if (!acc[payment.paymentMethod]) {
        acc[payment.paymentMethod] = { count: 0, amount: 0 };
      }
      acc[payment.paymentMethod].count++;
      acc[payment.paymentMethod].amount += payment.amount;
      return acc;
    }, {});

    const stats = {
      totalRevenue,
      collectedRevenue,
      pendingRevenue,
      collectionRate: totalRevenue > 0 ? (collectedRevenue / totalRevenue) * 100 : 0,
      paidCustomers,
      pendingCustomers,
      overdueCustomers,
      paymentMethodStats,
      totalTransactions: payments.length,
    };

    const response: ApiResponse = {
      success: true,
      data: stats,
    };
    res.json(response);
  } catch (error) {
    console.error('Error fetching payment stats:', error);
    const response: ApiResponse = {
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch payment statistics",
    };
    res.status(500).json(response);
  }
};

export const generateMonthlyBills: RequestHandler = async (req, res) => {
  try {
    const { month, year } = req.body;
    
    if (!month || !year) {
      const response: ApiResponse = {
        success: false,
        error: "Month and year are required",
      };
      return res.status(400).json(response);
    }

    const customers = await supabaseService.getCustomers({ status: 'active' });
    const bills: MonthlyBill[] = [];

    customers.forEach(customer => {
      const bill: MonthlyBill = {
        id: Date.now() + customer.id, // Simple ID generation
        customerId: customer.id,
        month,
        year: parseInt(year),
        milkQuantity: customer.dailyQuantity * 30, // Assuming 30 days
        ratePerLiter: customer.ratePerLiter,
        totalAmount: customer.monthlyAmount,
        paidAmount: 0,
        pendingAmount: customer.monthlyAmount,
        status: 'pending',
        dueDate: new Date(parseInt(year), new Date(`${month} 1`).getMonth() + 1, 5).toISOString().split('T')[0],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      bills.push(bill);
    });

    const response: ApiResponse<MonthlyBill[]> = {
      success: true,
      data: bills,
      message: `Generated ${bills.length} bills for ${month} ${year}`,
    };
    res.json(response);
  } catch (error) {
    console.error('Error generating monthly bills:', error);
    const response: ApiResponse = {
      success: false,
      error: error instanceof Error ? error.message : "Failed to generate monthly bills",
    };
    res.status(500).json(response);
  }
};

export const sendPaymentReminder: RequestHandler = (req, res) => {
  try {
    const { customerIds, method } = req.body;
    
    if (!Array.isArray(customerIds) || !method) {
      const response: ApiResponse = {
        success: false,
        error: "Customer IDs array and method are required",
      };
      return res.status(400).json(response);
    }

    // Mock sending reminders
    const customers = customerIds.map((id: number) => db.getCustomerById(id)).filter(Boolean);
    
    // In a real implementation, this would integrate with WhatsApp/SMS/Email services
    const remindersSent = customers.length;

    const response: ApiResponse = {
      success: true,
      message: `Successfully sent ${method} reminders to ${remindersSent} customers`,
      data: { remindersSent, method },
    };
    res.json(response);
  } catch (error) {
    const response: ApiResponse = {
      success: false,
      error: "Failed to send payment reminders",
    };
    res.status(500).json(response);
  }
};

export const generateInvoice: RequestHandler = (req, res) => {
  try {
    const customerId = parseInt(req.params.customerId);
    const { month, year } = req.query;

    const customer = db.getCustomerById(customerId);
    if (!customer) {
      const response: ApiResponse = {
        success: false,
        error: "Customer not found",
      };
      return res.status(404).json(response);
    }

    // Mock invoice generation
    const invoice = {
      invoiceNumber: `INV-${customerId}-${month}-${year}`,
      customer: customer,
      month: month || new Date().toLocaleString('default', { month: 'long' }),
      year: year || new Date().getFullYear(),
      items: [
        {
          description: `Milk delivery - ${customer.dailyQuantity}L daily`,
          quantity: customer.dailyQuantity * 30,
          rate: customer.ratePerLiter,
          amount: customer.monthlyAmount,
        }
      ],
      totalAmount: customer.monthlyAmount,
      generatedAt: new Date().toISOString(),
    };

    const response: ApiResponse = {
      success: true,
      data: invoice,
      message: "Invoice generated successfully",
    };
    res.json(response);
  } catch (error) {
    const response: ApiResponse = {
      success: false,
      error: "Failed to generate invoice",
    };
    res.status(500).json(response);
  }
};

export const getCustomerPaymentSummaries: RequestHandler = async (req, res) => {
  try {
    const customers = await supabaseService.getCustomers({ status: 'active' });
    const paymentSummaries = await Promise.all(customers.map(async customer => {
      const summary = await supabaseService.getCustomerPaymentSummary(customer.id);
      return summary ? {
        ...summary,
        customer: {
          ...summary.customer,
          areaName: summary.customer.areaName || 'Unknown',
          workerName: summary.customer.workerName || 'Unassigned'
        }
      } : null;
    }));
    const validSummaries = paymentSummaries.filter(Boolean);

    const response: ApiResponse = {
      success: true,
      data: validSummaries,
    };
    res.json(response);
  } catch (error) {
    console.error('Error fetching payment summaries:', error);
    const response: ApiResponse = {
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch customer payment summaries",
    };
    res.status(500).json(response);
  }
};

export const getOverduePayments: RequestHandler = async (req, res) => {
  try {
    const customers = await supabaseService.getCustomers({ status: 'active' });
    const summaries = await Promise.all(
      customers.map(customer => supabaseService.getCustomerPaymentSummary(customer.id))
    );
    const overdueCustomers = summaries.filter(summary => summary && summary.isOverdue && summary.totalDue > 0);

    const overduePayments = overdueCustomers.map(summary => ({
      customerId: summary!.customer.id,
      customerName: summary!.customer.name,
      customerPhone: summary!.customer.phone,
      area: summary!.customer.areaName || 'Unknown',
      overdueAmount: summary!.totalDue,
      monthlyAmount: summary!.currentMonthAmount,
      lastPayment: summary!.customer.lastPayment,
      worker: summary!.customer.workerName || 'Unassigned',
      currentMonthDue: summary!.currentMonthDue,
      lastMonthDue: summary!.month1Due,
      pendingDues: summary!.olderDues,
    }));

    const response: ApiResponse = {
      success: true,
      data: overduePayments,
    };
    res.json(response);
  } catch (error) {
    console.error('Error fetching overdue payments:', error);
    const response: ApiResponse = {
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch overdue payments",
    };
    res.status(500).json(response);
  }
};
