export interface ValidationError {
  field: string;
  message: string;
  code: string;
}

export interface PaymentValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: string[];
}

export class PaymentValidator {
  /**
   * Validate payment request data
   */
  static validatePaymentRequest(data: any): PaymentValidationResult {
    const errors: ValidationError[] = [];
    const warnings: string[] = [];

    // Required fields validation
    if (!data.customerId) {
      errors.push({
        field: 'customerId',
        message: 'Customer ID is required',
        code: 'REQUIRED_FIELD'
      });
    } else if (typeof data.customerId !== 'number' || data.customerId <= 0) {
      errors.push({
        field: 'customerId',
        message: 'Customer ID must be a positive number',
        code: 'INVALID_FORMAT'
      });
    }

    if (!data.amount && data.amount !== 0) {
      errors.push({
        field: 'amount',
        message: 'Payment amount is required',
        code: 'REQUIRED_FIELD'
      });
    } else if (typeof data.amount !== 'number' || data.amount <= 0) {
      errors.push({
        field: 'amount',
        message: 'Payment amount must be a positive number',
        code: 'INVALID_AMOUNT'
      });
    } else {
      // Amount format validation
      if (data.amount > 1000000) {
        warnings.push('Payment amount is very large. Please verify.');
      }
      
      // Check for decimal precision
      const decimalPlaces = (data.amount.toString().split('.')[1] || '').length;
      if (decimalPlaces > 2) {
        errors.push({
          field: 'amount',
          message: 'Payment amount cannot have more than 2 decimal places',
          code: 'INVALID_PRECISION'
        });
      }
    }

    if (!data.paymentMethod) {
      errors.push({
        field: 'paymentMethod',
        message: 'Payment method is required',
        code: 'REQUIRED_FIELD'
      });
    } else if (!['Cash', 'UPI', 'Card', 'Bank Transfer'].includes(data.paymentMethod)) {
      errors.push({
        field: 'paymentMethod',
        message: 'Invalid payment method',
        code: 'INVALID_PAYMENT_METHOD'
      });
    }

    // Date validation
    if (data.paidDate) {
      const paidDate = new Date(data.paidDate);
      const today = new Date();
      const futureLimit = new Date();
      futureLimit.setDate(futureLimit.getDate() + 1);
      
      if (isNaN(paidDate.getTime())) {
        errors.push({
          field: 'paidDate',
          message: 'Invalid payment date format',
          code: 'INVALID_DATE'
        });
      } else if (paidDate > futureLimit) {
        errors.push({
          field: 'paidDate',
          message: 'Payment date cannot be in the future',
          code: 'FUTURE_DATE'
        });
      } else if (paidDate < new Date('2020-01-01')) {
        warnings.push('Payment date is very old. Please verify.');
      }
    }

    // Notes validation
    if (data.notes && typeof data.notes === 'string' && data.notes.length > 500) {
      warnings.push('Payment notes are very long. Consider shortening them.');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Validate customer state for payment processing
   */
  static validateCustomerForPayment(customer: any): PaymentValidationResult {
    const errors: ValidationError[] = [];
    const warnings: string[] = [];

    if (!customer) {
      errors.push({
        field: 'customer',
        message: 'Customer not found',
        code: 'CUSTOMER_NOT_FOUND'
      });
      return { isValid: false, errors, warnings };
    }

    if (customer.status !== 'active') {
      errors.push({
        field: 'customer.status',
        message: 'Cannot process payment for inactive customer',
        code: 'INACTIVE_CUSTOMER'
      });
    }

    // Check for suspended or blocked customers
    if (customer.status === 'suspended') {
      errors.push({
        field: 'customer.status',
        message: 'Customer account is suspended',
        code: 'SUSPENDED_CUSTOMER'
      });
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Validate business rules for payment processing
   */
  static validatePaymentBusinessRules(amount: number, customerSummary: any): PaymentValidationResult {
    const errors: ValidationError[] = [];
    const warnings: string[] = [];

    if (!customerSummary) {
      errors.push({
        field: 'customerSummary',
        message: 'Unable to calculate customer payment summary',
        code: 'CALCULATION_ERROR'
      });
      return { isValid: false, errors, warnings };
    }

    // Check for overpayment
    if (amount > customerSummary.totalDue * 3) {
      warnings.push(`Payment amount (₹${amount}) is significantly higher than total due (₹${customerSummary.totalDue}). Please verify.`);
    }

    // Check for very small payments
    if (amount < 10) {
      warnings.push('Payment amount is very small. Please verify.');
    }

    // Check customer payment history
    if (customerSummary.isOverdue) {
      warnings.push('Customer account is overdue. This payment will help clear the outstanding balance.');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Format validation errors for API response
   */
  static formatValidationErrors(errors: ValidationError[]): string {
    if (errors.length === 0) return '';
    
    if (errors.length === 1) {
      return errors[0].message;
    }
    
    return `Multiple errors: ${errors.map(e => e.message).join(', ')}`;
  }
}

/**
 * Database operation error handling
 */
export class PaymentError extends Error {
  public code: string;
  public field?: string;
  public details?: any;

  constructor(message: string, code: string, field?: string, details?: any) {
    super(message);
    this.name = 'PaymentError';
    this.code = code;
    this.field = field;
    this.details = details;
  }
}

/**
 * Error codes for payment operations
 */
export const PaymentErrorCodes = {
  CUSTOMER_NOT_FOUND: 'CUSTOMER_NOT_FOUND',
  INVALID_AMOUNT: 'INVALID_AMOUNT',
  INACTIVE_CUSTOMER: 'INACTIVE_CUSTOMER',
  CALCULATION_ERROR: 'CALCULATION_ERROR',
  DUPLICATE_PAYMENT: 'DUPLICATE_PAYMENT',
  INSUFFICIENT_DATA: 'INSUFFICIENT_DATA',
  SYSTEM_ERROR: 'SYSTEM_ERROR',
  VALIDATION_FAILED: 'VALIDATION_FAILED',
  PAYMENT_PROCESSING_FAILED: 'PAYMENT_PROCESSING_FAILED'
} as const;
