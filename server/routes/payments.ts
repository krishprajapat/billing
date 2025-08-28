import { RequestHandler } from "express";
import { ApiResponse, Payment, CreatePaymentRequest, RecordPaymentRequest, MonthlyBill } from "@shared/api";
import { db } from "../database/models";

export const getPayments: RequestHandler = (req, res) => {
  try {
    const payments = db.getPayments(req.query);
    const response: ApiResponse<Payment[]> = {
      success: true,
      data: payments,
    };
    res.json(response);
  } catch (error) {
    const response: ApiResponse = {
      success: false,
      error: "Failed to fetch payments",
    };
    res.status(500).json(response);
  }
};

export const recordPayment: RequestHandler = (req, res) => {
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

    const customer = db.getCustomerById(paymentData.customerId);
    if (!customer) {
      const response: ApiResponse = {
        success: false,
        error: "Customer not found",
      };
      return res.status(404).json(response);
    }

    // Calculate customer's total due (current month + pending dues)
    const totalDue = (customer.currentMonthAmount || 0) + (customer.pendingDues || 0);

    // Determine payment status based on amount vs total due
    let paymentStatus: 'paid' | 'partial' | 'pending' = 'paid';
    if (paymentData.amount < totalDue) {
      paymentStatus = 'partial';
    }

    const currentDate = new Date();
    const payment = db.createPayment({
      customerId: paymentData.customerId,
      amount: paymentData.amount,
      paymentMethod: paymentData.paymentMethod,
      status: paymentStatus,
      month: currentDate.toLocaleString('default', { month: 'long' }),
      year: currentDate.getFullYear(),
      dueDate: paymentData.paidDate,
      paidDate: paymentData.paidDate,
      notes: paymentData.notes,
    });

    // Create success message based on payment type
    let message = "Payment recorded successfully";
    if (paymentStatus === 'partial') {
      const remainingBalance = totalDue - paymentData.amount;
      message = `Partial payment recorded. Remaining balance: ₹${remainingBalance.toLocaleString()}`;
    }

    const response: ApiResponse<Payment> = {
      success: true,
      data: payment,
      message,
    };
    res.status(201).json(response);
  } catch (error) {
    const response: ApiResponse = {
      success: false,
      error: "Failed to record payment",
    };
    res.status(500).json(response);
  }
};

export const getCustomerPayments: RequestHandler = (req, res) => {
  try {
    const customerId = parseInt(req.params.customerId);
    const payments = db.getPayments({ customerId });

    const response: ApiResponse<Payment[]> = {
      success: true,
      data: payments,
    };
    res.json(response);
  } catch (error) {
    const response: ApiResponse = {
      success: false,
      error: "Failed to fetch customer payments",
    };
    res.status(500).json(response);
  }
};

export const getPaymentStats: RequestHandler = (req, res) => {
  try {
    const customers = db.getCustomers({ status: 'active' });
    const payments = db.getPayments();
    
    const currentDate = new Date();
    const currentMonth = currentDate.toLocaleString('default', { month: 'long' });
    const currentYear = currentDate.getFullYear();
    
    const currentMonthPayments = payments.filter(p => 
      p.month === currentMonth && p.year === currentYear
    );

    const totalRevenue = customers.reduce((sum, c) => sum + c.monthlyAmount, 0);
    const collectedRevenue = currentMonthPayments
      .filter(p => p.status === 'paid')
      .reduce((sum, p) => sum + p.amount, 0);
    const pendingRevenue = customers.reduce((sum, c) => sum + c.pendingDues, 0);

    const paidCustomers = customers.filter(c => c.pendingDues === 0).length;
    const pendingCustomers = customers.filter(c => c.pendingDues > 0).length;

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
      overdueCustomers: customers.filter(c => c.pendingDues > c.monthlyAmount).length,
      paymentMethodStats,
      totalTransactions: payments.length,
    };

    const response: ApiResponse = {
      success: true,
      data: stats,
    };
    res.json(response);
  } catch (error) {
    const response: ApiResponse = {
      success: false,
      error: "Failed to fetch payment statistics",
    };
    res.status(500).json(response);
  }
};

export const generateMonthlyBills: RequestHandler = (req, res) => {
  try {
    const { month, year } = req.body;
    
    if (!month || !year) {
      const response: ApiResponse = {
        success: false,
        error: "Month and year are required",
      };
      return res.status(400).json(response);
    }

    const customers = db.getCustomers({ status: 'active' });
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
    const response: ApiResponse = {
      success: false,
      error: "Failed to generate monthly bills",
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

export const getOverduePayments: RequestHandler = (req, res) => {
  try {
    const customers = db.getCustomers({ status: 'active' });
    const overdueCustomers = customers.filter(c => c.pendingDues > 0);

    const overduePayments = overdueCustomers.map(customer => ({
      customerId: customer.id,
      customerName: customer.name,
      customerPhone: customer.phone,
      area: customer.area,
      overdueAmount: customer.pendingDues,
      monthlyAmount: customer.monthlyAmount,
      lastPayment: customer.lastPayment,
      worker: customer.workerName,
    }));

    const response: ApiResponse = {
      success: true,
      data: overduePayments,
    };
    res.json(response);
  } catch (error) {
    const response: ApiResponse = {
      success: false,
      error: "Failed to fetch overdue payments",
    };
    res.status(500).json(response);
  }
};
