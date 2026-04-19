package com.kituirides.api.payment;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.kituirides.api.admin.AdminSettingsService;
import com.kituirides.api.domain.entity.Payment;
import com.kituirides.api.domain.entity.Ride;
import com.kituirides.api.domain.entity.User;
import com.kituirides.api.domain.enums.PaymentStatus;
import com.kituirides.api.domain.enums.PaymentType;
import com.kituirides.api.domain.enums.Role;
import com.kituirides.api.repository.PaymentRepository;
import com.kituirides.api.ride.RideService;
import com.kituirides.api.security.CurrentUserService;
import java.math.BigDecimal;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class PaymentServiceTest {

    @Mock private RideService rideService;
    @Mock private PaymentRepository paymentRepository;
    @Mock private MpesaClient mpesaClient;
    @Mock private DriverWalletService driverWalletService;
    @Mock private AdminSettingsService adminSettingsService;
    @Mock private CurrentUserService currentUserService;

    @Test
    void shouldForceApproveMpesaAndCreditDriverNetOfCommission() {
        PaymentService service = new PaymentService(
            rideService,
            paymentRepository,
            mpesaClient,
            driverWalletService,
            adminSettingsService,
            currentUserService
        );

        User support = new User();
        support.setId(10L);
        support.setRole(Role.SUPPORT_AGENT);

        User customer = new User();
        customer.setId(1L);
        customer.setPhoneNumber("254700000001");

        User driver = new User();
        driver.setId(2L);

        Ride ride = new Ride();
        ride.setId(77L);
        ride.setCustomer(customer);
        ride.setRider(driver);
        ride.setPaymentType(PaymentType.MPESA);
        ride.setFinalFare(new BigDecimal("1000.00"));

        when(currentUserService.getCurrentUser()).thenReturn(support);
        when(rideService.getRideById(77L)).thenReturn(ride);
        when(paymentRepository.findByRide(ride)).thenReturn(Optional.empty());
        when(paymentRepository.save(any(Payment.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(adminSettingsService.getConfigValue("COMPANY_COMMISSION_RATE")).thenReturn("0.20");

        PaymentResponse response = service.forceApprovePayment(77L);

        assertEquals(PaymentStatus.SUCCESS, response.status());
        assertEquals(PaymentType.MPESA, response.paymentType());
        verify(driverWalletService).addEarnings(driver, new BigDecimal("800.00"));
        verify(rideService).markPaymentCompleted(77L);
    }

    @Test
    void shouldForceApproveCashAndDeductCommission() {
        PaymentService service = new PaymentService(
            rideService,
            paymentRepository,
            mpesaClient,
            driverWalletService,
            adminSettingsService,
            currentUserService
        );

        User admin = new User();
        admin.setId(99L);
        admin.setRole(Role.ADMIN);

        User customer = new User();
        customer.setId(3L);
        customer.setPhoneNumber("254700000003");

        User driver = new User();
        driver.setId(4L);

        Ride ride = new Ride();
        ride.setId(78L);
        ride.setCustomer(customer);
        ride.setRider(driver);
        ride.setPaymentType(PaymentType.CASH);
        ride.setFinalFare(new BigDecimal("1000.00"));

        when(currentUserService.getCurrentUser()).thenReturn(admin);
        when(rideService.getRideById(78L)).thenReturn(ride);
        when(paymentRepository.findByRide(ride)).thenReturn(Optional.empty());
        when(paymentRepository.save(any(Payment.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(adminSettingsService.getConfigValue("COMPANY_COMMISSION_RATE")).thenReturn("0.20");

        PaymentResponse response = service.forceApprovePayment(78L);

        assertEquals(PaymentStatus.SUCCESS, response.status());
        assertEquals(PaymentType.CASH, response.paymentType());
        verify(driverWalletService).deductCommission(driver, new BigDecimal("200.00"));
        verify(rideService).markPaymentCompleted(78L);
    }
}
