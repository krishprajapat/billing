-- MilkFlow Delivery Management System - Seed Data
-- Sample data to populate the Supabase database

-- Insert sample areas
INSERT INTO areas (name, description) VALUES
('Sector 15', 'Residential area near Metro Station'),
('Sector 12', 'Commercial and residential mixed area'),
('Sector 21', 'High-density residential area'),
('Sector 25', 'New development area');

-- Insert sample workers
INSERT INTO workers (
    name, phone, email, area_id, address, emergency_contact, 
    join_date, status, efficiency, rating
) VALUES
('Suresh Kumar', '+91 98765 43210', 'suresh@milkflow.com', (SELECT id FROM areas WHERE name = 'Sector 15'), 
 'Village Dadri, Near Main Market', '+91 98765 43211', 
 '2023-05-15', 'active'::worker_status, 98.00, 4.8),
('Mohan Lal', '+91 87654 32109', 'mohan@milkflow.com', (SELECT id FROM areas WHERE name = 'Sector 21'), 
 'Village Mamura, Near Bus Stand', '+91 87654 32110', 
 '2023-08-20', 'active'::worker_status, 95.00, 4.6);

-- Insert sample customers
INSERT INTO customers (
    name, phone, address, area_id, daily_quantity, rate_per_liter, 
    worker_id, status, join_date, current_month_deliveries, current_month_amount
) VALUES
('Ramesh Kumar', '+91 98765 43210', '123 Main Street, Sector 15, Noida', (SELECT id FROM areas WHERE name = 'Sector 15'), 
 2.0, 65, (SELECT id FROM workers WHERE email = 'suresh@milkflow.com'), 'active'::customer_status, '2024-01-15', 29, 3770),
('Priya Sharma', '+91 87654 32109', '456 Park Road, Sector 21, Noida', (SELECT id FROM areas WHERE name = 'Sector 21'), 
 1.5, 65, (SELECT id FROM workers WHERE email = 'mohan@milkflow.com'), 'active'::customer_status, '2024-02-20', 29, 2827.5),
('fgtfgh', '6523562369', 'No area assigned', (SELECT id FROM areas WHERE name = 'Sector 15'), 
 1.0, 65, NULL, 'active'::customer_status, CURRENT_DATE, 0, 0);

-- Generate sample daily deliveries for current month
DO $$
DECLARE
    customer_record RECORD;
    delivery_date DATE;
    current_month_start DATE;
    days_to_generate INTEGER;
    day_counter INTEGER;
BEGIN
    -- Calculate current month start and days to generate
    current_month_start := DATE_TRUNC('month', CURRENT_DATE);
    days_to_generate := EXTRACT(DAY FROM CURRENT_DATE);
    
    -- Generate deliveries for each active customer
    FOR customer_record IN 
        SELECT id, daily_quantity, rate_per_liter, worker_id 
        FROM customers 
        WHERE status = 'active'::customer_status AND name != 'fgtfgh' -- Skip the new customer
    LOOP
        -- Generate deliveries from start of month to today
        FOR day_counter IN 1..days_to_generate LOOP
            delivery_date := current_month_start + (day_counter - 1);
            
            INSERT INTO daily_deliveries (
                customer_id, worker_id, date, quantity_delivered, 
                rate_per_liter, status, delivery_time
            ) VALUES (
                customer_record.id,
                customer_record.worker_id,
                delivery_date,
                customer_record.daily_quantity,
                customer_record.rate_per_liter,
                'delivered'::delivery_status,
                '07:30:00'
            );
        END LOOP;
    END LOOP;
END $$;

-- Generate daily quantities for tomorrow
INSERT INTO daily_quantities (customer_id, date, requested_quantity, current_quantity, is_locked)
SELECT 
    id,
    CURRENT_DATE + INTERVAL '1 day',
    daily_quantity,
    daily_quantity,
    false
FROM customers 
WHERE status = 'active'::customer_status;

-- Insert sample payments (some overdue scenarios)
INSERT INTO payments (
    customer_id, amount, payment_method, status, month, year, 
    due_date, paid_date, notes
) VALUES
-- Ramesh Kumar - Recent payment
( (SELECT id FROM customers WHERE name = 'Ramesh Kumar'), 3480.00, 'UPI'::payment_method, 'paid'::payment_status, 'July', 2024, '2024-08-05', '2024-07-20', 'Monthly payment via UPI'),
-- Priya Sharma - Overdue payment
( (SELECT id FROM customers WHERE name = 'Priya Sharma'), 2610.00, 'Cash'::payment_method, 'overdue'::payment_status, 'June', 2024, '2024-07-05', NULL, 'Payment pending - follow up required'),
-- Priya Sharma - Partial payment
( (SELECT id FROM customers WHERE name = 'Priya Sharma'), 1500.00, 'Bank Transfer'::payment_method, 'partial'::payment_status, 'July', 2024, '2024-08-05', '2024-07-25', 'Partial payment received');

-- Generate monthly bills for current and previous months
DO $$
DECLARE
    customer_record RECORD;
    current_month_name TEXT;
    current_year INTEGER;
    prev_month_name TEXT;
    prev_year INTEGER;
    delivery_total NUMERIC;
BEGIN
    -- Get current month info
    current_month_name := TO_CHAR(CURRENT_DATE, 'Month');
    current_month_name := TRIM(current_month_name);
    current_year := EXTRACT(YEAR FROM CURRENT_DATE);
    
    -- Get previous month info
    prev_month_name := TO_CHAR(CURRENT_DATE - INTERVAL '1 month', 'Month');
    prev_month_name := TRIM(prev_month_name);
    prev_year := CASE 
        WHEN EXTRACT(MONTH FROM CURRENT_DATE) = 1 THEN current_year - 1 
        ELSE current_year 
    END;
    
    -- Generate bills for each customer
    FOR customer_record IN 
        SELECT id, name, daily_quantity, rate_per_liter, current_month_amount 
        FROM customers 
        WHERE status = 'active'::customer_status
    LOOP
        -- Current month bill
        INSERT INTO monthly_bills (
            customer_id, month, year, milk_quantity, rate_per_liter,
            total_amount, pending_amount, status, due_date, bill_number
        ) VALUES (
            customer_record.id,
            current_month_name,
            current_year,
            customer_record.daily_quantity * 30,
            customer_record.rate_per_liter,
            customer_record.current_month_amount,
            customer_record.current_month_amount,
            'pending'::payment_status,
            CURRENT_DATE + INTERVAL '5 days',
            'BILL-' || customer_record.id || '-' || TO_CHAR(CURRENT_DATE, 'MMYYYY')
        );
        
        -- Previous month bill (for payment history)
        INSERT INTO monthly_bills (
            customer_id, month, year, milk_quantity, rate_per_liter,
            total_amount, paid_amount, pending_amount, status, due_date, bill_number
        ) VALUES (
            customer_record.id,
            prev_month_name,
            prev_year,
            customer_record.daily_quantity * 30,
            customer_record.rate_per_liter,
            customer_record.daily_quantity * customer_record.rate_per_liter * 30,
            CASE 
                WHEN customer_record.id = 1 THEN customer_record.daily_quantity * customer_record.rate_per_liter * 30
                ELSE customer_record.daily_quantity * customer_record.rate_per_liter * 15
            END,
            CASE 
                WHEN customer_record.id = 1 THEN 0
                ELSE customer_record.daily_quantity * customer_record.rate_per_liter * 15
            END,
            CASE 
                WHEN customer_record.id = 1 THEN 'paid'::payment_status
                ELSE 'overdue'::payment_status
            END,
            (CURRENT_DATE - INTERVAL '1 month') + INTERVAL '5 days',
            'BILL-' || customer_record.id || '-' || TO_CHAR(CURRENT_DATE - INTERVAL '1 month', 'MMYYYY')
        );
    END LOOP;
END $$;

-- Update customer pending dues based on unpaid bills
UPDATE customers 
SET pending_dues = (
    SELECT COALESCE(SUM(pending_amount), 0)
    FROM monthly_bills 
    WHERE monthly_bills.customer_id = customers.id 
    AND status IN ('pending'::payment_status, 'overdue'::payment_status, 'partial'::payment_status)
);

-- Update customer monthly amounts based on current month deliveries
UPDATE customers 
SET monthly_amount = (
    SELECT COALESCE(SUM(daily_amount), 0)
    FROM daily_deliveries 
    WHERE daily_deliveries.customer_id = customers.id 
    AND EXTRACT(MONTH FROM date) = EXTRACT(MONTH FROM CURRENT_DATE)
    AND EXTRACT(YEAR FROM date) = EXTRACT(YEAR FROM CURRENT_DATE)
);

-- Update worker statistics
UPDATE workers SET 
    customers_assigned = (
        SELECT COUNT(*) 
        FROM customers 
        WHERE customers.worker_id = workers.id 
        AND customers.status = 'active'::customer_status
    ),
    monthly_revenue = (
        SELECT COALESCE(SUM(current_month_amount), 0)
        FROM customers 
        WHERE customers.worker_id = workers.id 
        AND customers.status = 'active'::customer_status
    ),
    total_deliveries = (
        SELECT COUNT(*)
        FROM daily_deliveries 
        WHERE daily_deliveries.worker_id = workers.id
        AND EXTRACT(MONTH FROM date) = EXTRACT(MONTH FROM CURRENT_DATE)
        AND EXTRACT(YEAR FROM date) = EXTRACT(YEAR FROM CURRENT_DATE)
    ),
    on_time_deliveries = (
        SELECT COUNT(*)
        FROM daily_deliveries 
        WHERE daily_deliveries.worker_id = workers.id
        AND status = 'delivered'::delivery_status
        AND EXTRACT(MONTH FROM date) = EXTRACT(MONTH FROM CURRENT_DATE)
        AND EXTRACT(YEAR FROM date) = EXTRACT(YEAR FROM CURRENT_DATE)
    );

-- Generate sample customer quantity links
INSERT INTO customer_quantity_links (
    customer_id, unique_token, next_day_quantity, expires_at, can_change
)
SELECT 
    id,
    'token_' || id || '_' || EXTRACT(EPOCH FROM NOW()),
    daily_quantity,
    NOW() + INTERVAL '24 hours',
    true
FROM customers 
WHERE status = 'active'::customer_status;

-- Update customers with their unique links
UPDATE customers 
SET unique_link = (
    SELECT unique_token 
    FROM customer_quantity_links 
    WHERE customer_quantity_links.customer_id = customers.id 
    LIMIT 1
);

-- Create some daily billing records for reporting
INSERT INTO daily_billings (
    customer_id, month, year, total_days, delivered_days, 
    total_quantity, total_amount, collected_amount, pending_amount, 
    last_calculated_date
)
SELECT 
    c.id,
    TO_CHAR(CURRENT_DATE, 'Month'),
    EXTRACT(YEAR FROM CURRENT_DATE),
    EXTRACT(DAY FROM CURRENT_DATE),
    c.current_month_deliveries,
    c.current_month_deliveries * c.daily_quantity,
    c.current_month_amount,
    CASE WHEN c.id = 1 THEN c.current_month_amount ELSE c.current_month_amount * 0.3 END,
    CASE WHEN c.id = 1 THEN 0 ELSE c.current_month_amount * 0.7 END,
    CURRENT_DATE
FROM customers c
WHERE c.status = 'active'::customer_status;

-- Show summary of inserted data
SELECT 
    'Data Summary' as section,
    (SELECT COUNT(*) FROM areas) as areas_count,
    (SELECT COUNT(*) FROM workers) as workers_count,
    (SELECT COUNT(*) FROM customers) as customers_count,
    (SELECT COUNT(*) FROM daily_deliveries) as deliveries_count,
    (SELECT COUNT(*) FROM payments) as payments_count,
    (SELECT COUNT(*) FROM monthly_bills) as bills_count;
