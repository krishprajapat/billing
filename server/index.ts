import "dotenv/config";
import express from "express";
import cors from "cors";
import { handleDemo } from "./routes/demo";

// Area routes
import {
  getAreas,
  getAreaById,
  createArea,
  updateArea,
  deleteArea
} from "./routes/areas";

// Customer routes
import {
  getCustomers,
  createCustomer,
  updateCustomer,
  deleteCustomer,
  getCustomerStats
} from "./routes/customers";

// Worker routes
import {
  getWorkers,
  createWorker,
  updateWorker,
  deleteWorker,
  getWorkerPerformance,
  getWorkerStats,
  assignCustomersToWorker,
  getWorkerCustomers,
  getWorkerDeliveryReport
} from "./routes/workers";

// Payment routes
import {
  getPayments,
  recordPayment,
  getCustomerPayments,
  getPaymentStats,
  generateInvoice,
  getOverduePayments,
  generateMonthlyBills,
  sendPaymentReminder,
  getCustomerPaymentSummaries
} from "./routes/payments";

// Dashboard routes
import {
  getDashboardStats,
  getRecentActivities
} from "./routes/dashboard";

// Report routes
import {
  getMonthlyReports,
  getWorkerPerformanceReport,
  getAreaWiseReport,
  getPaymentMethodReport
} from "./routes/reports";

// Daily operations routes
import {
  getDailyDeliveries,
  createDailyDelivery,
  getDailyQuantities,
  updateCustomerQuantity,
  generateQuantityLink,
  getCustomerByToken,
  updateQuantityByToken,
  getDailyTotals
} from "./routes/daily";
import {
  createPaymentLink,
  getPaymentLink,
  handlePaymentCallback,
  cancelPaymentLink
} from "./routes/razorpay";

export function createServer() {
  const app = express();

  // Middleware
  app.use(cors());
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Health check
  app.get("/api/ping", (_req, res) => {
    const ping = process.env.PING_MESSAGE ?? "ping";
    res.json({ message: ping });
  });

  // Demo route
  app.get("/api/demo", handleDemo);

  // Dashboard routes
  app.get("/api/dashboard/stats", getDashboardStats);
  app.get("/api/dashboard/activities", getRecentActivities);

  // Area routes
  app.get("/api/areas", getAreas);
  app.get("/api/areas/:id", getAreaById);
  app.post("/api/areas", createArea);
  app.put("/api/areas/:id", updateArea);
  app.delete("/api/areas/:id", deleteArea);

  // Customer routes
  app.get("/api/customers", getCustomers);
  app.post("/api/customers", createCustomer);
  app.put("/api/customers/:id", updateCustomer);
  app.delete("/api/customers/:id", deleteCustomer);
  app.get("/api/customers/stats", getCustomerStats);

  // Worker routes
  app.get("/api/workers", getWorkers);
  app.post("/api/workers", createWorker);
  app.put("/api/workers/:id", updateWorker);
  app.delete("/api/workers/:id", deleteWorker);
  app.get("/api/workers/performance", getWorkerPerformance);
  app.get("/api/workers/stats", getWorkerStats);
  app.post("/api/workers/:id/assign", assignCustomersToWorker);
  app.get("/api/workers/:id/customers", getWorkerCustomers);
  app.get("/api/workers/:id/delivery-report", getWorkerDeliveryReport);

  // Payment routes
  app.get("/api/payments", getPayments);
  app.post("/api/payments", recordPayment);
  app.get("/api/payments/customer/:customerId", getCustomerPayments);
  app.get("/api/payments/stats", getPaymentStats);
  app.get("/api/payments/summaries", getCustomerPaymentSummaries);
  app.post("/api/payments/invoice", generateInvoice);
  app.get("/api/payments/overdue", getOverduePayments);
  app.post("/api/payments/bill", generateMonthlyBills);
  app.post("/api/payments/reminder", sendPaymentReminder);

  // Report routes
  app.get("/api/reports/monthly", getMonthlyReports);
  app.get("/api/reports/worker-performance", getWorkerPerformanceReport);
  app.get("/api/reports/area-wise", getAreaWiseReport);
  app.get("/api/reports/payment-methods", getPaymentMethodReport);

  // Daily operations routes
  app.get("/api/daily/deliveries", getDailyDeliveries);
  app.post("/api/daily/deliveries", createDailyDelivery);
  app.get("/api/daily/quantities", getDailyQuantities);
  app.put("/api/daily/quantities", updateCustomerQuantity);
  app.get("/api/daily/quantity-link/:customerId", generateQuantityLink);
  app.get("/api/daily/customer/:token", getCustomerByToken);
  app.put("/api/daily/customer/:token/quantity", updateQuantityByToken);
  app.get("/api/daily/totals", getDailyTotals);

  // Razorpay routes
  app.post("/api/razorpay/payment-link", createPaymentLink);
  app.get("/api/razorpay/payment-link/:linkId", getPaymentLink);
  app.post("/api/razorpay/callback", handlePaymentCallback);
  app.post("/api/razorpay/payment-link/:linkId/cancel", cancelPaymentLink);

  return app;
}
