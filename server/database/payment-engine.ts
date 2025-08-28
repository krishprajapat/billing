import { Customer, Payment, DailyDelivery } from '@shared/api';

export interface PaymentSummary {
  customer: Customer;
  currentMonthAmount: number;
  currentMonthPaid: number;
  currentMonthDue: number;
  lastMonthAmount: number;
  lastMonthPaid: number;
  lastMonthDue: number;
  olderDues: number;
  totalDue: number;
  totalPaid: number;
  paymentStatus: 'paid' | 'partial' | 'pending' | 'overdue';
  isOverdue: boolean;
  lastPaymentDate: string | null;
  nextDueDate: string;
}

export interface PaymentAllocation {
  currentMonth: number;
  lastMonth: number;
  olderDues: number;
  credit: number; // Any overpayment
}

/**
 * Production-level payment calculation engine
 * Handles real-life payment scenarios with proper due allocation
 */
export class PaymentCalculationEngine {
  
  /**
   * Calculate comprehensive payment summary for a customer
   */
  static calculateCustomerPaymentSummary(
    customer: Customer,
    payments: Payment[],
    deliveries: DailyDelivery[]
  ): PaymentSummary {
    const today = new Date();
    const currentMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    
    // Calculate amounts for each period
    const currentMonthAmount = this.calculateMonthAmount(customer.id, deliveries, currentMonth);
    const lastMonthAmount = this.calculateMonthAmount(customer.id, deliveries, lastMonth);
    
    // Get valid payments (only 'paid' status)
    const validPayments = payments.filter(p => p.customerId === customer.id && p.status === 'paid');
    
    // Allocate payments to periods
    const allocation = this.allocatePaymentsToPeroids(
      validPayments,
      currentMonthAmount,
      lastMonthAmount,
      customer.pendingDues || 0,
      currentMonth,
      lastMonth
    );
    
    // Calculate dues
    const currentMonthDue = Math.max(0, currentMonthAmount - allocation.currentMonth);
    const lastMonthDue = Math.max(0, lastMonthAmount - allocation.lastMonth);
    const olderDues = Math.max(0, (customer.pendingDues || 0) - allocation.olderDues);
    const totalDue = currentMonthDue + lastMonthDue + olderDues;
    
    // Calculate payment status
    const paymentStatus = this.determinePaymentStatus(
      currentMonthDue,
      lastMonthDue,
      olderDues,
      customer.lastPayment
    );
    
    // Determine if overdue (more than 30 days with pending dues)
    const isOverdue = this.isCustomerOverdue(customer.lastPayment, totalDue);
    
    // Calculate next due date
    const nextDueDate = this.calculateNextDueDate(currentMonth);
    
    return {
      customer,
      currentMonthAmount,
      currentMonthPaid: allocation.currentMonth,
      currentMonthDue,
      lastMonthAmount,
      lastMonthPaid: allocation.lastMonth,
      lastMonthDue,
      olderDues,
      totalDue,
      totalPaid: validPayments.reduce((sum, p) => sum + p.amount, 0),
      paymentStatus,
      isOverdue,
      lastPaymentDate: customer.lastPayment,
      nextDueDate
    };
  }
  
  /**
   * Process a new payment and return updated customer state
   */
  static processPayment(
    customer: Customer,
    paymentAmount: number,
    currentSummary: PaymentSummary
  ): {
    allocation: PaymentAllocation;
    newCustomerState: Partial<Customer>;
    remainingBalance: number;
    paymentStatus: 'paid' | 'partial' | 'overpaid';
  } {
    // Smart payment allocation: oldest dues first
    let remaining = paymentAmount;
    const allocation: PaymentAllocation = {
      currentMonth: 0,
      lastMonth: 0,
      olderDues: 0,
      credit: 0
    };
    
    // 1. Pay older dues first
    if (remaining > 0 && currentSummary.olderDues > 0) {
      const olderPayment = Math.min(remaining, currentSummary.olderDues);
      allocation.olderDues = olderPayment;
      remaining -= olderPayment;
    }
    
    // 2. Pay last month dues
    if (remaining > 0 && currentSummary.lastMonthDue > 0) {
      const lastMonthPayment = Math.min(remaining, currentSummary.lastMonthDue);
      allocation.lastMonth = lastMonthPayment;
      remaining -= lastMonthPayment;
    }
    
    // 3. Pay current month dues
    if (remaining > 0 && currentSummary.currentMonthDue > 0) {
      const currentMonthPayment = Math.min(remaining, currentSummary.currentMonthDue);
      allocation.currentMonth = currentMonthPayment;
      remaining -= currentMonthPayment;
    }
    
    // 4. Any remaining amount becomes credit
    if (remaining > 0) {
      allocation.credit = remaining;
    }
    
    // Calculate new customer state
    const newPendingDues = Math.max(0, currentSummary.olderDues - allocation.olderDues);
    const totalDueAfterPayment = currentSummary.totalDue - paymentAmount + allocation.credit;
    
    // Determine payment status
    let paymentStatus: 'paid' | 'partial' | 'overpaid' = 'partial';
    if (allocation.credit > 0) {
      paymentStatus = 'overpaid';
    } else if (totalDueAfterPayment <= 0) {
      paymentStatus = 'paid';
    }
    
    return {
      allocation,
      newCustomerState: {
        pendingDues: newPendingDues,
        lastPayment: new Date().toISOString().split('T')[0]
      },
      remainingBalance: Math.max(0, totalDueAfterPayment),
      paymentStatus
    };
  }
  
  /**
   * Calculate month amount from deliveries
   */
  private static calculateMonthAmount(
    customerId: number,
    deliveries: DailyDelivery[],
    monthStart: Date
  ): number {
    const monthEnd = new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 0);
    
    return deliveries
      .filter(d => {
        const deliveryDate = new Date(d.date);
        return d.customerId === customerId &&
               deliveryDate >= monthStart &&
               deliveryDate <= monthEnd;
      })
      .reduce((sum, d) => sum + d.dailyAmount, 0);
  }
  
  /**
   * Smart payment allocation to periods (oldest first)
   */
  private static allocatePaymentsToPeroids(
    payments: Payment[],
    currentMonthAmount: number,
    lastMonthAmount: number,
    initialOlderDues: number,
    currentMonth: Date,
    lastMonth: Date
  ): PaymentAllocation {
    const allocation: PaymentAllocation = {
      currentMonth: 0,
      lastMonth: 0,
      olderDues: 0,
      credit: 0
    };
    
    // Group payments by period
    const paymentsByPeriod = {
      older: 0,
      lastMonth: 0,
      currentMonth: 0
    };
    
    payments.forEach(payment => {
      const paymentDate = new Date(payment.paidDate || payment.createdAt);
      
      if (paymentDate < lastMonth) {
        paymentsByPeriod.older += payment.amount;
      } else if (paymentDate < currentMonth) {
        paymentsByPeriod.lastMonth += payment.amount;
      } else {
        paymentsByPeriod.currentMonth += payment.amount;
      }
    });
    
    // Allocate older payments to older dues first
    let remainingOlderPayments = paymentsByPeriod.older;
    allocation.olderDues = Math.min(remainingOlderPayments, initialOlderDues);
    remainingOlderPayments -= allocation.olderDues;
    
    // If older payments exceed older dues, apply to last month
    if (remainingOlderPayments > 0) {
      allocation.lastMonth += Math.min(remainingOlderPayments, lastMonthAmount);
      remainingOlderPayments -= Math.min(remainingOlderPayments, lastMonthAmount);
    }
    
    // Apply last month payments
    allocation.lastMonth += Math.min(paymentsByPeriod.lastMonth, lastMonthAmount - allocation.lastMonth);
    
    // Apply current month payments
    allocation.currentMonth = Math.min(paymentsByPeriod.currentMonth, currentMonthAmount);
    
    return allocation;
  }
  
  /**
   * Determine payment status based on dues and payment history
   */
  private static determinePaymentStatus(
    currentMonthDue: number,
    lastMonthDue: number,
    olderDues: number,
    lastPaymentDate: string | null
  ): 'paid' | 'partial' | 'pending' | 'overdue' {
    const totalDue = currentMonthDue + lastMonthDue + olderDues;
    
    if (totalDue <= 0) {
      return 'paid';
    }
    
    // Check if overdue (no payment in last 60 days with pending dues)
    if (this.isCustomerOverdue(lastPaymentDate, totalDue)) {
      return 'overdue';
    }
    
    // Has some payments but still pending
    if (lastPaymentDate) {
      return 'partial';
    }
    
    return 'pending';
  }
  
  /**
   * Check if customer is overdue
   */
  private static isCustomerOverdue(lastPaymentDate: string | null, totalDue: number): boolean {
    if (totalDue <= 0) return false;
    
    if (!lastPaymentDate) {
      // No payment ever and has dues - overdue if older than 60 days
      return true;
    }
    
    const lastPayment = new Date(lastPaymentDate);
    const daysSinceLastPayment = Math.floor(
      (new Date().getTime() - lastPayment.getTime()) / (1000 * 60 * 60 * 24)
    );
    
    // Overdue if no payment in last 60 days and has pending dues
    return daysSinceLastPayment > 60;
  }
  
  /**
   * Calculate next due date
   */
  private static calculateNextDueDate(currentMonth: Date): string {
    // Next month 5th as due date
    const nextMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 5);
    return nextMonth.toISOString().split('T')[0];
  }
  
  /**
   * Validate payment amount
   */
  static validatePaymentAmount(amount: number, totalDue: number): {
    isValid: boolean;
    errors: string[];
    warnings: string[];
  } {
    const errors: string[] = [];
    const warnings: string[] = [];
    
    if (amount <= 0) {
      errors.push('Payment amount must be greater than zero');
    }
    
    if (amount > totalDue * 2) {
      warnings.push(`Payment amount (₹${amount}) is significantly higher than total due (₹${totalDue}). Please verify.`);
    }
    
    if (amount > totalDue) {
      warnings.push(`Payment amount exceeds total due. ₹${amount - totalDue} will be credited as advance payment.`);
    }
    
    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }
}
