import { RequestHandler } from "express";
import { ApiResponse, PricingSettings, BusinessSettings, PaymentGatewaySettings } from "@shared/api";
import { supabaseService } from "../database/supabase-service";

// Get pricing settings
export const getPricingSettings: RequestHandler = async (req, res) => {
  try {
    const settings = await supabaseService.getPricingSettings();
    if (!settings) {
      const response: ApiResponse = { success: false, error: "Pricing settings not found" };
      return res.status(404).json(response);
    }
    const response: ApiResponse<PricingSettings> = { success: true, data: settings };
    res.json(response);
  } catch (error) {
    console.error('Error fetching pricing settings:', error);
    const response: ApiResponse = { success: false, error: error instanceof Error ? error.message : "Failed to fetch pricing settings" };
    res.status(500).json(response);
  }
};

// Update pricing settings
export const updatePricingSettings: RequestHandler = async (req, res) => {
  try {
    const updatedSettings = await supabaseService.updatePricingSettings(req.body);
    const response: ApiResponse<PricingSettings> = { success: true, data: updatedSettings };
    res.json(response);
  } catch (error) {
    console.error('Error updating pricing settings:', error);
    const response: ApiResponse = { success: false, error: error instanceof Error ? error.message : "Failed to update pricing settings" };
    res.status(500).json(response);
  }
};

// Get business settings
export const getBusinessSettings: RequestHandler = async (req, res) => {
  try {
    const settings = await supabaseService.getBusinessSettings();
    if (!settings) {
      const response: ApiResponse = { success: false, error: "Business settings not found" };
      return res.status(404).json(response);
    }
    const response: ApiResponse<BusinessSettings> = { success: true, data: settings };
    res.json(response);
  } catch (error) {
    console.error('Error fetching business settings:', error);
    const response: ApiResponse = { success: false, error: error instanceof Error ? error.message : "Failed to fetch business settings" };
    res.status(500).json(response);
  }
};

// Update business settings
export const updateBusinessSettings: RequestHandler = async (req, res) => {
  try {
    const updatedSettings = await supabaseService.updateBusinessSettings(req.body);
    const response: ApiResponse<BusinessSettings> = { success: true, data: updatedSettings };
    res.json(response);
  } catch (error) {
    console.error('Error updating business settings:', error);
    const response: ApiResponse = { success: false, error: error instanceof Error ? error.message : "Failed to update business settings" };
    res.status(500).json(response);
  }
};

// Get payment gateway settings
export const getPaymentGatewaySettings: RequestHandler = async (req, res) => {
  try {
    const settings = await supabaseService.getPaymentGatewaySettings();
    if (!settings) {
      const response: ApiResponse = { success: false, error: "Payment gateway settings not found" };
      return res.status(404).json(response);
    }
    const response: ApiResponse<PaymentGatewaySettings> = { success: true, data: settings };
    res.json(response);
  } catch (error) {
    console.error('Error fetching payment gateway settings:', error);
    const response: ApiResponse = { success: false, error: error instanceof Error ? error.message : "Failed to fetch payment gateway settings" };
    res.status(500).json(response);
  }
};

// Update payment gateway settings
export const updatePaymentGatewaySettings: RequestHandler = async (req, res) => {
  try {
    const updatedSettings = await supabaseService.updatePaymentGatewaySettings(req.body);
    const response: ApiResponse<PaymentGatewaySettings> = { success: true, data: updatedSettings };
    res.json(response);
  } catch (error) {
    console.error('Error updating payment gateway settings:', error);
    const response: ApiResponse = { success: false, error: error instanceof Error ? error.message : "Failed to update payment gateway settings" };
    res.status(500).json(response);
  }
};
