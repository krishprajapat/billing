import { RequestHandler } from "express";
import { ApiResponse } from "@shared/api";
import Razorpay from "razorpay";
import { supabase } from "../database/supabase";

interface CreatePaymentLinkRequest {
  amount: number; // Amount in rupees
  customer: {
    name: string;
    contact: string;
    email?: string;
  };
  description: string;
  reference_id: string;
  expire_by?: number; // Unix timestamp
  notes?: Record<string, string>;
}

interface PaymentLinkResponse {
  id: string;
  short_url: string;
  reference_id: string;
  status: string;
  amount: number;
  customer: {
    name: string;
    contact: string;
    email?: string;
  };
  description: string;
  expire_by?: number;
  created_at: number;
}

// Initialize Razorpay with credentials
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID || "rzp_test_NIKxmqjvmmqx1B",
  key_secret: process.env.RAZORPAY_KEY_SECRET || "qWVOSshch4uz68VdU2Cwlkn4",
});

// Create payment link
export const createPaymentLink: RequestHandler = async (req, res) => {
  try {
    const {
      amount,
      customer,
      description,
      reference_id,
      expire_by,
      notes,
    }: CreatePaymentLinkRequest = req.body;

    // Validate required fields
    if (
      !amount ||
      !customer?.name ||
      !customer?.contact ||
      !description ||
      !reference_id
    ) {
      return res.status(400).json({
        success: false,
        error:
          "Missing required fields: amount, customer.name, customer.contact, description, reference_id",
      });
    }

    // Create payment link with actual Razorpay API
    const paymentLink = await razorpay.paymentLink.create({
      amount: amount * 100, // Convert to paise
      currency: "INR",
      accept_partial: false,
      description,
      customer: {
        name: customer.name,
        contact: customer.contact,
        email: customer.email,
      },
      notify: {
        sms: true,
        email: customer.email ? true : false,
      },
      reminder_enable: true,
      notes: {
        reference_id,
        customer_id: customer.contact, // Store customer info for webhook processing
        ...notes,
      },
      callback_url: `${process.env.BASE_URL || "http://localhost:8080"}/api/razorpay/callback`,
      callback_method: "post",
      expire_by: expire_by || Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60, // 30 days from now
    });

    // Map response to our interface
    const mappedPaymentLink: PaymentLinkResponse = {
      id: paymentLink.id,
      short_url: paymentLink.short_url,
      reference_id,
      status: paymentLink.status,
      amount: Number(paymentLink.amount),
      customer: {
        name: paymentLink.customer.name,
        contact: String(paymentLink.customer.contact),
        email: paymentLink.customer.email,
      },
      description: paymentLink.description,
      expire_by: paymentLink.expire_by,
      created_at: Number(paymentLink.created_at),
    };

    const response: ApiResponse<PaymentLinkResponse> = {
      success: true,
      data: mappedPaymentLink,
      message: "Payment link created successfully",
    };

    res.json(response);
  } catch (error) {
    console.error("Error creating payment link:", error);
    res.status(500).json({
      success: false,
      error: "Failed to create payment link",
    });
  }
};

// Get payment link details
export const getPaymentLink: RequestHandler = async (req, res) => {
  try {
    const { linkId } = req.params;

    if (!linkId) {
      return res.status(400).json({
        success: false,
        error: "Payment link ID is required",
      });
    }

    // Get payment link with actual Razorpay API
    const paymentLink = await razorpay.paymentLink.fetch(linkId);

    // Map response to our interface
    const mappedPaymentLink: PaymentLinkResponse = {
      id: paymentLink.id,
      short_url: paymentLink.short_url,
      reference_id: paymentLink.reference_id || `BILL-${Date.now()}`,
      status: paymentLink.status,
      amount: Number(paymentLink.amount),
      customer: {
        name: paymentLink.customer.name,
        contact: String(paymentLink.customer.contact),
        email: paymentLink.customer.email,
      },
      description: paymentLink.description,
      created_at: Number(paymentLink.created_at),
    };

    const response: ApiResponse<PaymentLinkResponse> = {
      success: true,
      data: mappedPaymentLink,
    };

    res.json(response);
  } catch (error) {
    console.error("Error fetching payment link:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch payment link",
    });
  }
};

// Handle payment callback (webhook)
export const handlePaymentCallback: RequestHandler = async (req, res) => {
  try {
    const { event, payload } = req.body;

    console.log("Payment webhook received:", { event, payload });

    // Handle different Razorpay events
    if (event === "payment_link.paid") {
      const paymentLink = payload.payment_link.entity;
      const payment = payload.payment.entity;

      console.log("Payment successful:", {
        payment_link_id: paymentLink.id,
        payment_id: payment.id,
        amount: payment.amount,
        reference_id: paymentLink.reference_id,
      });

      // Extract customer information from reference_id
      // Expected format: BILL-{customerId}-{month}{year}
      const referenceId = paymentLink.reference_id || "";
      const parts = referenceId.split("-");

      if (parts.length >= 3 && parts[0] === "BILL") {
        const customerId = parseInt(parts[1]);
        const monthYear = parts[2];

        if (!isNaN(customerId)) {
          // Create payment record in Supabase
          const amountInRupees = payment.amount / 100;
          const paymentDate = new Date(payment.created_at * 1000);
          let month: string;
          let year: number;
          if (monthYear && monthYear.length >= 6) {
            const monthNum = parseInt(monthYear.substring(0, 2));
            year = parseInt(monthYear.substring(2));
            month = new Date(year, monthNum - 1).toLocaleString("default", {
              month: "long",
            });
          } else {
            month = paymentDate.toLocaleString("default", { month: "long" });
            year = paymentDate.getFullYear();
          }
          const { error } = await (supabase as any).from("payments").insert({
            customer_id: customerId,
            amount: amountInRupees,
            payment_method: payment.method === "card" ? "Card" : "UPI",
            status: "paid",
            month,
            year,
            due_date: paymentDate.toISOString().split("T")[0],
            paid_date: paymentDate.toISOString().split("T")[0],
            notes: `Online payment via Razorpay. Payment ID: ${payment.id}, Link ID: ${paymentLink.id}`,
            razorpay_payment_id: payment.id,
          });
          if (error) {
            console.error("Error creating payment record:", error);
          }
        } else {
          console.error("Invalid customer ID in reference:", referenceId);
        }
      } else {
        console.error("Invalid reference_id format:", referenceId);
      }
    }

    res.json({
      success: true,
      message: "Webhook processed successfully",
    });
  } catch (error) {
    console.error("Error processing payment webhook:", error);
    res.status(500).json({
      success: false,
      error: "Failed to process payment webhook",
    });
  }
};

// Cancel payment link
export const cancelPaymentLink: RequestHandler = async (req, res) => {
  try {
    const { linkId } = req.params;

    if (!linkId) {
      return res.status(400).json({
        success: false,
        error: "Payment link ID is required",
      });
    }

    // Cancel payment link with actual Razorpay API
    const cancelledLink = await razorpay.paymentLink.cancel(linkId);

    const response: ApiResponse<{ status: string }> = {
      success: true,
      data: { status: cancelledLink.status },
      message: "Payment link cancelled successfully",
    };

    res.json(response);
  } catch (error) {
    console.error("Error cancelling payment link:", error);
    res.status(500).json({
      success: false,
      error: "Failed to cancel payment link",
    });
  }
};
