import { RequestHandler } from "express";
import {
  DailyDelivery,
  DailyQuantity,
  CustomerQuantityLink,
  ApiResponse,
} from "@shared/api";
import { supabase } from "../database/supabase";
import { supabaseDatabase } from "../database/supabase-models";

// Get daily deliveries
export const getDailyDeliveries: RequestHandler = async (req, res) => {
export const getDailyDeliveries: RequestHandler = async (req, res) => {
  try {
    const { date, customerId, workerId } = req.query as any;
    let query = (supabase as any).from("daily_deliveries").select("*");
    if (date) query = query.eq("date", date);
    if (customerId) query = query.eq("customer_id", parseInt(customerId));
    if (workerId) query = query.eq("worker_id", parseInt(workerId));
    const { data, error } = await query.order("date", { ascending: false });
    if (error) throw error;
    const mapped: DailyDelivery[] = (data || []).map((d: any) => ({
      id: d.id,
      customerId: d.customer_id,
      customerName: "",
      workerId: d.worker_id || 0,
      workerName: "",
      date: d.date,
      quantityDelivered: d.quantity_delivered,
      ratePerLiter: d.rate_per_liter,
      dailyAmount: d.daily_amount || d.quantity_delivered * d.rate_per_liter,
      status: d.status,
      notes: d.notes || undefined,
      deliveryTime: d.delivery_time || undefined,
      createdAt: d.created_at,
      updatedAt: d.updated_at,
    }));
    const response: ApiResponse<DailyDelivery[]> = {
      success: true,
      data: mapped,
    };
    res.json(response);
  } catch (error) {
    console.error("Error fetching daily deliveries:", error);
    res
      .status(500)
      .json({ success: false, error: "Failed to fetch daily deliveries" });
  }
};

// Create daily delivery record
export const createDailyDelivery: RequestHandler = async (req, res) => {
export const createDailyDelivery: RequestHandler = async (req, res) => {
  try {
    const deliveryData = req.body as any;
    if (
      !deliveryData.customerId ||
      !deliveryData.workerId ||
      !deliveryData.date ||
      deliveryData.quantityDelivered == null ||
      !deliveryData.ratePerLiter
    ) {
      return res
        .status(400)
        .json({ success: false, error: "Missing required delivery data" });
    }
    const { data, error } = await (supabase as any)
      .from("daily_deliveries")
      .insert({
        customer_id: deliveryData.customerId,
        worker_id: deliveryData.workerId,
        date: deliveryData.date,
        quantity_delivered: deliveryData.quantityDelivered,
        rate_per_liter: deliveryData.ratePerLiter,
        daily_amount:
          deliveryData.quantityDelivered * deliveryData.ratePerLiter,
        status: deliveryData.status || "delivered",
        notes: deliveryData.notes || null,
        delivery_time: deliveryData.deliveryTime || null,
      })
      .select("*")
      .single();
    if (error) throw error;
    const mapped: DailyDelivery = {
      id: data.id,
      customerId: data.customer_id,
      customerName: "",
      workerId: data.worker_id || 0,
      workerName: "",
      date: data.date,
      quantityDelivered: data.quantity_delivered,
      ratePerLiter: data.rate_per_liter,
      dailyAmount: data.daily_amount,
      status: data.status,
      notes: data.notes || undefined,
      deliveryTime: data.delivery_time || undefined,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
    const response: ApiResponse<DailyDelivery> = {
      success: true,
      data: mapped,
      message: "Daily delivery recorded successfully",
    };
    res.status(201).json(response);
  } catch (error) {
    console.error("Error creating daily delivery:", error);
    res
      .status(500)
      .json({ success: false, error: "Failed to create daily delivery" });
  }
};

// Get daily quantities
export const getDailyQuantities: RequestHandler = async (req, res) => {
export const getDailyQuantities: RequestHandler = async (req, res) => {
  try {
    const { customerId, date } = req.query as any;
    let query = (supabase as any).from("daily_quantities").select("*");
    if (customerId) query = query.eq("customer_id", parseInt(customerId));
    if (date) query = query.eq("date", date);
    const { data, error } = await query.order("date", { ascending: true });
    if (error) throw error;
    const mapped: DailyQuantity[] = (data || []).map((q: any) => ({
      id: q.id,
      customerId: q.customer_id,
      date: q.date,
      requestedQuantity: q.requested_quantity || undefined,
      currentQuantity: q.current_quantity || undefined,
      isLocked: q.is_locked,
      requestedAt: q.requested_at || undefined,
      createdAt: q.created_at,
      updatedAt: q.updated_at,
    }));
    const response: ApiResponse<DailyQuantity[]> = {
      success: true,
      data: mapped,
    };
    res.json(response);
  } catch (error) {
    console.error("Error fetching daily quantities:", error);
    res
      .status(500)
      .json({ success: false, error: "Failed to fetch daily quantities" });
  }
};

// Update customer quantity for next day
export const updateCustomerQuantity: RequestHandler = async (req, res) => {
export const updateCustomerQuantity: RequestHandler = async (req, res) => {
  try {
    const { customerId, date, quantity } = req.body as any;
    if (!customerId || !date || quantity == null) {
      return res.status(400).json({
        success: false,
        error: "Missing required fields: customerId, date, quantity",
      });
    }
    const { error } = await (supabase as any)
      .from("daily_quantities")
      .update({
        requested_quantity: quantity,
        requested_at: new Date().toISOString(),
      })
      .eq("customer_id", customerId)
      .eq("date", date);
    if (error) throw error;
    const response: ApiResponse<boolean> = {
      success: true,
      data: true,
      message: "Quantity updated successfully",
    };
    res.json(response);
  } catch (error) {
    console.error("Error updating customer quantity:", error);
    res
      .status(500)
      .json({ success: false, error: "Failed to update customer quantity" });
  }
};

// Generate customer quantity change link
export const generateQuantityLink: RequestHandler = async (req, res) => {
export const generateQuantityLink: RequestHandler = async (req, res) => {
  try {
    const { customerId } = req.params;

    if (!customerId) {
      return res.status(400).json({
        success: false,
        error: "Customer ID is required",
      });
    }
    const token = Math.random().toString(36).slice(2);
    const expires = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    const { data, error } = await (supabase as any)
      .from("customer_quantity_links")
      .upsert({
        customer_id: parseInt(customerId),
        unique_token: token,
        expires_at: expires,
        can_change: true,
      })
      .select("*")
      .single();
    if (error) throw error;
    const link: CustomerQuantityLink = {
      customerId: data.customer_id,
      customerName: "",
      currentQuantity: 0,
      nextDayQuantity: data.next_day_quantity || 0,
      uniqueToken: data.unique_token,
      expiresAt: data.expires_at,
      canChange: data.can_change,
    };
    const response: ApiResponse<CustomerQuantityLink> = {
      success: true,
      data: link,
      message: "Quantity change link generated successfully",
    };
    res.json(response);
  } catch (error) {
    console.error("Error generating quantity link:", error);
    res.status(500).json({
      success: false,
      error: "Failed to generate quantity link",
    });
  }
};

// Get customer by token (for quantity change links)
export const getCustomerByToken: RequestHandler = async (req, res) => {
export const getCustomerByToken: RequestHandler = async (req, res) => {
  try {
    const { token } = req.params;
    if (!token) {
      return res
        .status(400)
        .json({ success: false, error: "Token is required" });
    }
    const { data, error } = await (supabase as any)
      .from("customer_quantity_links")
      .select("*")
      .eq("unique_token", token)
      .single();
    if (error) throw error;
    const link: CustomerQuantityLink = {
      customerId: data.customer_id,
      customerName: "",
      currentQuantity: 0,
      nextDayQuantity: data.next_day_quantity || 0,
      uniqueToken: data.unique_token,
      expiresAt: data.expires_at,
      canChange: data.can_change,
    };
    const response: ApiResponse<CustomerQuantityLink> = {
      success: true,
      data: link,
    };
    res.json(response);
  } catch (error) {
    console.error("Error fetching customer by token:", error);
    res.status(404).json({ success: false, error: "Invalid or expired token" });
  }
};

// Update quantity via token (for customer links)
export const updateQuantityByToken: RequestHandler = async (req, res) => {
export const updateQuantityByToken: RequestHandler = async (req, res) => {
  try {
    const { token } = req.params;
    const { quantity, date } = req.body as any;
    if (!token || quantity == null || !date) {
      return res.status(400).json({
        success: false,
        error: "Token, quantity, and date are required",
      });
    }
    const { data: link } = await (supabase as any)
      .from("customer_quantity_links")
      .select("*")
      .eq("unique_token", token)
      .single();
    if (!link)
      return res
        .status(404)
        .json({ success: false, error: "Invalid or expired token" });
    const { error } = await (supabase as any)
      .from("daily_quantities")
      .update({
        requested_quantity: quantity,
        requested_at: new Date().toISOString(),
      })
      .eq("customer_id", link.customer_id)
      .eq("date", date);
    if (error) throw error;
    const response: ApiResponse<boolean> = {
      success: true,
      data: true,
      message: "Quantity updated successfully",
    };
    res.json(response);
  } catch (error) {
    console.error("Error updating quantity by token:", error);
    res
      .status(500)
      .json({ success: false, error: "Failed to update quantity" });
  }
};

// Calculate daily totals
export const getDailyTotals: RequestHandler = async (req, res) => {
export const getDailyTotals: RequestHandler = async (req, res) => {
  try {
    const { date } = req.query as any;
    if (!date) {
      return res
        .status(400)
        .json({ success: false, error: "Date is required" });
    }
    const { data } = await (supabase as any)
      .from("daily_deliveries")
      .select("customer_id, quantity_delivered, daily_amount")
      .eq("date", date);
    const totals = {
      totalRevenue: (data || []).reduce(
        (sum: number, d: any) => sum + (d.daily_amount || 0),
        0,
      ),
      totalMilk: (data || []).reduce(
        (sum: number, d: any) => sum + (d.quantity_delivered || 0),
        0,
      ),
      customerCount: new Set((data || []).map((d: any) => d.customer_id)).size,
    };
    const response: ApiResponse<any> = { success: true, data: totals };
    res.json(response);
  } catch (error) {
    console.error("Error calculating daily totals:", error);
    res
      .status(500)
      .json({ success: false, error: "Failed to calculate daily totals" });
  }
};
