package com.kituirides.api.payment;

import com.kituirides.api.common.ApiException;
import com.kituirides.api.domain.entity.Payment;
import com.kituirides.api.domain.entity.Ride;
import com.kituirides.api.domain.entity.User;
import com.kituirides.api.domain.enums.PaymentStatus;
import com.kituirides.api.domain.enums.PaymentType;
import com.kituirides.api.domain.enums.RideStatus;
import com.kituirides.api.repository.AdminConfigRepository;
import com.kituirides.api.repository.PaymentRepository;
import com.kituirides.api.repository.RideRepository;
import com.kituirides.api.ride.RideService;
import com.kituirides.api.websocket.RealtimePublisher;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class PaymentService {

    private final RideService rideService;
    private final RideRepository rideRepository;
    private final PaymentRepository paymentRepository;
    private final MpesaClient mpesaClient;
    private final DriverWalletService driverWalletService;
    private final AdminConfigRepository adminConfigRepository;
    private final RealtimePublisher realtimePublisher;

    @Transactional
    public PaymentResponse initiatePayment(InitiatePaymentRequest request) {
        Ride ride = rideService.getRideById(request.rideId());
        if (ride.getStatus() != RideStatus.STARTED && ride.getStatus() != RideStatus.COMPLETED) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Ride must be started or completed before payment");
        }
        paymentRepository.findByRide(ride).ifPresent(existing -> {
            if (existing.getStatus() == PaymentStatus.SUCCESS) {
                throw new ApiException(HttpStatus.CONFLICT, "Payment already successful for this ride");
            }
            // Allow re-initiation if previous failed or pending
        });

        Payment payment = paymentRepository.findByRide(ride).orElse(new Payment());
        payment.setRide(ride);
        payment.setAmount(ride.getFinalFare());
        payment.setPhoneNumber(request.phoneNumber());
        payment.setTransactionRef("MPESA-" + ride.getId() + "-" + Instant.now().toEpochMilli());
        payment.setStatus(PaymentStatus.PENDING);
        payment.setPaymentType(PaymentType.MPESA);

        boolean initiated = mpesaClient.initiateStkPush(
            payment.getPhoneNumber(),
            payment.getAmount().toPlainString(),
            payment.getTransactionRef()
        );
        if (!initiated) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Invalid phone number for M-Pesa");
        }

        Payment saved = paymentRepository.save(payment);
        return toResponse(saved);
    }

    @Transactional
    public PaymentResponse handleMpesaCallback(MpesaCallbackRequest callback) {
        Payment payment = paymentRepository.findByTransactionRef(callback.transactionRef())
            .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Payment transaction not found"));
        
        boolean wasSuccess = payment.getStatus() == PaymentStatus.SUCCESS;
        payment.setStatus(callback.success() ? PaymentStatus.SUCCESS : PaymentStatus.FAILED);
        Payment saved = paymentRepository.save(payment);

        if (callback.success() && !wasSuccess) {
            handleSuccessfulPayment(payment.getRide(), payment.getAmount());
        }

        return toResponse(saved);
    }

    @Transactional
    public PaymentResponse approveCashPayment(Long rideId) {
        Ride ride = rideService.getRideById(rideId);
        // Only driver can approve cash payment
        // (Assuming current user check is done in controller or here if we have CurrentUserService)
        
        if (ride.getStatus() != RideStatus.STARTED && ride.getStatus() != RideStatus.COMPLETED) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Ride must be started or completed to approve payment");
        }

        Payment payment = paymentRepository.findByRide(ride).orElse(new Payment());
        payment.setRide(ride);
        payment.setAmount(ride.getFinalFare());
        payment.setPhoneNumber(ride.getCustomer().getPhoneNumber());
        payment.setTransactionRef("CASH-" + ride.getId() + "-" + Instant.now().toEpochMilli());
        payment.setStatus(PaymentStatus.SUCCESS);
        payment.setPaymentType(PaymentType.CASH);
        
        Payment saved = paymentRepository.save(payment);
        
        handleSuccessfulPayment(ride, payment.getAmount());
        
        return toResponse(saved);
    }

    private void handleSuccessfulPayment(Ride ride, BigDecimal amount) {
        ride.setPaymentApproved(true);
        rideRepository.save(ride);

        // Calculate and deduct commission
        BigDecimal commissionRate = adminConfigRepository.findByConfigKey("COMPANY_COMMISSION_RATE")
            .map(c -> new BigDecimal(c.getConfigValue()))
            .orElse(BigDecimal.valueOf(0.20));
        
        BigDecimal commission = amount.multiply(commissionRate).setScale(2, RoundingMode.HALF_UP);
        
        // If MPESA, add (amount - commission) to wallet
        // If CASH, deduct commission from wallet
        Payment payment = paymentRepository.findByRide(ride).orElseThrow();
        if (payment.getPaymentType() == PaymentType.MPESA) {
            BigDecimal driverEarnings = amount.subtract(commission);
            driverWalletService.addEarnings(ride.getRider(), driverEarnings);
        } else if (payment.getPaymentType() == PaymentType.CASH) {
            driverWalletService.deductCommission(ride.getRider(), commission);
        }

        realtimePublisher.publishRideUpdate(ride.getId(), "PAYMENT_SUCCESSFUL", rideService.toResponse(ride));
    }

    public PaymentResponse getByRideId(Long rideId) {
        Ride ride = rideService.getRideById(rideId);
        return paymentRepository.findByRide(ride)
            .map(this::toResponse)
            .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Payment not found"));
    }

    private PaymentResponse toResponse(Payment payment) {
        return new PaymentResponse(
            payment.getId(),
            payment.getRide().getId(),
            payment.getAmount(),
            payment.getPhoneNumber(),
            payment.getTransactionRef(),
            payment.getStatus(),
            payment.getCreatedAt()
        );
    }
}
