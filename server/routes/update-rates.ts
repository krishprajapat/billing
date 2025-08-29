import { RequestHandler } from "express";
import { ApiResponse } from "@shared/api";
import { supabaseService } from "../database/supabase-service";

// Endpoint to update all customers to use universal pricing
export const updateAllCustomerRates: RequestHandler = async (req, res) => {
  try {
    const pricingSettings = await supabaseService.getPricingSettings();
    if (!pricingSettings) {
      const response: ApiResponse = { success: false, error: "Pricing settings not found" };
      return res.status(404).json(response);
    }

    const customers = await supabaseService.getCustomers();
    let updatedCount = 0;

    for (const customer of customers) {
      if (customer.ratePerLiter !== pricingSettings.defaultRate) {
        await supabaseService.updateCustomer(customer.id, { 
          ratePerLiter: pricingSettings.defaultRate 
        });
        updatedCount++;
      }
    }

    const response: ApiResponse = { 
      success: true, 
      data: { 
        updatedCount, 
        newRate: pricingSettings.defaultRate 
      },
      message: `Updated ${updatedCount} customers to use universal rate of ₹${pricingSettings.defaultRate}/L`
    };
    res.json(response);
  } catch (error) {
    console.error('Error updating customer rates:', error);
    const response: ApiResponse = { success: false, error: error instanceof Error ? error.message : "Failed to update customer rates" };
    res.status(500).json(response);
  }
};
