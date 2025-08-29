import { RequestHandler } from "express";
import { ApiResponse, Worker, CreateWorkerRequest, UpdateWorkerRequest, WorkerPerformance } from "@shared/api";
import { supabaseService } from "../database/supabase-service";

export const getWorkers: RequestHandler = async (req, res) => {
  try {
    const workers = await supabaseService.getWorkers(req.query);
    const response: ApiResponse<Worker[]> = {
      success: true,
      data: workers,
    };
    res.json(response);
  } catch (error) {
    console.error('Error fetching workers:', error);
    const response: ApiResponse = {
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch workers",
    };
    res.status(500).json(response);
  }
};

export const getWorkerById: RequestHandler = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const worker = await supabaseService.getWorkerById(id);
    
    if (!worker) {
      const response: ApiResponse = {
        success: false,
        error: "Worker not found",
      };
      return res.status(404).json(response);
    }

    const response: ApiResponse<Worker> = {
      success: true,
      data: worker,
    };
    res.json(response);
  } catch (error) {
    console.error('Error fetching worker:', error);
    const response: ApiResponse = {
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch worker",
    };
    res.status(500).json(response);
  }
};

export const createWorker: RequestHandler = async (req, res) => {
  try {
    const workerData: CreateWorkerRequest = req.body;
    
    // Basic validation
    if (!workerData.name || !workerData.phone || !workerData.email) {
      const response: ApiResponse = {
        success: false,
        error: "Name, phone, and email are required",
      };
      return res.status(400).json(response);
    }

    const worker = await supabaseService.createWorker(workerData);
    const response: ApiResponse<Worker> = {
      success: true,
      data: worker,
      message: "Worker created successfully",
    };
    res.status(201).json(response);
  } catch (error) {
    console.error('Error creating worker:', error);
    const response: ApiResponse = {
      success: false,
      error: error instanceof Error ? error.message : "Failed to create worker",
    };
    res.status(500).json(response);
  }
};

export const updateWorker: RequestHandler = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const updateData: UpdateWorkerRequest = req.body;
    
    const worker = await supabaseService.updateWorker(id, updateData);
    
    if (!worker) {
      const response: ApiResponse = {
        success: false,
        error: "Worker not found",
      };
      return res.status(404).json(response);
    }

    const response: ApiResponse<Worker> = {
      success: true,
      data: worker,
      message: "Worker updated successfully",
    };
    res.json(response);
  } catch (error) {
    console.error('Error updating worker:', error);
    const response: ApiResponse = {
      success: false,
      error: error instanceof Error ? error.message : "Failed to update worker",
    };
    res.status(500).json(response);
  }
};

export const deleteWorker: RequestHandler = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await supabaseService.deleteWorker(id);

    const response: ApiResponse = {
      success: true,
      message: "Worker deleted successfully",
    };
    res.json(response);
  } catch (error) {
    console.error('Error deleting worker:', error);
    const response: ApiResponse = {
      success: false,
      error: error instanceof Error ? error.message : "Failed to delete worker",
    };
    res.status(500).json(response);
  }
};

export const getWorkerPerformance: RequestHandler = async (req, res) => {
  try {
    const performance = await supabaseService.getWorkerPerformanceReport(req.query.period as string);

    const response: ApiResponse<WorkerPerformance[]> = {
      success: true,
      data: performance,
    };
    res.json(response);
  } catch (error) {
    console.error('Error fetching worker performance:', error);
    const response: ApiResponse = {
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch worker performance",
    };
    res.status(500).json(response);
  }
};

export const getWorkerStats: RequestHandler = async (req, res) => {
  try {
    const workers = await supabaseService.getWorkers();
    const activeWorkers = workers.filter(w => w.status === 'active');
    const totalCustomersManaged = activeWorkers.reduce((sum, w) => sum + w.customersAssigned, 0);
    const totalRevenue = activeWorkers.reduce((sum, w) => sum + w.monthlyRevenue, 0);
    const averageEfficiency = activeWorkers.reduce((sum, w) => sum + w.efficiency, 0) / activeWorkers.length;

    const stats = {
      totalWorkers: workers.length,
      activeWorkers: activeWorkers.length,
      inactiveWorkers: workers.length - activeWorkers.length,
      totalCustomersManaged,
      totalRevenue,
      averageEfficiency: isNaN(averageEfficiency) ? 0 : averageEfficiency,
      topPerformer: activeWorkers.sort((a, b) => b.efficiency - a.efficiency)[0] || null,
    };

    const response: ApiResponse = {
      success: true,
      data: stats,
    };
    res.json(response);
  } catch (error) {
    console.error('Error fetching worker stats:', error);
    const response: ApiResponse = {
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch worker statistics",
    };
    res.status(500).json(response);
  }
};

export const assignCustomersToWorker: RequestHandler = async (req, res) => {
  try {
    const workerId = parseInt(req.params.id);
    const { customerIds } = req.body;

    if (!Array.isArray(customerIds)) {
      const response: ApiResponse = {
        success: false,
        error: "Customer IDs must be an array",
      };
      return res.status(400).json(response);
    }

    const worker = await supabaseService.getWorkerById(workerId);
    if (!worker) {
      const response: ApiResponse = {
        success: false,
        error: "Worker not found",
      };
      return res.status(404).json(response);
    }

    await supabaseService.assignCustomersToWorker(workerId, customerIds);

    const response: ApiResponse = {
      success: true,
      message: `Successfully assigned ${customerIds.length} customers to ${worker.name}`,
      data: { assignedCount: customerIds.length },
    };
    res.json(response);
  } catch (error) {
    console.error('Error assigning customers:', error);
    const response: ApiResponse = {
      success: false,
      error: error instanceof Error ? error.message : "Failed to assign customers to worker",
    };
    res.status(500).json(response);
  }
};

export const getWorkerCustomers: RequestHandler = async (req, res) => {
  try {
    const workerId = parseInt(req.params.id);
    const customers = await supabaseService.getWorkerCustomers(workerId);

    const response: ApiResponse = {
      success: true,
      data: customers,
    };
    res.json(response);
  } catch (error) {
    console.error('Error fetching worker customers:', error);
    const response: ApiResponse = {
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch worker's customers",
    };
    res.status(500).json(response);
  }
};

export const getWorkerDeliveryReport: RequestHandler = async (req, res) => {
  try {
    const workerId = parseInt(req.params.id);
    const reportDate = req.query.date?.toString() || new Date().toISOString().split('T')[0];

    const worker = await supabaseService.getWorkerById(workerId);
    if (!worker) {
      const response: ApiResponse = {
        success: false,
        error: "Worker not found",
      };
      return res.status(404).json(response);
    }

    // Get all customers assigned to this worker
    const customers = await supabaseService.getWorkerCustomers(workerId);
    const area = await supabaseService.getAreaById(worker.areaId);

    // Get today's delivery data
    const deliveries = await supabaseService.getDailyDeliveries(reportDate, undefined, workerId);

    // Transform customer data for delivery report
    const customerDeliveryData = customers.map(customer => {
      const delivery = deliveries.find(d => d.customerId === customer.id);

      return {
        id: customer.id,
        name: customer.name,
        address: customer.address,
        phone: customer.phone,
        dailyQuantity: customer.dailyQuantity,
        ratePerLiter: customer.ratePerLiter,
        deliveredQuantity: delivery?.quantityDelivered || 0,
        deliveryStatus: delivery ?
          (delivery.quantityDelivered > 0 ? 'delivered' : 'not_delivered') :
          'pending',
        notes: delivery?.notes || '',
      };
    });

    // Calculate totals
    const totalCustomers = customers.length;
    const totalQuantityScheduled = customers.reduce((sum, c) => sum + c.dailyQuantity, 0);
    const totalQuantityDelivered = deliveries.reduce((sum, d) => sum + d.quantityDelivered, 0);
    const totalAmount = deliveries.reduce((sum, d) => sum + d.dailyAmount, 0);

    const reportData = {
      worker,
      areaName: area?.name || worker.areaName || 'Unknown Area',
      reportDate,
      customers: customerDeliveryData,
      totalCustomers,
      totalQuantityScheduled,
      totalQuantityDelivered,
      totalAmount,
    };

    const response: ApiResponse = {
      success: true,
      data: reportData,
    };
    res.json(response);
  } catch (error) {
    console.error('Error generating delivery report:', error);
    const response: ApiResponse = {
      success: false,
      error: error instanceof Error ? error.message : "Failed to generate delivery report",
    };
    res.status(500).json(response);
  }
};
