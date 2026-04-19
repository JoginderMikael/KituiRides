-- Update payment table with new payment type column
ALTER TABLE payments ADD COLUMN payment_type VARCHAR(20) DEFAULT 'MPESA';
ALTER TABLE payments ALTER COLUMN status SET DEFAULT 'PENDING';
-- Status values: PENDING, PAID_MPESA, PAID_CASH, APPROVED
