import { RequestHandler } from "express";
import {
  ApiResponse,
  Payment,
  RecordPaymentRequest,
  MonthlyBill,
} from "@shared/api";
import { supabase } from "../database/supabase";
import { supabaseDatabase } from "../database/supabase-models";

export const getPayments: RequestHandler = async (req, res) => {
  try {
    let query = (supabase as any).from("payments").select("*");
    const { customerId, status, month, year } = req.query as any;
    if (customerId) query = query.eq("customer_id", parseInt(customerId));
    if (status) query = query.eq("status", status);
    if (month && year)
      query = query.eq("month", month).eq("year", parseInt(year));
    const { data, error } = await query.order("created_at", {
      ascending: false,
    });
    if (error) throw error;
    const mapped: Payment[] = (data || []).map((p: any) => ({
      id: p.id,
      customerId: p.customer_id,
      customerName: "",
      amount: p.amount,
      paymentMethod: p.payment_method,
      status: p.status,
      month: p.month || undefined,
      year: p.year || undefined,
      dueDate: p.due_date || undefined,
      paidDate: p.paid_date || undefined,
      notes: p.notes || undefined,
      createdAt: p.created_at,
      updatedAt: p.updated_at,
    }));
    const response: ApiResponse<Payment[]> = { success: true, data: mapped };
    res.json(response);
  } catch (error) {
    console.error("Error fetching payments:", error);
    const response: ApiResponse = {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to fetch payments",
    };
    res.status(500).json(response);
  }
};

export const recordPayment: RequestHandler = async (req, res) => {
  try {
    const paymentData: RecordPaymentRequest = req.body;
    if (
      !paymentData.customerId ||
      paymentData.amount == null ||
      !paymentData.paymentMethod
    ) {
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
    const { data: inserted, error } = await (supabase as any)
      .from("payments")
      .insert({
        customer_id: paymentData.customerId,
        amount: paymentData.amount,
        payment_method: paymentData.paymentMethod,
        status: "paid",
        paid_date:
          paymentData.paidDate || new Date().toISOString().split("T")[0],
        notes: paymentData.notes || null,
      })
      .select("*")
      .single();
    if (error) throw error;
    const payment: Payment = {
      id: inserted.id,
      customerId: inserted.customer_id,
      customerName: "",
      amount: inserted.amount,
      paymentMethod: inserted.payment_method,
      status: inserted.status,
      month: inserted.month || undefined,
      year: inserted.year || undefined,
      dueDate: inserted.due_date || undefined,
      paidDate: inserted.paid_date || undefined,
      notes: inserted.notes || undefined,
      createdAt: inserted.created_at,
      updatedAt: inserted.updated_at,
    };
    const response: ApiResponse<Payment> = {
      success: true,
      data: payment,
      message: "Payment recorded successfully",
    };
    res.status(201).json(response);
  } catch (error) {
    console.error("Payment recording error:", error);
    const response: ApiResponse = {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to record payment. Please try again.",
    };
    res.status(500).json(response);
  }
};

export const getCustomerPayments: RequestHandler = async (req, res) => {
  try {
    const customerId = parseInt(req.params.customerId);
    const { data, error } = await (supabase as any)
      .from("payments")
      .select("*")
      .eq("customer_id", customerId);
    if (error) throw error;
    const mapped: Payment[] = (data || []).map((p: any) => ({
      id: p.id,
      customerId: p.customer_id,
      customerName: "",
      amount: p.amount,
      paymentMethod: p.payment_method,
      status: p.status,
      month: p.month || undefined,
      year: p.year || undefined,
      dueDate: p.due_date || undefined,
      paidDate: p.paid_date || undefined,
      notes: p.notes || undefined,
      createdAt: p.created_at,
      updatedAt: p.updated_at,
    }));
    const response: ApiResponse<Payment[]> = { success: true, data: mapped };
    res.json(response);
  } catch (error) {
    console.error("Error fetching customer payments:", error);
    const response: ApiResponse = {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to fetch customer payments",
    };
    res.status(500).json(response);
  }
};

export const getPaymentStats: RequestHandler = async (_req, res) => {
  try {
    const customers = await supabaseDatabase.getCustomers({ status: "active" });
    const { data: payments } = await (supabase as any)
      .from("payments")
      .select("*");
    const collectedRevenue = (payments || [])
      .filter((p: any) => p.status === "paid")
      .reduce((sum: number, p: any) => sum + p.amount, 0);
    const totalRevenue = customers.reduce(
      (sum, c) => sum + (c.currentMonthAmount || 0),
      0,
    );
    const pendingRevenue = customers.reduce(
      (sum, c) => sum + (c.pendingDues || 0),
      0,
    );
    const paymentMethodStats = (payments || []).reduce(
      (acc: any, p: any) => {
        if (!acc[p.payment_method])
          acc[p.payment_method] = { count: 0, amount: 0 };
        acc[p.payment_method].count++;
        acc[p.payment_method].amount += p.amount;
        return acc;
      },
      {} as Record<string, { count: number; amount: number }>,
    );
    const stats = {
      totalRevenue,
      collectedRevenue,
      pendingRevenue,
      collectionRate:
        totalRevenue > 0 ? (collectedRevenue / totalRevenue) * 100 : 0,
      paidCustomers: 0,
      pendingCustomers: customers.length,
      overdueCustomers: 0,
      paymentMethodStats,
      totalTransactions: (payments || []).length,
    };
    const response: ApiResponse = { success: true, data: stats };
    res.json(response);
  } catch (error) {
    console.error("Error fetching payment stats:", error);
    const response: ApiResponse = {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to fetch payment statistics",
    };
    res.status(500).json(response);
  }
};

export const generateMonthlyBills: RequestHandler = async (req, res) => {
  try {
    const { month, year } = req.body as { month?: string; year?: string };

    if (!month || !year) {
      const response: ApiResponse = {
        success: false,
        error: "Month and year are required",
      };
      return res.status(400).json(response);
    }

    const customers = await supabaseDatabase.getCustomers({ status: "active" });
    const bills: MonthlyBill[] = customers.map((customer) => {
      return {
        id: Date.now() + customer.id,
        customerId: customer.id,
        month,
        year: parseInt(year),
        milkQuantity: (customer.dailyQuantity || 0) * 30,
        ratePerLiter: customer.ratePerLiter,
        totalAmount: customer.monthlyAmount || 0,
        paidAmount: 0,
        pendingAmount: customer.monthlyAmount || 0,
        status: "pending",
        dueDate: new Date(
          parseInt(year),
          new Date(`${month} 1`).getMonth() + 1,
          5,
        )
          .toISOString()
          .split("T")[0],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
    });

    const response: ApiResponse<MonthlyBill[]> = {
      success: true,
      data: bills,
      message: `Generated ${bills.length} bills for ${month} ${year}`,
    };
    res.json(response);
  } catch (error) {
    console.error("Error generating monthly bills:", error);
    const response: ApiResponse = {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to generate monthly bills",
    };
    res.status(500).json(response);
  }
};

export const sendPaymentReminder: RequestHandler = async (req, res) => {
  try {
    const { customerIds, method } = req.body as {
      customerIds?: number[];
      method?: string;
    };

    if (!Array.isArray(customerIds) || !method) {
      const response: ApiResponse = {
        success: false,
        error: "Customer IDs array and method are required",
      };
      return res.status(400).json(response);
    }

    // Mock sending reminders: look up customers
    const customers = (
      await Promise.all(
        customerIds.map(
          async (id) => await supabaseDatabase.getCustomerById(id),
        ),
      )
    ).filter(Boolean);

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

export const generateInvoice: RequestHandler = async (req, res) => {
  try {
    const customerId = parseInt(req.params.customerId);
    const { month, year } = req.query as { month?: string; year?: string };

    const customer = await supabaseDatabase.getCustomerById(customerId);
    if (!customer) {
      const response: ApiResponse = {
        success: false,
        error: "Customer not found",
      };
      return res.status(404).json(response);
    }

    const invoice = {
      invoiceNumber: `INV-${customerId}-${month}-${year}`,
      customer: customer,
      month: month || new Date().toLocaleString("default", { month: "long" }),
      year: year || new Date().getFullYear(),
      items: [
        {
          description: `Milk delivery - ${customer.dailyQuantity}L daily`,
          quantity: (customer.dailyQuantity || 0) * 30,
          rate: customer.ratePerLiter,
          amount: customer.monthlyAmount || 0,
        },
      ],
      totalAmount: customer.monthlyAmount || 0,
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

export const getCustomerPaymentSummaries: RequestHandler = async (
  _req,
  res,
) => {
  try {
    // Get all active customers
    const customers = await supabaseDatabase.getCustomers({ status: "active" });

    // Compute current month range
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
      .toISOString()
      .slice(0, 10);
    const startOfNextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1)
      .toISOString()
      .slice(0, 10);

    // Fetch payments for these customers within current month to compute paid totals
    const customerIds = customers.map((c) => c.id);
    let paymentsByCustomer: Record<number, number> = {};
    if (customerIds.length > 0) {
      const { data: monthPayments, error: paymentsError } = await (
        supabase as any
      )
        .from("payments")
        .select("customer_id, amount, status, paid_date")
        .in("customer_id", customerIds)
        .eq("status", "paid")
        .gte("paid_date", startOfMonth)
        .lt("paid_date", startOfNextMonth);
      if (paymentsError) throw paymentsError;

      paymentsByCustomer = (monthPayments || []).reduce(
        (acc: Record<number, number>, p: any) => {
          acc[p.customer_id] = (acc[p.customer_id] || 0) + (p.amount || 0);
          return acc;
        },
        {} as Record<number, number>,
      );
    }

    const paymentSummaries = customers.map((customer) => {
      const currentMonthAmount = customer.currentMonthAmount || 0;
      const currentMonthPaid = paymentsByCustomer[customer.id] || 0;
      const currentMonthDue = Math.max(
        0,
        currentMonthAmount - currentMonthPaid,
      );

      // pendingDues is assumed to be total overall pending from DB (may already include current month)
      const totalDue = Math.max(0, customer.pendingDues || 0);

      // Best-effort split: treat older dues as the portion beyond current month due
      const olderDues = Math.max(0, totalDue - currentMonthDue);

      return {
        customer: {
          ...customer,
          areaName: customer.areaName || "Unknown",
          workerName: customer.workerName || "Unassigned",
        },
        currentMonthAmount,
        currentMonthPaid,
        currentMonthDue,
        // Previous months not tracked yet in DB; expose zeros to keep UI stable
        month1Amount: 0,
        month1Paid: 0,
        month1Due: 0,
        month2Amount: 0,
        month2Paid: 0,
        month2Due: 0,
        month3Amount: 0,
        month3Paid: 0,
        month3Due: 0,
        olderDues,
        totalDue,
        paymentStatus:
          totalDue <= 0 ? "paid" : currentMonthPaid > 0 ? "partial" : "pending",
        isOverdue: totalDue > 0,
        lastPaymentDate: customer.lastPayment || null,
      };
    });

    const response: ApiResponse = {
      success: true,
      data: paymentSummaries,
    };
    res.json(response);
  } catch (error) {
    console.error("Error fetching payment summaries:", error);
    const response: ApiResponse = {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to fetch customer payment summaries",
    };
    res.status(500).json(response);
  }
};

export const getOverduePayments: RequestHandler = async (_req, res) => {
  try {
    const customers = await supabaseDatabase.getCustomers({ status: "active" });
    const overduePayments = customers
      .filter((c) => (c.pendingDues || 0) > 0)
      .map((c) => ({
        customerId: c.id,
        customerName: c.name,
        customerPhone: c.phone,
        area: c.areaName || "Unknown",
        overdueAmount: c.pendingDues || 0,
        monthlyAmount: c.currentMonthAmount || 0,
        lastPayment: c.lastPayment,
        worker: c.workerName || "Unassigned",
        currentMonthDue: Math.max(0, (c.currentMonthAmount || 0) - 0),
        lastMonthDue: 0,
        pendingDues: c.pendingDues || 0,
      }));

    const response: ApiResponse = {
      success: true,
      data: overduePayments,
    };
    res.json(response);
  } catch (error) {
    console.error("Error fetching overdue payments:", error);
    const response: ApiResponse = {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to fetch overdue payments",
    };
    res.status(500).json(response);
  }
};
