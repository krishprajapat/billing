import { RequestHandler } from "express";
import {
  ApiResponse,
  Worker,
  CreateWorkerRequest,
  UpdateWorkerRequest,
  WorkerPerformance,
} from "@shared/api";
import { supabaseDatabase } from "../database/supabase-models";
import { supabase } from "../database/supabase";

export const getWorkers: RequestHandler = async (req, res) => {
export const getWorkers: RequestHandler = async (req, res) => {
  try {
    const workers = await supabaseDatabase.getWorkers(req.query);
    const response: ApiResponse<Worker[]> = { success: true, data: workers };
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
export const getWorkerById: RequestHandler = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const worker = await supabaseDatabase.getWorkerById(id);
    if (!worker) {
      const response: ApiResponse = {
        success: false,
        error: "Worker not found",
      };
      return res.status(404).json(response);
    }
    const response: ApiResponse<Worker> = { success: true, data: worker };
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
export const createWorker: RequestHandler = async (req, res) => {
  try {
    const workerData: CreateWorkerRequest = req.body;
    if (!workerData.name || !workerData.phone || !workerData.email) {
      const response: ApiResponse = {
        success: false,
        error: "Name, phone, and email are required",
      };
      return res.status(400).json(response);
    }
    const worker = await supabaseDatabase.createWorker(workerData);
    const response: ApiResponse<Worker> = {
      success: true,
      data: worker,
      message: "Worker created successfully",
    };
    res.status(201).json(response);
  } catch (error: any) {
    const response: ApiResponse = {
      success: false,
      error: error?.message || "Failed to create worker",
    };
    res.status(500).json(response);
  }
};

export const updateWorker: RequestHandler = async (req, res) => {
export const updateWorker: RequestHandler = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const updateData: UpdateWorkerRequest = req.body;
    const worker = await supabaseDatabase.updateWorker(id, updateData);
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
  } catch (error: any) {
    const response: ApiResponse = {
      success: false,
      error: error?.message || "Failed to update worker",
    };
    res.status(500).json(response);
  }
};

export const deleteWorker: RequestHandler = async (req, res) => {
export const deleteWorker: RequestHandler = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const deleted = await supabaseDatabase.deleteWorker(id);
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
    console.error('Error deleting worker:', error);
    const response: ApiResponse = {
      success: false,
      error: error instanceof Error ? error.message : "Failed to delete worker",
    };
    res.status(500).json(response);
  }
};

export const getWorkerPerformance: RequestHandler = async (_req, res) => {
  try {
    const workers = await supabaseDatabase.getWorkers({ status: "active" });
    const performance: WorkerPerformance[] = workers.map((worker) => ({
      workerId: worker.id,
      workerName: worker.name,
      area: worker.areaName,
      customers: worker.customersAssigned || 0,
      revenue: worker.monthlyRevenue || 0,
      milkDelivered: (worker.customersAssigned || 0) * 60,
      efficiency: worker.efficiency || 0,
      onTimeDeliveries: worker.onTimeDeliveries || 0,
      totalDeliveries: worker.totalDeliveries || 0,
      rating: worker.rating || 0,
    }));
    const response: ApiResponse<WorkerPerformance[]> = {
      success: true,
      data: performance,
    };
    res.json(response);
  } catch {
    const response: ApiResponse = {
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch worker performance",
    };
    res.status(500).json(response);
  }
};

export const getWorkerStats: RequestHandler = async (_req, res) => {
  try {
    const workers = await supabaseDatabase.getWorkers();
    const activeWorkers = workers.filter((w) => w.status === "active");
    const totalCustomersManaged = activeWorkers.reduce(
      (sum, w) => sum + (w.customersAssigned || 0),
      0,
    );
    const totalRevenue = activeWorkers.reduce(
      (sum, w) => sum + (w.monthlyRevenue || 0),
      0,
    );
    const averageEfficiency =
      activeWorkers.length > 0
        ? activeWorkers.reduce((sum, w) => sum + (w.efficiency || 0), 0) /
          activeWorkers.length
        : 0;
    const stats = {
      totalWorkers: workers.length,
      activeWorkers: activeWorkers.length,
      inactiveWorkers: workers.length - activeWorkers.length,
      totalCustomersManaged,
      totalRevenue,
      averageEfficiency,
      topPerformer:
        activeWorkers.sort(
          (a, b) => (b.efficiency || 0) - (a.efficiency || 0),
        )[0] || null,
    };
    const response: ApiResponse = { success: true, data: stats };
    res.json(response);
  } catch {
    const response: ApiResponse = {
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch worker statistics",
    };
    res.status(500).json(response);
  }
};

export const assignCustomersToWorker: RequestHandler = async (req, res) => {
export const assignCustomersToWorker: RequestHandler = async (req, res) => {
  try {
    const workerId = parseInt(req.params.id);
    const { customerIds } = req.body as { customerIds: number[] };
    if (!Array.isArray(customerIds)) {
      const response: ApiResponse = {
        success: false,
        error: "Customer IDs must be an array",
      };
      return res.status(400).json(response);
    }
    const worker = await supabaseDatabase.getWorkerById(workerId);
    if (!worker) {
      const response: ApiResponse = {
        success: false,
        error: "Worker not found",
      };
      return res.status(404).json(response);
    }
    const { error } = await (supabase as any)
      .from("customers")
      .update({ worker_id: workerId })
      .in("id", customerIds);
    if (error) throw error;
    const response: ApiResponse = {
      success: true,
      message: `Successfully assigned ${customerIds.length} customers to ${worker.name}`,
      data: { assignedCount: customerIds.length },
      message: `Successfully assigned ${customerIds.length} customers to ${worker.name}`,
      data: { assignedCount: customerIds.length },
    };
    res.json(response);
  } catch {
    const response: ApiResponse = {
      success: false,
      error: error instanceof Error ? error.message : "Failed to assign customers to worker",
    };
    res.status(500).json(response);
  }
};

export const getWorkerCustomers: RequestHandler = async (req, res) => {
export const getWorkerCustomers: RequestHandler = async (req, res) => {
  try {
    const workerId = parseInt(req.params.id);
    const customers = await supabaseDatabase.getCustomers({
      worker: "assigned",
      status: "active",
    });
    const filtered = customers.filter((c) => c.workerId === workerId);
    const response: ApiResponse = { success: true, data: filtered };
    res.json(response);
  } catch {
    const response: ApiResponse = {
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch worker's customers",
    };
    res.status(500).json(response);
  }
};

export const getWorkerDeliveryReport: RequestHandler = async (req, res) => {
export const getWorkerDeliveryReport: RequestHandler = async (req, res) => {
  try {
    const workerId = parseInt(req.params.id);
    const reportDate =
      req.query.date?.toString() || new Date().toISOString().split("T")[0];
    const worker = await supabaseDatabase.getWorkerById(workerId);
    if (!worker) {
      const response: ApiResponse = {
        success: false,
        error: "Worker not found",
      };
      return res.status(404).json(response);
    }
    const customers = await supabaseDatabase.getCustomers({
      worker: "assigned",
      status: "active",
    });
    const assigned = customers.filter((c) => c.workerId === workerId);
    const { data: deliveries } = await (supabase as any)
      .from("daily_deliveries")
      .select("*")
      .eq("worker_id", workerId)
      .eq("date", reportDate);
    const customerDeliveryData = assigned.map((customer) => {
      const delivery = (deliveries || []).find(
        (d: any) => d.customer_id === customer.id,
      );
      return {
        id: customer.id,
        name: customer.name,
        address: customer.address,
        phone: customer.phone,
        dailyQuantity: customer.dailyQuantity,
        ratePerLiter: customer.ratePerLiter,
        deliveredQuantity: delivery?.quantity_delivered || 0,
        deliveryStatus: delivery
          ? delivery.quantity_delivered > 0
            ? "delivered"
            : "not_delivered"
          : "pending",
        notes: delivery?.notes || "",
      };
    });
    const totalCustomers = assigned.length;
    const totalQuantityScheduled = assigned.reduce(
      (sum, c) => sum + c.dailyQuantity,
      0,
    );
    const totalQuantityDelivered = (deliveries || []).reduce(
      (sum: number, d: any) => sum + (d.quantity_delivered || 0),
      0,
    );
    const totalAmount = (deliveries || []).reduce(
      (sum: number, d: any) =>
        sum + (d.daily_amount ?? d.quantity_delivered * d.rate_per_liter),
      0,
    );
    const reportData = {
      worker,
      areaName: worker.areaName || "Unknown Area",
      reportDate,
      customers: customerDeliveryData,
      totalCustomers,
      totalQuantityScheduled,
      totalQuantityDelivered,
      totalAmount,
    };
    const response: ApiResponse = { success: true, data: reportData };
    res.json(response);
  } catch {
    const response: ApiResponse = {
      success: false,
      error: error instanceof Error ? error.message : "Failed to generate delivery report",
    };
    res.status(500).json(response);
  }
};
