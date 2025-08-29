import { RequestHandler } from "express";
import { ApiResponse, PricingSettings, BusinessSettings, PaymentGatewaySettings } from "@shared/api";
import { db } from "../database/models";

// Get pricing settings
export const getPricingSettings: RequestHandler = (req, res) => {
  try {
    const settings = db.getPricingSettings();
    if (!settings) {
      const response: ApiResponse = { success: false, error: "Pricing settings not found" };
      return res.status(404).json(response);
    }
    const response: ApiResponse<PricingSettings> = { success: true, data: settings };
    res.json(response);
  } catch (error) {
    console.error('Error fetching pricing settings:', error);
    const response: ApiResponse = { success: false, error: "Failed to fetch pricing settings" };
    res.status(500).json(response);
  }
};

// Update pricing settings
export const updatePricingSettings: RequestHandler = (req, res) => {
  try {
    const updatedSettings = db.updatePricingSettings(req.body);
    const response: ApiResponse<PricingSettings> = { success: true, data: updatedSettings };
    res.json(response);
  } catch (error) {
    console.error('Error updating pricing settings:', error);
    const response: ApiResponse = { success: false, error: "Failed to update pricing settings" };
    res.status(500).json(response);
  }
};

// Get business settings
export const getBusinessSettings: RequestHandler = (req, res) => {
  try {
    const settings = db.getBusinessSettings();
    if (!settings) {
      const response: ApiResponse = { success: false, error: "Business settings not found" };
      return res.status(404).json(response);
    }
    const response: ApiResponse<BusinessSettings> = { success: true, data: settings };
    res.json(response);
  } catch (error) {
    console.error('Error fetching business settings:', error);
    const response: ApiResponse = { success: false, error: "Failed to fetch business settings" };
    res.status(500).json(response);
  }
};

// Update business settings
export const updateBusinessSettings: RequestHandler = (req, res) => {
  try {
    const updatedSettings = db.updateBusinessSettings(req.body);
    const response: ApiResponse<BusinessSettings> = { success: true, data: updatedSettings };
    res.json(response);
  } catch (error) {
    console.error('Error updating business settings:', error);
    const response: ApiResponse = { success: false, error: "Failed to update business settings" };
    res.status(500).json(response);
  }
};

// Get payment gateway settings
export const getPaymentGatewaySettings: RequestHandler = (req, res) => {
  try {
    const settings = db.getPaymentGatewaySettings();
    if (!settings) {
      const response: ApiResponse = { success: false, error: "Payment gateway settings not found" };
      return res.status(404).json(response);
    }
    const response: ApiResponse<PaymentGatewaySettings> = { success: true, data: settings };
    res.json(response);
  } catch (error) {
    console.error('Error fetching payment gateway settings:', error);
    const response: ApiResponse = { success: false, error: "Failed to fetch payment gateway settings" };
    res.status(500).json(response);
  }
};

// Update payment gateway settings
export const updatePaymentGatewaySettings: RequestHandler = (req, res) => {
  try {
    const updatedSettings = db.updatePaymentGatewaySettings(req.body);
    const response: ApiResponse<PaymentGatewaySettings> = { success: true, data: updatedSettings };
    res.json(response);
  } catch (error) {
    console.error('Error updating payment gateway settings:', error);
    const response: ApiResponse = { success: false, error: "Failed to update payment gateway settings" };
    res.status(500).json(response);
  }
};
