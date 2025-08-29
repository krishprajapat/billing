import { RequestHandler } from "express";
import { ApiResponse } from "@shared/api";
import { db } from "../database/models";

// Endpoint to update all customers to use universal pricing
export const updateAllCustomerRates: RequestHandler = (req, res) => {
  try {
    const pricingSettings = db.getPricingSettings();
    if (!pricingSettings) {
      const response: ApiResponse = { success: false, error: "Pricing settings not found" };
      return res.status(404).json(response);
    }

    const customers = db.getCustomers();
    let updatedCount = 0;

    customers.forEach(customer => {
      if (customer.ratePerLiter !== pricingSettings.defaultRate) {
        db.updateCustomer(customer.id, { 
          ratePerLiter: pricingSettings.defaultRate 
        });
        updatedCount++;
      }
    });

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
    const response: ApiResponse = { success: false, error: "Failed to update customer rates" };
    res.status(500).json(response);
  }
};
