-- Update payment table with new payment type column
ALTER TABLE payments ADD COLUMN payment_type VARCHAR(20) DEFAULT 'MPESA';
ALTER TABLE payments MODIFY COLUMN status VARCHAR(50) DEFAULT 'PENDING';
-- Status values: PENDING, PAID_MPESA, PAID_CASH, APPROVED
