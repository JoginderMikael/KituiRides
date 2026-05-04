package com.kituirides.api.payment;

import com.kituirides.api.admin.AdminSettingKey;
import com.kituirides.api.admin.AdminSettingsService;
import com.kituirides.api.admin.PricingConfigurationSnapshot;
import com.kituirides.api.common.ApiException;
import com.kituirides.api.domain.entity.Payment;
import com.kituirides.api.domain.entity.Ride;
import com.kituirides.api.domain.entity.User;
import com.kituirides.api.domain.enums.PaymentStatus;
import com.kituirides.api.domain.enums.PaymentType;
import com.kituirides.api.domain.enums.Role;
import com.kituirides.api.event.EventType;
import com.kituirides.api.kafka.DomainEventPublisher;
import com.kituirides.api.repository.PaymentRepository;
import com.kituirides.api.ride.RideResponse;
import com.kituirides.api.ride.RideService;
import com.kituirides.api.security.CurrentUserService;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Handles payment workflows.
 */
@Service
@RequiredArgsConstructor
public class PaymentService {

    private final RideService rideService;
    private final PaymentRepository paymentRepository;
    private final MpesaClient mpesaClient;
    private final DriverWalletService driverWalletService;
    private final AdminSettingsService adminSettingsService;
    private final CurrentUserService currentUserService;
    private final DomainEventPublisher domainEventPublisher;

    @Transactional
    public PaymentResponse initiatePayment(InitiatePaymentRequest request) {
        Ride ride = rideService.getRideById(request.rideId());
        User actor = currentUserService.getCurrentUser();
        boolean canPay = actor.getRole() == Role.ADMIN
            || actor.getRole() == Role.SUPPORT_AGENT
            || ride.getCustomer().getId().equals(actor.getId());
        if (!canPay) {
            throw new ApiException(HttpStatus.FORBIDDEN, "Only the customer can initiate this payment");
        }

        return initiateMpesaPayment(request.rideId(), request.phoneNumber(), request.manualDistanceKm());
    }

    @Transactional
    public PaymentResponse promptCustomerMpesaPayment(Long rideId) {
        Ride ride = rideService.getRideById(rideId);
        User actor = currentUserService.getCurrentUser();
        boolean canPrompt = actor.getRole() == Role.ADMIN
            || actor.getRole() == Role.SUPPORT_AGENT
            || (ride.getRider() != null && ride.getRider().getId().equals(actor.getId()));
        if (!canPrompt) {
            throw new ApiException(HttpStatus.FORBIDDEN, "Only the assigned driver can prompt this M-Pesa payment");
        }
        if (ride.getPaymentType() != PaymentType.MPESA) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Only M-Pesa rides can be prompted for STK payment");
        }

        return initiateMpesaPayment(rideId, ride.getCustomer().getPhoneNumber(), null);
    }

    private PaymentResponse initiateMpesaPayment(Long rideId, String phoneNumber, BigDecimal manualDistanceKm) {
        RideResponse preparedRide = rideService.prepareForPayment(rideId, manualDistanceKm);
        Ride ride = rideService.getRideById(preparedRide.id());

        Payment payment = paymentRepository.findByRide(ride).orElse(new Payment());
        if (payment.getId() != null && payment.getStatus() == PaymentStatus.SUCCESS) {
            throw new ApiException(HttpStatus.CONFLICT, "Payment already completed for this ride");
        }

        payment.setRide(ride);
        payment.setAmount(ride.getFinalFare());
        payment.setPhoneNumber(normalizeMpesaPhoneNumber(phoneNumber));
        payment.setTransactionRef(payment.getTransactionRef() != null
            ? payment.getTransactionRef()
            : "MPESA-" + ride.getId() + "-" + Instant.now().toEpochMilli());
        payment.setStatus(PaymentStatus.PENDING);
        payment.setPaymentType(PaymentType.MPESA);

        MpesaStkPushResult stkResult = mpesaClient.initiateStkPush(
            payment.getPhoneNumber(),
            payment.getAmount().toPlainString(),
            payment.getTransactionRef()
        );
        payment.setProviderCheckoutRequestId(stkResult.checkoutRequestId());
        payment.setProviderMerchantRequestId(stkResult.merchantRequestId());
        payment.setProviderResponseCode(stkResult.responseCode());
        payment.setProviderResponseDescription(stkResult.responseDescription());

        if (!stkResult.success()) {
            payment.setStatus(PaymentStatus.FAILED);
            paymentRepository.save(payment);
            throw new ApiException(HttpStatus.BAD_REQUEST, stkResult.responseDescription());
        }

        Payment saved = paymentRepository.save(payment);
        domainEventPublisher.publishPaymentEvent(EventType.PAYMENT_INITIATED, saved);
        return toResponse(saved);
    }

    @Transactional
    public PaymentResponse handleMpesaCallback(MpesaCallbackRequest callback) {
        Payment payment = findPaymentForCallback(callback);
        boolean wasSuccess = payment.getStatus() == PaymentStatus.SUCCESS;

        payment.setProviderCheckoutRequestId(callback.checkoutRequestId());
        payment.setProviderMerchantRequestId(callback.merchantRequestId());
        payment.setProviderReceiptNumber(callback.mpesaReceiptNumber());
        payment.setProviderResponseCode(String.valueOf(callback.resultCode()));
        payment.setProviderResponseDescription(callback.resultDescription());
        payment.setCallbackPayload(callback.toString());
        payment.setStatus(callback.success() ? PaymentStatus.SUCCESS : PaymentStatus.FAILED);
        if (callback.success()) {
            payment.setCompletedAt(Instant.now());
        }
        Payment saved = paymentRepository.save(payment);
        domainEventPublisher.publishPaymentEvent(callback.success() ? EventType.PAYMENT_SUCCESSFUL : EventType.PAYMENT_FAILED, saved);

        if (callback.success() && !wasSuccess) {
            settleSuccessfulPayment(saved);
        }

        return toResponse(saved);
    }

    @Transactional
    public PaymentResponse approveCashPayment(Long rideId, BigDecimal manualDistanceKm) {
        Ride ride = rideService.getRideById(rideId);
        User actor = currentUserService.getCurrentUser();
        boolean canApprove = actor.getRole() == Role.ADMIN
            || actor.getRole() == Role.SUPPORT_AGENT
            || (ride.getRider() != null && ride.getRider().getId().equals(actor.getId()));
        if (!canApprove) {
            throw new ApiException(HttpStatus.FORBIDDEN, "Only the assigned driver can approve cash payment");
        }

        RideResponse preparedRide = rideService.prepareForPayment(rideId, manualDistanceKm);
        ride = rideService.getRideById(preparedRide.id());

        Payment payment = paymentRepository.findByRide(ride).orElse(new Payment());
        if (payment.getId() != null && payment.getStatus() == PaymentStatus.SUCCESS) {
            throw new ApiException(HttpStatus.CONFLICT, "Payment already completed for this ride");
        }

        payment.setRide(ride);
        payment.setAmount(ride.getFinalFare());
        payment.setPhoneNumber(ride.getCustomer().getPhoneNumber());
        payment.setTransactionRef(payment.getTransactionRef() != null
            ? payment.getTransactionRef()
            : "CASH-" + ride.getId() + "-" + Instant.now().toEpochMilli());
        payment.setStatus(PaymentStatus.SUCCESS);
        payment.setPaymentType(PaymentType.CASH);
        payment.setCompletedAt(Instant.now());

        Payment saved = paymentRepository.save(payment);
        domainEventPublisher.publishPaymentEvent(EventType.PAYMENT_SUCCESSFUL, saved);
        settleSuccessfulPayment(saved);
        return toResponse(saved);
    }

    @Transactional
    public PaymentResponse forceApprovePayment(Long rideId) {
        Ride ride = rideService.getRideById(rideId);
        User actor = currentUserService.getCurrentUser();
        if (actor.getRole() != Role.ADMIN && actor.getRole() != Role.SUPPORT_AGENT) {
            throw new ApiException(HttpStatus.FORBIDDEN, "Only support actors can force approve a payment");
        }

        Payment payment = paymentRepository.findByRide(ride).orElse(new Payment());
        if (payment.getId() != null && payment.getStatus() == PaymentStatus.SUCCESS) {
            return toResponse(payment);
        }

        payment.setRide(ride);
        payment.setAmount(ride.getFinalFare());
        payment.setPhoneNumber(ride.getCustomer().getPhoneNumber());
        payment.setPaymentType(ride.getPaymentType());
        payment.setTransactionRef(payment.getTransactionRef() != null
            ? payment.getTransactionRef()
            : "SUPPORT-" + ride.getId() + "-" + Instant.now().toEpochMilli());
        payment.setStatus(PaymentStatus.SUCCESS);
        payment.setProviderResponseDescription("Approved by support");
        payment.setCompletedAt(Instant.now());

        Payment saved = paymentRepository.save(payment);
        domainEventPublisher.publishPaymentEvent(EventType.PAYMENT_SUCCESSFUL, saved);
        settleSuccessfulPayment(saved);
        return toResponse(saved);
    }

    public PaymentResponse getByRideId(Long rideId) {
        Ride ride = rideService.getRideById(rideId);
        User actor = currentUserService.getCurrentUser();
        boolean canView = actor.getRole() == Role.ADMIN
            || actor.getRole() == Role.SUPPORT_AGENT
            || ride.getCustomer().getId().equals(actor.getId())
            || (ride.getRider() != null && ride.getRider().getId().equals(actor.getId()));
        if (!canView) {
            throw new ApiException(HttpStatus.FORBIDDEN, "Payment does not belong to the current user");
        }

        return paymentRepository.findByRide(ride)
            .map(this::toResponse)
            .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Payment not found"));
    }

    private Payment findPaymentForCallback(MpesaCallbackRequest callback) {
        if (callback.checkoutRequestId() != null) {
            return paymentRepository.findByProviderCheckoutRequestId(callback.checkoutRequestId())
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Payment transaction not found"));
        }
        if (callback.merchantRequestId() != null) {
            return paymentRepository.findByProviderMerchantRequestId(callback.merchantRequestId())
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Payment transaction not found"));
        }
        throw new ApiException(HttpStatus.BAD_REQUEST, "Missing checkout or merchant request identifier");
    }

    private void settleSuccessfulPayment(Payment payment) {
        Ride ride = payment.getRide();
        BigDecimal commissionRate = companyCommissionRate();
        BigDecimal commission = payment.getAmount().multiply(commissionRate).setScale(2, RoundingMode.HALF_UP);

        if (payment.getPaymentType() == PaymentType.MPESA) {
            driverWalletService.addEarnings(ride.getRider(), payment.getAmount().subtract(commission));
        } else {
            driverWalletService.deductCommission(ride.getRider(), commission);
        }

        rideService.markPaymentCompleted(ride.getId());
        if (payment.getPaymentType() == PaymentType.MPESA) {
            rideService.completeRideAfterPayment(ride.getId());
        }
    }

    private String normalizeMpesaPhoneNumber(String phoneNumber) {
        if (phoneNumber == null) {
            return null;
        }
        String normalized = phoneNumber.trim().replaceAll("\\s+", "");
        if (normalized.startsWith("+")) {
            normalized = normalized.substring(1);
        }
        if (normalized.startsWith("0")) {
            normalized = "254" + normalized.substring(1);
        }
        return normalized;
    }

    private BigDecimal companyCommissionRate() {
        PricingConfigurationSnapshot pricingConfiguration = adminSettingsService.getPricingConfiguration();
        if (pricingConfiguration != null && pricingConfiguration.companyCommissionRate() != null) {
            return pricingConfiguration.companyCommissionRate();
        }

        String configuredRate = adminSettingsService.getConfigValue(AdminSettingKey.COMPANY_COMMISSION_RATE.configKey());
        if (configuredRate == null || configuredRate.isBlank()) {
            configuredRate = AdminSettingKey.COMPANY_COMMISSION_RATE.defaultValue();
        }
        return new BigDecimal(configuredRate);
    }

    private PaymentResponse toResponse(Payment payment) {
        return new PaymentResponse(
            payment.getId(),
            payment.getRide().getId(),
            payment.getAmount(),
            payment.getPhoneNumber(),
            payment.getTransactionRef(),
            payment.getPaymentType(),
            payment.getStatus(),
            payment.getProviderCheckoutRequestId(),
            payment.getProviderMerchantRequestId(),
            payment.getProviderReceiptNumber(),
            payment.getProviderResponseCode(),
            payment.getProviderResponseDescription(),
            payment.getCreatedAt(),
            payment.getCompletedAt()
        );
    }
}
