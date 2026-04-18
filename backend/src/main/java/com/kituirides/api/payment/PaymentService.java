package com.kituirides.api.payment;

import com.kituirides.api.common.ApiException;
import com.kituirides.api.domain.entity.Payment;
import com.kituirides.api.domain.entity.Ride;
import com.kituirides.api.domain.enums.PaymentStatus;
import com.kituirides.api.domain.enums.RideStatus;
import com.kituirides.api.repository.PaymentRepository;
import com.kituirides.api.ride.RideService;
import java.time.Instant;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class PaymentService {

    private final RideService rideService;
    private final PaymentRepository paymentRepository;
    private final MpesaClient mpesaClient;

    @Transactional
    public PaymentResponse initiatePayment(InitiatePaymentRequest request) {
        Ride ride = rideService.getRideById(request.rideId());
        if (ride.getStatus() != RideStatus.COMPLETED) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Ride must be completed before payment");
        }
        paymentRepository.findByRide(ride).ifPresent(existing -> {
            throw new ApiException(HttpStatus.CONFLICT, "Payment already initiated for this ride");
        });

        Payment payment = new Payment();
        payment.setRide(ride);
        payment.setAmount(ride.getFinalFare());
        payment.setPhoneNumber(request.phoneNumber());
        payment.setTransactionRef("MPESA-" + ride.getId() + "-" + Instant.now().toEpochMilli());
        payment.setStatus(PaymentStatus.PENDING);

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
        payment.setStatus(callback.success() ? PaymentStatus.SUCCESS : PaymentStatus.FAILED);
        return toResponse(paymentRepository.save(payment));
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
