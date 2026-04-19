package com.kituirides.api.payment;

import com.kituirides.api.domain.entity.Payment;
import com.kituirides.api.domain.entity.Ride;
import com.kituirides.api.domain.enums.PaymentStatus;
import com.kituirides.api.domain.enums.PaymentType;
import com.kituirides.api.repository.PaymentRepository;
import java.math.BigDecimal;
import java.time.Instant;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Slf4j
@Service
@RequiredArgsConstructor
public class PaymentApprovalService {

    private final PaymentRepository paymentRepository;
    private final DriverWalletService walletService;

    /**
     * Initiate cash payment for a ride
     */
    @Transactional
    public Payment initiateCashPayment(Ride ride, BigDecimal amount) {
        Payment payment = new Payment();
        payment.setRide(ride);
        payment.setAmount(amount);
        payment.setPhoneNumber(ride.getCustomer().getPhoneNumber());
        payment.setPaymentType(PaymentType.CASH);
        payment.setStatus(PaymentStatus.PENDING);
        payment.setCreatedAt(Instant.now());
        
        paymentRepository.save(payment);
        log.info("Initiated cash payment for ride {} with amount {}", ride.getId(), amount);
        return payment;
    }

    /**
     * Driver approves cash payment received
     */
    @Transactional
    public Payment approveCashPayment(Ride ride) {
        Payment payment = paymentRepository.findByRide(ride)
                .orElseThrow(() -> new IllegalArgumentException("Payment not found for ride"));

        if (payment.getPaymentType() != PaymentType.CASH) {
            throw new IllegalArgumentException("Payment is not a cash payment");
        }

        if (payment.getStatus() != PaymentStatus.PENDING) {
            throw new IllegalArgumentException("Payment is not pending");
        }

        payment.setStatus(PaymentStatus.SUCCESS);
        payment = paymentRepository.save(payment);
        
        // Update ride payment approval status
        ride.setPaymentApproved(true);
        
        log.info("Approved cash payment for ride {} with amount {}", ride.getId(), payment.getAmount());
        return payment;
    }

    /**
     * Mark cash payment as approved by customer (when they pay the driver)
     */
    @Transactional
    public void confirmCashPaymentReceived(Long paymentId) {
        Payment payment = paymentRepository.findById(paymentId)
                .orElseThrow(() -> new IllegalArgumentException("Payment not found"));

        if (payment.getPaymentType() != PaymentType.CASH) {
            throw new IllegalArgumentException("Payment is not a cash payment");
        }

        if (payment.getStatus() != PaymentStatus.PENDING) {
            throw new IllegalArgumentException("Payment is not pending");
        }

        payment.setStatus(PaymentStatus.SUCCESS);
        paymentRepository.save(payment);
        
        // Add earnings to driver wallet
        Ride ride = payment.getRide();
        walletService.addEarnings(ride.getRider(), payment.getAmount());
        
        log.info("Confirmed cash payment received for ride {} with amount {}", ride.getId(), payment.getAmount());
    }

    /**
     * Mark M-Pesa payment as successful
     */
    @Transactional
    public void confirmMpesaPayment(Long paymentId, String transactionRef) {
        Payment payment = paymentRepository.findById(paymentId)
                .orElseThrow(() -> new IllegalArgumentException("Payment not found"));

        if (payment.getPaymentType() != PaymentType.MPESA) {
            throw new IllegalArgumentException("Payment is not an M-Pesa payment");
        }

        payment.setTransactionRef(transactionRef);
        payment.setStatus(PaymentStatus.SUCCESS);
        paymentRepository.save(payment);
        
        // Add earnings to driver wallet
        Ride ride = payment.getRide();
        walletService.addEarnings(ride.getRider(), payment.getAmount());
        
        log.info("Confirmed M-Pesa payment for ride {} with amount {}", ride.getId(), payment.getAmount());
    }

    /**
     * Get payment status
     */
    public PaymentStatus getPaymentStatus(Ride ride) {
        return paymentRepository.findByRide(ride)
                .map(Payment::getStatus)
                .orElse(PaymentStatus.PENDING);
    }

    /**
     * Check if payment is approved (for cash) or completed (for M-Pesa)
     */
    public boolean isPaymentApproved(Ride ride) {
        Payment payment = paymentRepository.findByRide(ride)
                .orElseThrow(() -> new IllegalArgumentException("Payment not found for ride"));
        
        return payment.getStatus() == PaymentStatus.SUCCESS;
    }
}
