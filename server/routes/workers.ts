import { RequestHandler } from "express";
import { ApiResponse, Worker, CreateWorkerRequest, UpdateWorkerRequest, WorkerPerformance } from "@shared/api";
import { db } from "../database/models";

export const getWorkers: RequestHandler = (req, res) => {
  try {
    const workers = db.getWorkers(req.query);
    const response: ApiResponse<Worker[]> = {
      success: true,
      data: workers,
    };
    res.json(response);
  } catch (error) {
    const response: ApiResponse = {
      success: false,
      error: "Failed to fetch workers",
    };
    res.status(500).json(response);
  }
};

export const getWorkerById: RequestHandler = (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const worker = db.getWorkerById(id);
    
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
    const response: ApiResponse = {
      success: false,
      error: "Failed to fetch worker",
    };
    res.status(500).json(response);
  }
};

export const createWorker: RequestHandler = (req, res) => {
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

    const worker = db.createWorker(workerData);
    const response: ApiResponse<Worker> = {
      success: true,
      data: worker,
      message: "Worker created successfully",
    };
    res.status(201).json(response);
  } catch (error) {
    const response: ApiResponse = {
      success: false,
      error: "Failed to create worker",
    };
    res.status(500).json(response);
  }
};

export const updateWorker: RequestHandler = (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const updateData: UpdateWorkerRequest = req.body;
    
    const worker = db.updateWorker(id, updateData);
    
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
    const response: ApiResponse = {
      success: false,
      error: "Failed to update worker",
    };
    res.status(500).json(response);
  }
};

export const deleteWorker: RequestHandler = (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const deleted = db.deleteWorker(id);
    
    if (!deleted) {
      const response: ApiResponse = {
        success: false,
        error: "Worker not found or has active customers assigned",
      };
      return res.status(400).json(response);
    }

    const response: ApiResponse = {
      success: true,
      message: "Worker deleted successfully",
    };
    res.json(response);
  } catch (error) {
    const response: ApiResponse = {
      success: false,
      error: "Failed to delete worker",
    };
    res.status(500).json(response);
  }
};

export const getWorkerPerformance: RequestHandler = (req, res) => {
  try {
    const workers = db.getWorkers({ status: 'active' });
    const performance: WorkerPerformance[] = workers.map(worker => ({
      workerId: worker.id,
      workerName: worker.name,
      area: worker.area,
      customers: worker.customersAssigned,
      revenue: worker.monthlyRevenue,
      milkDelivered: worker.customersAssigned * 60, // Mock calculation
      efficiency: worker.efficiency,
      onTimeDeliveries: worker.onTimeDeliveries,
      totalDeliveries: worker.totalDeliveries,
      rating: worker.rating,
    }));

    const response: ApiResponse<WorkerPerformance[]> = {
      success: true,
      data: performance,
    };
    res.json(response);
  } catch (error) {
    const response: ApiResponse = {
      success: false,
      error: "Failed to fetch worker performance",
    };
    res.status(500).json(response);
  }
};

export const getWorkerStats: RequestHandler = (req, res) => {
  try {
    const workers = db.getWorkers();
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
    const response: ApiResponse = {
      success: false,
      error: "Failed to fetch worker statistics",
    };
    res.status(500).json(response);
  }
};

export const assignCustomersToWorker: RequestHandler = (req, res) => {
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

    const worker = db.getWorkerById(workerId);
    if (!worker) {
      const response: ApiResponse = {
        success: false,
        error: "Worker not found",
      };
      return res.status(404).json(response);
    }

    // Update customers with new worker assignment
    let updatedCount = 0;
    customerIds.forEach((customerId: number) => {
      const updated = db.updateCustomer(customerId, { workerId });
      if (updated) updatedCount++;
    });

    const response: ApiResponse = {
      success: true,
      message: `Successfully assigned ${updatedCount} customers to ${worker.name}`,
      data: { assignedCount: updatedCount },
    };
    res.json(response);
  } catch (error) {
    const response: ApiResponse = {
      success: false,
      error: "Failed to assign customers to worker",
    };
    res.status(500).json(response);
  }
};

export const getWorkerCustomers: RequestHandler = (req, res) => {
  try {
    const workerId = parseInt(req.params.id);
    const customers = db.getCustomers({ worker: workerId.toString() });

    const response: ApiResponse = {
      success: true,
      data: customers,
    };
    res.json(response);
  } catch (error) {
    const response: ApiResponse = {
      success: false,
      error: "Failed to fetch worker's customers",
    };
    res.status(500).json(response);
  }
};
