import { RequestHandler } from "express";
import { ApiResponse } from "@shared/api";
import { supabase } from "../database/supabase";
import { supabaseDatabase } from "../database/supabase-models";

// Endpoint to update all customers to use universal pricing
export const updateAllCustomerRates: RequestHandler = async (_req, res) => {
  try {
    const pricingSettings = await supabaseDatabase.getPricingSettings();
    if (!pricingSettings) {
      const response: ApiResponse = {
        success: false,
        error: "Pricing settings not found",
      };
      return res.status(404).json(response);
    }
    const defaultRate = pricingSettings.defaultRate;
    const { error } = await (supabase as any)
      .from("customers")
      .update({ rate_per_liter: defaultRate });
    if (error) throw error;
    const { count } = await (supabase as any)
      .from("customers")
      .select("id", { count: "exact", head: true });
    const response: ApiResponse = {
      success: true,
      data: { updatedCount: count || 0, newRate: defaultRate },
      message: `Updated ${count || 0} customers to use universal rate of ₹${defaultRate}/L`,
    };
    res.json(response);
  } catch (error) {
    console.error("Error updating customer rates:", error);
    const response: ApiResponse = {
      success: false,
      error: "Failed to update customer rates",
    };
    res.status(500).json(response);
  }
};
