import { RequestHandler } from "express";
import { ApiResponse, Customer, CreateCustomerRequest, UpdateCustomerRequest } from "@shared/api";
import { db } from "../database/models";

export const getCustomers: RequestHandler = (req, res) => {
  try {
    const customers = db.getCustomers(req.query);
    const response: ApiResponse<Customer[]> = {
      success: true,
      data: customers,
    };
    res.json(response);
  } catch (error) {
    const response: ApiResponse = {
      success: false,
      error: "Failed to fetch customers",
    };
    res.status(500).json(response);
  }
};

export const getCustomerById: RequestHandler = (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const customer = db.getCustomerById(id);
    
    if (!customer) {
      const response: ApiResponse = {
        success: false,
        error: "Customer not found",
      };
      return res.status(404).json(response);
    }

    const response: ApiResponse<Customer> = {
      success: true,
      data: customer,
    };
    res.json(response);
  } catch (error) {
    const response: ApiResponse = {
      success: false,
      error: "Failed to fetch customer",
    };
    res.status(500).json(response);
  }
};

export const createCustomer: RequestHandler = (req, res) => {
  try {
    const customerData: CreateCustomerRequest = req.body;
    
    // Basic validation
    if (!customerData.name || !customerData.phone || !customerData.address) {
      const response: ApiResponse = {
        success: false,
        error: "Name, phone, and address are required",
      };
      return res.status(400).json(response);
    }

    const customer = db.createCustomer(customerData);
    const response: ApiResponse<Customer> = {
      success: true,
      data: customer,
      message: "Customer created successfully",
    };
    res.status(201).json(response);
  } catch (error) {
    const response: ApiResponse = {
      success: false,
      error: "Failed to create customer",
    };
    res.status(500).json(response);
  }
};

export const updateCustomer: RequestHandler = (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const updateData: UpdateCustomerRequest = req.body;
    
    const customer = db.updateCustomer(id, updateData);
    
    if (!customer) {
      const response: ApiResponse = {
        success: false,
        error: "Customer not found",
      };
      return res.status(404).json(response);
    }

    const response: ApiResponse<Customer> = {
      success: true,
      data: customer,
      message: "Customer updated successfully",
    };
    res.json(response);
  } catch (error) {
    const response: ApiResponse = {
      success: false,
      error: "Failed to update customer",
    };
    res.status(500).json(response);
  }
};

export const deleteCustomer: RequestHandler = (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const deleted = db.deleteCustomer(id);
    
    if (!deleted) {
      const response: ApiResponse = {
        success: false,
        error: "Customer not found",
      };
      return res.status(404).json(response);
    }

    const response: ApiResponse = {
      success: true,
      message: "Customer deleted successfully",
    };
    res.json(response);
  } catch (error) {
    const response: ApiResponse = {
      success: false,
      error: "Failed to delete customer",
    };
    res.status(500).json(response);
  }
};

export const getCustomerStats: RequestHandler = (req, res) => {
  try {
    const customers = db.getCustomers();
    const activeCustomers = customers.filter(c => c.status === 'active');
    const totalRevenue = activeCustomers.reduce((sum, c) => sum + c.monthlyAmount, 0);
    const pendingDues = activeCustomers.reduce((sum, c) => sum + c.pendingDues, 0);

    const stats = {
      totalCustomers: customers.length,
      activeCustomers: activeCustomers.length,
      inactiveCustomers: customers.length - activeCustomers.length,
      totalMonthlyRevenue: totalRevenue,
      totalPendingDues: pendingDues,
      averageOrderValue: activeCustomers.length > 0 ? totalRevenue / activeCustomers.length : 0,
    };

    const response: ApiResponse = {
      success: true,
      data: stats,
    };
    res.json(response);
  } catch (error) {
    const response: ApiResponse = {
      success: false,
      error: "Failed to fetch customer statistics",
    };
    res.status(500).json(response);
  }
};
