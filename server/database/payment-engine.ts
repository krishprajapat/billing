import { Customer, Payment, DailyDelivery } from '@shared/api';

export interface PaymentSummary {
  customer: Customer;
  currentMonthAmount: number;
  currentMonthPaid: number;
  currentMonthDue: number;
  month1Amount: number;  // Last month
  month1Paid: number;
  month1Due: number;
  month2Amount: number;  // 2 months ago
  month2Paid: number;
  month2Due: number;
  month3Amount: number;  // 3 months ago
  month3Paid: number;
  month3Due: number;
  olderDues: number;     // Dues older than 3 months
  totalDue: number;
  totalPaid: number;
  paymentStatus: 'paid' | 'partial' | 'pending' | 'overdue';
  isOverdue: boolean;
  lastPaymentDate: string | null;
  nextDueDate: string;
}

export interface PaymentAllocation {
  currentMonth: number;
  month1: number;
  month2: number;
  month3: number;
  olderDues: number;
  credit: number; // Any overpayment
}

/**
 * Production-level payment calculation engine
 * Handles real-life payment scenarios with proper due allocation across 4 months
 */
export class PaymentCalculationEngine {
  
  /**
   * Calculate comprehensive payment summary for a customer with 4-month tracking
   */
  static calculateCustomerPaymentSummary(
    customer: Customer,
    payments: Payment[],
    deliveries: DailyDelivery[]
  ): PaymentSummary {
    const today = new Date();
    const currentMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const month1 = new Date(today.getFullYear(), today.getMonth() - 1, 1);  // Last month
    const month2 = new Date(today.getFullYear(), today.getMonth() - 2, 1);  // 2 months ago
    const month3 = new Date(today.getFullYear(), today.getMonth() - 3, 1);  // 3 months ago
    
    // Calculate amounts for each month
    const currentMonthAmount = this.calculateMonthAmount(customer.id, deliveries, currentMonth);
    const month1Amount = this.calculateMonthAmount(customer.id, deliveries, month1);
    const month2Amount = this.calculateMonthAmount(customer.id, deliveries, month2);
    const month3Amount = this.calculateMonthAmount(customer.id, deliveries, month3);
    
    // Get valid payments (only 'paid' status)
    const validPayments = payments.filter(p => p.customerId === customer.id && p.status === 'paid');
    
    // Allocate payments to periods
    const allocation = this.allocatePaymentsTo4Months(
      validPayments,
      currentMonthAmount,
      month1Amount,
      month2Amount,
      month3Amount,
      customer.pendingDues || 0,
      currentMonth,
      month1,
      month2,
      month3
    );
    
    // Calculate dues for each month
    const currentMonthDue = Math.max(0, currentMonthAmount - allocation.currentMonth);
    const month1Due = Math.max(0, month1Amount - allocation.month1);
    const month2Due = Math.max(0, month2Amount - allocation.month2);
    const month3Due = Math.max(0, month3Amount - allocation.month3);
    const olderDues = Math.max(0, (customer.pendingDues || 0) - allocation.olderDues);
    const totalDue = currentMonthDue + month1Due + month2Due + month3Due + olderDues;
    
    // Calculate payment status
    const paymentStatus = this.determinePaymentStatus(
      currentMonthDue,
      month1Due + month2Due + month3Due,
      olderDues,
      customer.lastPayment
    );
    
    // Determine if overdue (more than 60 days with pending dues)
    const isOverdue = this.isCustomerOverdue(customer.lastPayment, totalDue);
    
    // Calculate next due date
    const nextDueDate = this.calculateNextDueDate(currentMonth);
    
    return {
      customer,
      currentMonthAmount,
      currentMonthPaid: allocation.currentMonth,
      currentMonthDue,
      month1Amount,
      month1Paid: allocation.month1,
      month1Due,
      month2Amount,
      month2Paid: allocation.month2,
      month2Due,
      month3Amount,
      month3Paid: allocation.month3,
      month3Due,
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
   * Process a new payment and return updated customer state with 4-month allocation
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
      month1: 0,
      month2: 0,
      month3: 0,
      olderDues: 0,
      credit: 0
    };
    
    // 1. Pay older dues first (more than 3 months)
    if (remaining > 0 && currentSummary.olderDues > 0) {
      const olderPayment = Math.min(remaining, currentSummary.olderDues);
      allocation.olderDues = olderPayment;
      remaining -= olderPayment;
    }
    
    // 2. Pay month 3 dues (3 months ago)
    if (remaining > 0 && currentSummary.month3Due > 0) {
      const month3Payment = Math.min(remaining, currentSummary.month3Due);
      allocation.month3 = month3Payment;
      remaining -= month3Payment;
    }
    
    // 3. Pay month 2 dues (2 months ago)
    if (remaining > 0 && currentSummary.month2Due > 0) {
      const month2Payment = Math.min(remaining, currentSummary.month2Due);
      allocation.month2 = month2Payment;
      remaining -= month2Payment;
    }
    
    // 4. Pay month 1 dues (last month)
    if (remaining > 0 && currentSummary.month1Due > 0) {
      const month1Payment = Math.min(remaining, currentSummary.month1Due);
      allocation.month1 = month1Payment;
      remaining -= month1Payment;
    }
    
    // 5. Pay current month dues
    if (remaining > 0 && currentSummary.currentMonthDue > 0) {
      const currentMonthPayment = Math.min(remaining, currentSummary.currentMonthDue);
      allocation.currentMonth = currentMonthPayment;
      remaining -= currentMonthPayment;
    }
    
    // 6. Any remaining amount becomes credit
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
   * Smart payment allocation to 4 months (oldest first)
   */
  private static allocatePaymentsTo4Months(
    payments: Payment[],
    currentMonthAmount: number,
    month1Amount: number,
    month2Amount: number,
    month3Amount: number,
    initialOlderDues: number,
    currentMonth: Date,
    month1: Date,
    month2: Date,
    month3: Date
  ): PaymentAllocation {
    const allocation: PaymentAllocation = {
      currentMonth: 0,
      month1: 0,
      month2: 0,
      month3: 0,
      olderDues: 0,
      credit: 0
    };
    
    // Group payments by period
    const paymentsByPeriod = {
      older: 0,
      month3: 0,
      month2: 0,
      month1: 0,
      currentMonth: 0
    };
    
    payments.forEach(payment => {
      const paymentDate = new Date(payment.paidDate || payment.createdAt);
      
      if (paymentDate < month3) {
        paymentsByPeriod.older += payment.amount;
      } else if (paymentDate < month2) {
        paymentsByPeriod.month3 += payment.amount;
      } else if (paymentDate < month1) {
        paymentsByPeriod.month2 += payment.amount;
      } else if (paymentDate < currentMonth) {
        paymentsByPeriod.month1 += payment.amount;
      } else {
        paymentsByPeriod.currentMonth += payment.amount;
      }
    });
    
    // Allocate payments starting from oldest period
    let remainingOlderPayments = paymentsByPeriod.older;
    
    // 1. Apply to older dues first
    allocation.olderDues = Math.min(remainingOlderPayments, initialOlderDues);
    remainingOlderPayments -= allocation.olderDues;
    
    // 2. If older payments exceed older dues, apply to month3
    if (remainingOlderPayments > 0) {
      allocation.month3 += Math.min(remainingOlderPayments, month3Amount);
      remainingOlderPayments -= Math.min(remainingOlderPayments, month3Amount);
    }
    
    // 3. Apply month3 payments
    allocation.month3 += Math.min(paymentsByPeriod.month3, month3Amount - allocation.month3);
    
    // 4. Apply month2 payments
    allocation.month2 = Math.min(paymentsByPeriod.month2, month2Amount);
    
    // 5. Apply month1 payments
    allocation.month1 = Math.min(paymentsByPeriod.month1, month1Amount);
    
    // 6. Apply current month payments
    allocation.currentMonth = Math.min(paymentsByPeriod.currentMonth, currentMonthAmount);
    
    return allocation;
  }
  
  /**
   * Determine payment status based on dues and payment history
   */
  private static determinePaymentStatus(
    currentMonthDue: number,
    pastMonthsDue: number,
    olderDues: number,
    lastPaymentDate: string | null
  ): 'paid' | 'partial' | 'pending' | 'overdue' {
    const totalDue = currentMonthDue + pastMonthsDue + olderDues;
    
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
