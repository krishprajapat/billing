-- MilkFlow Delivery Management System - Supabase Schema
-- Generated from existing in-memory database structure

-- Enable UUID extension for ID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create custom enum types
CREATE TYPE customer_status AS ENUM ('active', 'inactive');
CREATE TYPE worker_status AS ENUM ('active', 'inactive');
CREATE TYPE payment_status AS ENUM ('paid', 'pending', 'partial', 'overdue');
CREATE TYPE payment_method AS ENUM ('UPI', 'Cash', 'Bank Transfer', 'Card', 'Cheque');
CREATE TYPE user_role AS ENUM ('Super Admin', 'Manager', 'Worker', 'Viewer');
CREATE TYPE delivery_status AS ENUM ('delivered', 'missed', 'cancelled');

-- 1. AREAS - Delivery zones and sectors
CREATE TABLE areas (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. WORKERS - Delivery staff
CREATE TABLE workers (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    phone TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    area_id INTEGER NOT NULL REFERENCES areas(id) ON DELETE RESTRICT,
    address TEXT NOT NULL,
    emergency_contact TEXT,
    join_date DATE DEFAULT CURRENT_DATE,
    status worker_status DEFAULT 'active',
    customers_assigned INTEGER DEFAULT 0,
    monthly_revenue NUMERIC(12,2) DEFAULT 0,
    efficiency NUMERIC(5,2) DEFAULT 0, -- percentage
    on_time_deliveries INTEGER DEFAULT 0,
    total_deliveries INTEGER DEFAULT 0,
    rating NUMERIC(3,2) DEFAULT 0 CHECK (rating >= 0 AND rating <= 5),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. CUSTOMERS - Milk delivery customers
CREATE TABLE customers (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    phone TEXT NOT NULL,
    address TEXT NOT NULL,
    area_id INTEGER NOT NULL REFERENCES areas(id) ON DELETE RESTRICT,
    daily_quantity NUMERIC(8,3) NOT NULL DEFAULT 1.0 CHECK (daily_quantity > 0),
    rate_per_liter NUMERIC(8,2) NOT NULL DEFAULT 0 CHECK (rate_per_liter >= 0),
    monthly_amount NUMERIC(12,2) DEFAULT 0,
    worker_id INTEGER REFERENCES workers(id) ON DELETE SET NULL,
    status customer_status DEFAULT 'active',
    join_date DATE DEFAULT CURRENT_DATE,
    last_payment DATE,
    pending_dues NUMERIC(12,2) DEFAULT 0,
    current_month_deliveries INTEGER DEFAULT 0,
    current_month_amount NUMERIC(12,2) DEFAULT 0,
    next_day_quantity NUMERIC(8,3),
    can_change_quantity BOOLEAN DEFAULT true,
    unique_link TEXT UNIQUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. DAILY DELIVERIES - Daily milk delivery records
CREATE TABLE daily_deliveries (
    id SERIAL PRIMARY KEY,
    customer_id INTEGER NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    worker_id INTEGER REFERENCES workers(id) ON DELETE SET NULL,
    date DATE NOT NULL,
    quantity_delivered NUMERIC(8,3) NOT NULL DEFAULT 0 CHECK (quantity_delivered >= 0),
    rate_per_liter NUMERIC(8,2) NOT NULL CHECK (rate_per_liter >= 0),
    daily_amount NUMERIC(12,2) GENERATED ALWAYS AS (quantity_delivered * rate_per_liter) STORED,
    status delivery_status DEFAULT 'delivered',
    notes TEXT,
    delivery_time TIME,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(customer_id, date)
);

-- 5. DAILY QUANTITIES - Customer quantity requests for tomorrow
CREATE TABLE daily_quantities (
    id SERIAL PRIMARY KEY,
    customer_id INTEGER NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    requested_quantity NUMERIC(8,3),
    current_quantity NUMERIC(8,3),
    is_locked BOOLEAN DEFAULT false,
    requested_at TIMESTAMPTZ,
    locked_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(customer_id, date)
);

-- 6. PAYMENTS - Payment transactions
CREATE TABLE payments (
    id SERIAL PRIMARY KEY,
    customer_id INTEGER NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    amount NUMERIC(12,2) NOT NULL CHECK (amount > 0),
    payment_method payment_method NOT NULL,
    status payment_status DEFAULT 'pending',
    month TEXT,
    year INTEGER,
    due_date DATE,
    paid_date DATE,
    notes TEXT,
    razorpay_payment_id TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. MONTHLY BILLS - Generated monthly bills
CREATE TABLE monthly_bills (
    id SERIAL PRIMARY KEY,
    customer_id INTEGER NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    month TEXT NOT NULL,
    year INTEGER NOT NULL,
    milk_quantity NUMERIC(10,3),
    rate_per_liter NUMERIC(8,2),
    total_amount NUMERIC(12,2),
    paid_amount NUMERIC(12,2) DEFAULT 0,
    pending_amount NUMERIC(12,2),
    status payment_status DEFAULT 'pending',
    due_date DATE,
    bill_number TEXT UNIQUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(customer_id, month, year)
);

-- 8. DAILY BILLINGS - Monthly billing summaries
CREATE TABLE daily_billings (
    id SERIAL PRIMARY KEY,
    customer_id INTEGER NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    month TEXT NOT NULL,
    year INTEGER NOT NULL,
    total_days INTEGER DEFAULT 0,
    delivered_days INTEGER DEFAULT 0,
    total_quantity NUMERIC(10,3) DEFAULT 0,
    total_amount NUMERIC(12,2) DEFAULT 0,
    collected_amount NUMERIC(12,2) DEFAULT 0,
    pending_amount NUMERIC(12,2) DEFAULT 0,
    last_calculated_date DATE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(customer_id, month, year)
);

-- 9. CUSTOMER QUANTITY LINKS - Tokens for customer self-service
CREATE TABLE customer_quantity_links (
    id SERIAL PRIMARY KEY,
    customer_id INTEGER NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    unique_token TEXT NOT NULL UNIQUE,
    next_day_quantity NUMERIC(8,3),
    expires_at TIMESTAMPTZ NOT NULL,
    can_change BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 10. USERS - System users and authentication
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    role user_role DEFAULT 'Viewer',
    status customer_status DEFAULT 'active',
    last_login TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 11. BUSINESS SETTINGS - Business configuration
CREATE TABLE business_settings (
    id SERIAL PRIMARY KEY,
    business_name TEXT DEFAULT 'MilkFlow Dairy Services',
    owner_name TEXT DEFAULT 'Business Owner',
    phone TEXT,
    email TEXT,
    address TEXT,
    gst_number TEXT,
    registration_number TEXT,
    website TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 12. PRICING SETTINGS - Universal pricing configuration
CREATE TABLE pricing_settings (
    id SERIAL PRIMARY KEY,
    default_rate NUMERIC(8,2) DEFAULT 60,
    premium_rate NUMERIC(8,2) DEFAULT 65,
    bulk_rate NUMERIC(8,2) DEFAULT 55,
    minimum_order NUMERIC(6,2) DEFAULT 0.5,
    delivery_charge NUMERIC(8,2) DEFAULT 0,
    late_fee NUMERIC(8,2) DEFAULT 50,
    currency TEXT DEFAULT 'INR',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 13. PAYMENT GATEWAY SETTINGS - Payment gateway configuration
CREATE TABLE payment_gateway_settings (
    id SERIAL PRIMARY KEY,
    razorpay_enabled BOOLEAN DEFAULT true,
    razorpay_key_id TEXT,
    razorpay_secret TEXT,
    upi_enabled BOOLEAN DEFAULT true,
    upi_id TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- INDEXES for better performance
CREATE INDEX idx_customers_area_id ON customers(area_id);
CREATE INDEX idx_customers_worker_id ON customers(worker_id);
CREATE INDEX idx_customers_status ON customers(status);
CREATE INDEX idx_customers_phone ON customers(phone);

CREATE INDEX idx_workers_area_id ON workers(area_id);
CREATE INDEX idx_workers_status ON workers(status);

CREATE INDEX idx_daily_deliveries_customer_date ON daily_deliveries(customer_id, date);
CREATE INDEX idx_daily_deliveries_worker_date ON daily_deliveries(worker_id, date);
CREATE INDEX idx_daily_deliveries_date ON daily_deliveries(date);

CREATE INDEX idx_daily_quantities_customer_date ON daily_quantities(customer_id, date);
CREATE INDEX idx_daily_quantities_date ON daily_quantities(date);

CREATE INDEX idx_payments_customer_id ON payments(customer_id);
CREATE INDEX idx_payments_date ON payments(created_at);
CREATE INDEX idx_payments_status ON payments(status);

CREATE INDEX idx_monthly_bills_customer_year_month ON monthly_bills(customer_id, year, month);

-- TRIGGERS for automatic updates
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply updated_at triggers to all tables
CREATE TRIGGER update_areas_updated_at BEFORE UPDATE ON areas FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_workers_updated_at BEFORE UPDATE ON workers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_customers_updated_at BEFORE UPDATE ON customers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_daily_deliveries_updated_at BEFORE UPDATE ON daily_deliveries FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_daily_quantities_updated_at BEFORE UPDATE ON daily_quantities FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_payments_updated_at BEFORE UPDATE ON payments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_monthly_bills_updated_at BEFORE UPDATE ON monthly_bills FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_daily_billings_updated_at BEFORE UPDATE ON daily_billings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_customer_quantity_links_updated_at BEFORE UPDATE ON customer_quantity_links FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_business_settings_updated_at BEFORE UPDATE ON business_settings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_pricing_settings_updated_at BEFORE UPDATE ON pricing_settings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_payment_gateway_settings_updated_at BEFORE UPDATE ON payment_gateway_settings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- BUSINESS LOGIC FUNCTIONS

-- Function to calculate customer monthly amount from daily deliveries
CREATE OR REPLACE FUNCTION calculate_customer_monthly_amount(
    p_customer_id INTEGER,
    p_month TEXT,
    p_year INTEGER
) RETURNS NUMERIC AS $$
DECLARE
    total_amount NUMERIC(12,2) := 0;
BEGIN
    SELECT COALESCE(SUM(daily_amount), 0)
    INTO total_amount
    FROM daily_deliveries
    WHERE customer_id = p_customer_id
    AND EXTRACT(MONTH FROM date) = CASE 
        WHEN p_month = 'January' THEN 1 WHEN p_month = 'February' THEN 2
        WHEN p_month = 'March' THEN 3 WHEN p_month = 'April' THEN 4
        WHEN p_month = 'May' THEN 5 WHEN p_month = 'June' THEN 6
        WHEN p_month = 'July' THEN 7 WHEN p_month = 'August' THEN 8
        WHEN p_month = 'September' THEN 9 WHEN p_month = 'October' THEN 10
        WHEN p_month = 'November' THEN 11 WHEN p_month = 'December' THEN 12
        ELSE 0 END
    AND EXTRACT(YEAR FROM date) = p_year;
    
    RETURN total_amount;
END;
$$ LANGUAGE plpgsql;

-- Function to check if quantity change is allowed (6 PM - 10 PM)
CREATE OR REPLACE FUNCTION is_quantity_change_allowed() RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXTRACT(HOUR FROM NOW() AT TIME ZONE 'Asia/Kolkata') BETWEEN 18 AND 21;
END;
$$ LANGUAGE plpgsql;

-- Trigger to validate quantity changes within time window
CREATE OR REPLACE FUNCTION validate_quantity_change()
RETURNS TRIGGER AS $$
BEGIN
    -- Check if this is an update to requested_quantity
    IF TG_OP = 'UPDATE' AND NEW.requested_quantity IS DISTINCT FROM OLD.requested_quantity THEN
        -- Only allow changes during 6 PM - 10 PM
        IF NOT is_quantity_change_allowed() THEN
            RAISE EXCEPTION 'Quantity changes are only allowed between 6:00 PM and 10:00 PM';
        END IF;
        
        -- Only allow changes for tomorrow or future dates
        IF NEW.date <= CURRENT_DATE THEN
            RAISE EXCEPTION 'Cannot change quantity for today or past dates';
        END IF;
        
        -- Don't allow changes if locked
        IF NEW.is_locked = true THEN
            RAISE EXCEPTION 'Cannot change quantity - record is locked';
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER validate_daily_quantity_changes 
    BEFORE UPDATE ON daily_quantities 
    FOR EACH ROW EXECUTE FUNCTION validate_quantity_change();

-- Function to update worker area consistency
CREATE OR REPLACE FUNCTION maintain_worker_area_consistency()
RETURNS TRIGGER AS $$
BEGIN
    -- If customer's area changes, check if assigned worker serves that area
    IF TG_OP = 'UPDATE' AND NEW.area_id IS DISTINCT FROM OLD.area_id THEN
        -- If customer has a worker assigned
        IF NEW.worker_id IS NOT NULL THEN
            -- Check if worker serves the new area
            IF NOT EXISTS (
                SELECT 1 FROM workers 
                WHERE id = NEW.worker_id AND area_id = NEW.area_id
            ) THEN
                -- Unassign worker if they don't serve the new area
                NEW.worker_id := NULL;
            END IF;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER maintain_customer_worker_area_consistency 
    BEFORE UPDATE ON customers 
    FOR EACH ROW EXECUTE FUNCTION maintain_worker_area_consistency();

-- Insert default settings data
INSERT INTO business_settings (business_name, owner_name, phone, email, address, gst_number, registration_number, website) 
VALUES (
    'MilkFlow Dairy Services',
    'Rajesh Kumar',
    '+91 98765 43210',
    'contact@milkflow.com',
    '123 Dairy Complex, Sector 15, Noida, UP 201301',
    '09ABCDE1234F1Z5',
    '12345678901234',
    'www.milkflow.com'
);

INSERT INTO pricing_settings (default_rate, premium_rate, bulk_rate, minimum_order, delivery_charge, late_fee, currency)
VALUES (65, 65, 65, 0.5, 0, 50, 'INR');

INSERT INTO payment_gateway_settings (razorpay_enabled, razorpay_key_id, upi_enabled, upi_id)
VALUES (true, 'rzp_test_1234567890', true, 'milkflow@paytm');

-- Create a default admin user
INSERT INTO users (name, email, role, status)
VALUES ('Admin User', 'admin@milkflow.com', 'Super Admin', 'active');

COMMENT ON TABLE areas IS 'Delivery areas and zones for milk distribution network';
COMMENT ON TABLE workers IS 'Delivery staff with performance tracking';
COMMENT ON TABLE customers IS 'Milk delivery customers with subscription details';
COMMENT ON TABLE daily_deliveries IS 'Daily milk delivery records with quantities and amounts';
COMMENT ON TABLE daily_quantities IS 'Customer quantity requests for upcoming deliveries';
COMMENT ON TABLE payments IS 'Customer payment transactions and history';
COMMENT ON TABLE monthly_bills IS 'Generated monthly bills for customers';
COMMENT ON TABLE daily_billings IS 'Monthly billing summaries and calculations';
COMMENT ON TABLE customer_quantity_links IS 'Secure tokens for customer self-service quantity changes';
COMMENT ON TABLE users IS 'System users with role-based access';
