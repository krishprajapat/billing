import { RequestHandler } from "express";
import { ApiResponse } from "@shared/api";

// Mock Razorpay integration - in production, you would use the actual Razorpay SDK
// npm install razorpay
// import Razorpay from 'razorpay';

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

// Initialize Razorpay (mock for now)
// const razorpay = new Razorpay({
//   key_id: process.env.RAZORPAY_KEY_ID!,
//   key_secret: process.env.RAZORPAY_KEY_SECRET!,
// });

// Create payment link
export const createPaymentLink: RequestHandler = async (req, res) => {
  try {
    const {
      amount,
      customer,
      description,
      reference_id,
      expire_by,
      notes
    }: CreatePaymentLinkRequest = req.body;

    // Validate required fields
    if (!amount || !customer?.name || !customer?.contact || !description || !reference_id) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: amount, customer.name, customer.contact, description, reference_id',
      });
    }

    // Mock payment link creation (replace with actual Razorpay API call)
    /*
    const paymentLink = await razorpay.paymentLink.create({
      amount: amount * 100, // Convert to paise
      currency: 'INR',
      accept_partial: false,
      description,
      customer: {
        name: customer.name,
        contact: customer.contact,
        email: customer.email
      },
      notify: {
        sms: true,
        email: customer.email ? true : false
      },
      reminder_enable: true,
      notes: {
        reference_id,
        ...notes
      },
      callback_url: `${process.env.BASE_URL}/payment/callback`,
      callback_method: 'get',
      expire_by: expire_by || Math.floor(Date.now() / 1000) + (30 * 24 * 60 * 60) // 30 days from now
    });
    */

    // Mock response - replace with actual Razorpay response
    const mockPaymentLink: PaymentLinkResponse = {
      id: `plink_${Date.now()}${Math.random().toString(36).substr(2, 9)}`,
      short_url: `https://rzp.io/l/${reference_id.toLowerCase()}`,
      reference_id,
      status: 'created',
      amount: amount * 100, // In paise
      customer,
      description,
      expire_by: expire_by || Math.floor(Date.now() / 1000) + (30 * 24 * 60 * 60),
      created_at: Math.floor(Date.now() / 1000)
    };

    const response: ApiResponse<PaymentLinkResponse> = {
      success: true,
      data: mockPaymentLink,
      message: 'Payment link created successfully',
    };

    res.json(response);
  } catch (error) {
    console.error('Error creating payment link:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create payment link',
    });
  }
};

// Get payment link details
export const getPaymentLink: RequestHandler = (req, res) => {
  try {
    const { linkId } = req.params;
    
    if (!linkId) {
      return res.status(400).json({
        success: false,
        error: 'Payment link ID is required',
      });
    }

    // Mock get payment link (replace with actual Razorpay API call)
    /*
    const paymentLink = await razorpay.paymentLink.fetch(linkId);
    */

    // Mock response
    const mockPaymentLink: PaymentLinkResponse = {
      id: linkId,
      short_url: `https://rzp.io/l/${linkId}`,
      reference_id: `BILL-${Date.now()}`,
      status: 'created',
      amount: 50000, // 500 INR in paise
      customer: {
        name: 'Mock Customer',
        contact: '+919876543210'
      },
      description: 'Milk delivery bill',
      created_at: Math.floor(Date.now() / 1000)
    };

    const response: ApiResponse<PaymentLinkResponse> = {
      success: true,
      data: mockPaymentLink,
    };

    res.json(response);
  } catch (error) {
    console.error('Error fetching payment link:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch payment link',
    });
  }
};

// Handle payment callback (webhook)
export const handlePaymentCallback: RequestHandler = (req, res) => {
  try {
    // This would handle Razorpay webhooks for payment status updates
    const { payment_link_id, payment_id, status } = req.body;
    
    console.log('Payment callback received:', {
      payment_link_id,
      payment_id,
      status
    });

    // In a real implementation, you would:
    // 1. Verify the webhook signature
    // 2. Update the payment status in your database
    // 3. Send confirmation to customer
    // 4. Update customer dues
    
    res.json({
      success: true,
      message: 'Payment callback processed'
    });
  } catch (error) {
    console.error('Error processing payment callback:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to process payment callback',
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
        error: 'Payment link ID is required',
      });
    }

    // Mock cancel payment link (replace with actual Razorpay API call)
    /*
    const cancelledLink = await razorpay.paymentLink.cancel(linkId);
    */

    const response: ApiResponse<{ status: string }> = {
      success: true,
      data: { status: 'cancelled' },
      message: 'Payment link cancelled successfully',
    };

    res.json(response);
  } catch (error) {
    console.error('Error cancelling payment link:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to cancel payment link',
    });
  }
};
