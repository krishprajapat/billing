// Supabase Database Types
// Generated from the schema in supabase-schema.sql

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

// Enum types
export type CustomerStatus = 'active' | 'inactive'
export type WorkerStatus = 'active' | 'inactive'
export type PaymentStatus = 'paid' | 'pending' | 'partial' | 'overdue'
export type PaymentMethod = 'UPI' | 'Cash' | 'Bank Transfer' | 'Card' | 'Cheque'
export type UserRole = 'Super Admin' | 'Manager' | 'Worker' | 'Viewer'
export type DeliveryStatus = 'delivered' | 'missed' | 'cancelled'

export interface Database {
  public: {
    Tables: {
      areas: {
        Row: {
          id: number
          name: string
          description: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: number
          name: string
          description?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: number
          name?: string
          description?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      workers: {
        Row: {
          id: number
          name: string
          phone: string
          email: string
          area_id: number
          address: string
          emergency_contact: string | null
          join_date: string
          status: WorkerStatus
          customers_assigned: number
          monthly_revenue: number
          efficiency: number
          on_time_deliveries: number
          total_deliveries: number
          rating: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: number
          name: string
          phone: string
          email: string
          area_id: number
          address: string
          emergency_contact?: string | null
          join_date?: string
          status?: WorkerStatus
          customers_assigned?: number
          monthly_revenue?: number
          efficiency?: number
          on_time_deliveries?: number
          total_deliveries?: number
          rating?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: number
          name?: string
          phone?: string
          email?: string
          area_id?: number
          address?: string
          emergency_contact?: string | null
          join_date?: string
          status?: WorkerStatus
          customers_assigned?: number
          monthly_revenue?: number
          efficiency?: number
          on_time_deliveries?: number
          total_deliveries?: number
          rating?: number
          created_at?: string
          updated_at?: string
        }
      }
      customers: {
        Row: {
          id: number
          name: string
          phone: string
          address: string
          area_id: number
          daily_quantity: number
          rate_per_liter: number
          monthly_amount: number
          worker_id: number | null
          status: CustomerStatus
          join_date: string
          last_payment: string | null
          pending_dues: number
          current_month_deliveries: number
          current_month_amount: number
          next_day_quantity: number | null
          can_change_quantity: boolean
          unique_link: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: number
          name: string
          phone: string
          address: string
          area_id: number
          daily_quantity?: number
          rate_per_liter?: number
          monthly_amount?: number
          worker_id?: number | null
          status?: CustomerStatus
          join_date?: string
          last_payment?: string | null
          pending_dues?: number
          current_month_deliveries?: number
          current_month_amount?: number
          next_day_quantity?: number | null
          can_change_quantity?: boolean
          unique_link?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: number
          name?: string
          phone?: string
          address?: string
          area_id?: number
          daily_quantity?: number
          rate_per_liter?: number
          monthly_amount?: number
          worker_id?: number | null
          status?: CustomerStatus
          join_date?: string
          last_payment?: string | null
          pending_dues?: number
          current_month_deliveries?: number
          current_month_amount?: number
          next_day_quantity?: number | null
          can_change_quantity?: boolean
          unique_link?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      daily_deliveries: {
        Row: {
          id: number
          customer_id: number
          worker_id: number | null
          date: string
          quantity_delivered: number
          rate_per_liter: number
          daily_amount: number
          status: DeliveryStatus
          notes: string | null
          delivery_time: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: number
          customer_id: number
          worker_id?: number | null
          date: string
          quantity_delivered?: number
          rate_per_liter: number
          status?: DeliveryStatus
          notes?: string | null
          delivery_time?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: number
          customer_id?: number
          worker_id?: number | null
          date?: string
          quantity_delivered?: number
          rate_per_liter?: number
          status?: DeliveryStatus
          notes?: string | null
          delivery_time?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      daily_quantities: {
        Row: {
          id: number
          customer_id: number
          date: string
          requested_quantity: number | null
          current_quantity: number | null
          is_locked: boolean
          requested_at: string | null
          locked_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: number
          customer_id: number
          date: string
          requested_quantity?: number | null
          current_quantity?: number | null
          is_locked?: boolean
          requested_at?: string | null
          locked_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: number
          customer_id?: number
          date?: string
          requested_quantity?: number | null
          current_quantity?: number | null
          is_locked?: boolean
          requested_at?: string | null
          locked_at?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      payments: {
        Row: {
          id: number
          customer_id: number
          amount: number
          payment_method: PaymentMethod
          status: PaymentStatus
          month: string | null
          year: number | null
          due_date: string | null
          paid_date: string | null
          notes: string | null
          razorpay_payment_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: number
          customer_id: number
          amount: number
          payment_method: PaymentMethod
          status?: PaymentStatus
          month?: string | null
          year?: number | null
          due_date?: string | null
          paid_date?: string | null
          notes?: string | null
          razorpay_payment_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: number
          customer_id?: number
          amount?: number
          payment_method?: PaymentMethod
          status?: PaymentStatus
          month?: string | null
          year?: number | null
          due_date?: string | null
          paid_date?: string | null
          notes?: string | null
          razorpay_payment_id?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      monthly_bills: {
        Row: {
          id: number
          customer_id: number
          month: string
          year: number
          milk_quantity: number | null
          rate_per_liter: number | null
          total_amount: number | null
          paid_amount: number
          pending_amount: number | null
          status: PaymentStatus
          due_date: string | null
          bill_number: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: number
          customer_id: number
          month: string
          year: number
          milk_quantity?: number | null
          rate_per_liter?: number | null
          total_amount?: number | null
          paid_amount?: number
          pending_amount?: number | null
          status?: PaymentStatus
          due_date?: string | null
          bill_number?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: number
          customer_id?: number
          month?: string
          year?: number
          milk_quantity?: number | null
          rate_per_liter?: number | null
          total_amount?: number | null
          paid_amount?: number
          pending_amount?: number | null
          status?: PaymentStatus
          due_date?: string | null
          bill_number?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      daily_billings: {
        Row: {
          id: number
          customer_id: number
          month: string
          year: number
          total_days: number
          delivered_days: number
          total_quantity: number
          total_amount: number
          collected_amount: number
          pending_amount: number
          last_calculated_date: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: number
          customer_id: number
          month: string
          year: number
          total_days?: number
          delivered_days?: number
          total_quantity?: number
          total_amount?: number
          collected_amount?: number
          pending_amount?: number
          last_calculated_date?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: number
          customer_id?: number
          month?: string
          year?: number
          total_days?: number
          delivered_days?: number
          total_quantity?: number
          total_amount?: number
          collected_amount?: number
          pending_amount?: number
          last_calculated_date?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      customer_quantity_links: {
        Row: {
          id: number
          customer_id: number
          unique_token: string
          next_day_quantity: number | null
          expires_at: string
          can_change: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: number
          customer_id: number
          unique_token: string
          next_day_quantity?: number | null
          expires_at: string
          can_change?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: number
          customer_id?: number
          unique_token?: string
          next_day_quantity?: number | null
          expires_at?: string
          can_change?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      users: {
        Row: {
          id: number
          name: string
          email: string
          role: UserRole
          status: CustomerStatus
          last_login: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: number
          name: string
          email: string
          role?: UserRole
          status?: CustomerStatus
          last_login?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: number
          name?: string
          email?: string
          role?: UserRole
          status?: CustomerStatus
          last_login?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      business_settings: {
        Row: {
          id: number
          business_name: string | null
          owner_name: string | null
          phone: string | null
          email: string | null
          address: string | null
          gst_number: string | null
          registration_number: string | null
          website: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: number
          business_name?: string | null
          owner_name?: string | null
          phone?: string | null
          email?: string | null
          address?: string | null
          gst_number?: string | null
          registration_number?: string | null
          website?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: number
          business_name?: string | null
          owner_name?: string | null
          phone?: string | null
          email?: string | null
          address?: string | null
          gst_number?: string | null
          registration_number?: string | null
          website?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      pricing_settings: {
        Row: {
          id: number
          default_rate: number
          premium_rate: number
          bulk_rate: number
          minimum_order: number
          delivery_charge: number
          late_fee: number
          currency: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: number
          default_rate?: number
          premium_rate?: number
          bulk_rate?: number
          minimum_order?: number
          delivery_charge?: number
          late_fee?: number
          currency?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: number
          default_rate?: number
          premium_rate?: number
          bulk_rate?: number
          minimum_order?: number
          delivery_charge?: number
          late_fee?: number
          currency?: string
          created_at?: string
          updated_at?: string
        }
      }
      payment_gateway_settings: {
        Row: {
          id: number
          razorpay_enabled: boolean
          razorpay_key_id: string | null
          razorpay_secret: string | null
          upi_enabled: boolean
          upi_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: number
          razorpay_enabled?: boolean
          razorpay_key_id?: string | null
          razorpay_secret?: string | null
          upi_enabled?: boolean
          upi_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: number
          razorpay_enabled?: boolean
          razorpay_key_id?: string | null
          razorpay_secret?: string | null
          upi_enabled?: boolean
          upi_id?: string | null
          created_at?: string
          updated_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      calculate_customer_monthly_amount: {
        Args: {
          p_customer_id: number
          p_month: string
          p_year: number
        }
        Returns: number
      }
      is_quantity_change_allowed: {
        Args: {}
        Returns: boolean
      }
    }
    Enums: {
      customer_status: CustomerStatus
      worker_status: WorkerStatus
      payment_status: PaymentStatus
      payment_method: PaymentMethod
      user_role: UserRole
      delivery_status: DeliveryStatus
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}
