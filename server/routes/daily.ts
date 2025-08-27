import { RequestHandler } from "express";
import { db } from "../database/models";
import { DailyDelivery, DailyQuantity, CustomerQuantityLink, ApiResponse } from "@shared/api";

// Get daily deliveries
export const getDailyDeliveries: RequestHandler = (req, res) => {
  try {
    const { date, customerId, workerId } = req.query;
    
    const deliveries = db.getDailyDeliveries(
      date as string,
      customerId ? parseInt(customerId as string) : undefined,
      workerId ? parseInt(workerId as string) : undefined
    );

    const response: ApiResponse<DailyDelivery[]> = {
      success: true,
      data: deliveries,
    };

    res.json(response);
  } catch (error) {
    console.error('Error fetching daily deliveries:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch daily deliveries',
    });
  }
};

// Create daily delivery record
export const createDailyDelivery: RequestHandler = (req, res) => {
  try {
    const deliveryData = req.body;
    
    // Validate required fields
    if (!deliveryData.customerId || !deliveryData.workerId || !deliveryData.date || 
        !deliveryData.quantityDelivered || !deliveryData.ratePerLiter) {
      return res.status(400).json({
        success: false,
        error: 'Missing required delivery data',
      });
    }

    const delivery = db.createDailyDelivery(deliveryData);

    const response: ApiResponse<DailyDelivery> = {
      success: true,
      data: delivery,
      message: 'Daily delivery recorded successfully',
    };

    res.status(201).json(response);
  } catch (error) {
    console.error('Error creating daily delivery:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create daily delivery',
    });
  }
};

// Get daily quantities
export const getDailyQuantities: RequestHandler = (req, res) => {
  try {
    const { customerId, date } = req.query;
    
    const quantities = db.getDailyQuantities(
      customerId ? parseInt(customerId as string) : undefined,
      date as string
    );

    const response: ApiResponse<DailyQuantity[]> = {
      success: true,
      data: quantities,
    };

    res.json(response);
  } catch (error) {
    console.error('Error fetching daily quantities:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch daily quantities',
    });
  }
};

// Update customer quantity for next day
export const updateCustomerQuantity: RequestHandler = (req, res) => {
  try {
    const { customerId, date, quantity } = req.body;
    
    if (!customerId || !date || quantity === undefined) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: customerId, date, quantity',
      });
    }

    const success = db.updateCustomerQuantity(customerId, date, quantity);
    
    if (!success) {
      return res.status(400).json({
        success: false,
        error: 'Cannot update quantity - either customer not found or changes are locked',
      });
    }

    const response: ApiResponse<boolean> = {
      success: true,
      data: true,
      message: 'Quantity updated successfully',
    };

    res.json(response);
  } catch (error) {
    console.error('Error updating customer quantity:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update customer quantity',
    });
  }
};

// Generate customer quantity change link
export const generateQuantityLink: RequestHandler = (req, res) => {
  try {
    const { customerId } = req.params;
    
    if (!customerId) {
      return res.status(400).json({
        success: false,
        error: 'Customer ID is required',
      });
    }

    const link = db.generateCustomerQuantityLink(parseInt(customerId));
    
    if (!link) {
      return res.status(404).json({
        success: false,
        error: 'Customer not found',
      });
    }

    const response: ApiResponse<CustomerQuantityLink> = {
      success: true,
      data: link,
      message: 'Quantity change link generated successfully',
    };

    res.json(response);
  } catch (error) {
    console.error('Error generating quantity link:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate quantity link',
    });
  }
};

// Get customer by token (for quantity change links)
export const getCustomerByToken: RequestHandler = (req, res) => {
  try {
    const { token } = req.params;
    
    if (!token) {
      return res.status(400).json({
        success: false,
        error: 'Token is required',
      });
    }

    const customerLink = db.getCustomerByToken(token);
    
    if (!customerLink) {
      return res.status(404).json({
        success: false,
        error: 'Invalid or expired token',
      });
    }

    const response: ApiResponse<CustomerQuantityLink> = {
      success: true,
      data: customerLink,
    };

    res.json(response);
  } catch (error) {
    console.error('Error fetching customer by token:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch customer data',
    });
  }
};

// Update quantity via token (for customer links)
export const updateQuantityByToken: RequestHandler = (req, res) => {
  try {
    const { token } = req.params;
    const { quantity, date } = req.body;
    
    if (!token || quantity === undefined || !date) {
      return res.status(400).json({
        success: false,
        error: 'Token, quantity, and date are required',
      });
    }

    const customerLink = db.getCustomerByToken(token);
    
    if (!customerLink) {
      return res.status(404).json({
        success: false,
        error: 'Invalid or expired token',
      });
    }

    if (!customerLink.canChange) {
      return res.status(400).json({
        success: false,
        error: 'Quantity changes are no longer allowed for this date',
      });
    }

    const success = db.updateCustomerQuantity(customerLink.customerId, date, quantity);
    
    if (!success) {
      return res.status(400).json({
        success: false,
        error: 'Failed to update quantity - changes may be locked',
      });
    }

    const response: ApiResponse<boolean> = {
      success: true,
      data: true,
      message: 'Quantity updated successfully',
    };

    res.json(response);
  } catch (error) {
    console.error('Error updating quantity by token:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update quantity',
    });
  }
};

// Process end of day
export const processEndOfDay: RequestHandler = (req, res) => {
  try {
    const { date } = req.body;
    
    if (!date) {
      return res.status(400).json({
        success: false,
        error: 'Date is required',
      });
    }

    const eodProcess = db.processEndOfDay(date);

    const response: ApiResponse<any> = {
      success: true,
      data: eodProcess,
      message: 'End of day processing completed successfully',
    };

    res.json(response);
  } catch (error) {
    console.error('Error processing end of day:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to process end of day',
    });
  }
};

// Calculate daily totals
export const getDailyTotals: RequestHandler = (req, res) => {
  try {
    const { date } = req.query;
    
    if (!date) {
      return res.status(400).json({
        success: false,
        error: 'Date is required',
      });
    }

    const totals = db.calculateDailyTotals(date as string);

    const response: ApiResponse<any> = {
      success: true,
      data: totals,
    };

    res.json(response);
  } catch (error) {
    console.error('Error calculating daily totals:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to calculate daily totals',
    });
  }
};
