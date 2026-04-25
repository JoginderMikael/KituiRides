package com.kituirides.api.driver.controller;

import com.kituirides.api.domain.entity.DriverWallet;
import com.kituirides.api.domain.entity.User;
import com.kituirides.api.payment.DriverWalletService;
import com.kituirides.api.repository.UserRepository;
import com.kituirides.api.security.JwtTokenProvider;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.math.BigDecimal;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Exposes driver wallet balance, earnings, and withdrawal endpoints.
 */
@Slf4j
@RestController
@RequestMapping("/api/wallet")
@RequiredArgsConstructor
@Tag(name = "Wallet", description = "Driver wallet and withdrawal endpoints")
public class WalletController {

    private final DriverWalletService walletService;
    private final JwtTokenProvider jwtTokenProvider;
    private final UserRepository userRepository;

    /**
     * Returns the authenticated driver's wallet details.
     *
     * @param token bearer token containing the authenticated driver identity
     * @return the driver's wallet record
     */
    @GetMapping("/my-wallet")
    @PreAuthorize("hasRole('DRIVER')")
    @SecurityRequirement(name = "bearerAuth")
    @Operation(summary = "Get wallet details", description = "Returns the authenticated driver's wallet information.")
    public ResponseEntity<DriverWallet> getWallet(@RequestHeader("Authorization") String token) {
        Long driverId = extractUserIdFromToken(token);
        User driver = userRepository.findById(driverId)
                .orElseThrow(() -> new IllegalArgumentException("Driver not found"));
        
        DriverWallet wallet = walletService.getWalletDetails(driver);
        return ResponseEntity.ok(wallet);
    }

    /**
     * Returns the authenticated driver's current wallet balance.
     *
     * @param token bearer token containing the authenticated driver identity
     * @return the current wallet balance
     */
    @GetMapping("/my-wallet/balance")
    @PreAuthorize("hasRole('DRIVER')")
    @SecurityRequirement(name = "bearerAuth")
    @Operation(summary = "Get wallet balance", description = "Returns the current available wallet balance for the authenticated driver.")
    public ResponseEntity<BigDecimal> getBalance(@RequestHeader("Authorization") String token) {
        Long driverId = extractUserIdFromToken(token);
        User driver = userRepository.findById(driverId)
                .orElseThrow(() -> new IllegalArgumentException("Driver not found"));
        
        BigDecimal balance = walletService.getWalletBalance(driver);
        return ResponseEntity.ok(balance);
    }

    /**
     * Returns the authenticated driver's total lifetime earnings.
     *
     * @param token bearer token containing the authenticated driver identity
     * @return the total recorded earnings
     */
    @GetMapping("/my-wallet/total-earnings")
    @PreAuthorize("hasRole('DRIVER')")
    @SecurityRequirement(name = "bearerAuth")
    @Operation(summary = "Get total earnings", description = "Returns the total earnings accumulated by the authenticated driver.")
    public ResponseEntity<BigDecimal> getTotalEarnings(@RequestHeader("Authorization") String token) {
        Long driverId = extractUserIdFromToken(token);
        User driver = userRepository.findById(driverId)
                .orElseThrow(() -> new IllegalArgumentException("Driver not found"));
        
        BigDecimal totalEarnings = walletService.getTotalEarnings(driver);
        return ResponseEntity.ok(totalEarnings);
    }

    /**
     * Processes a driver withdrawal request.
     *
     * @param token bearer token containing the authenticated driver identity
     * @param request withdrawal payload with the requested amount
     * @return the withdrawal result including remaining balance
     */
    @PostMapping("/withdrawal")
    @PreAuthorize("hasRole('DRIVER')")
    @SecurityRequirement(name = "bearerAuth")
    @Operation(summary = "Request a withdrawal", description = "Attempts to withdraw funds from the authenticated driver's wallet.")
    public ResponseEntity<WithdrawalResponse> requestWithdrawal(
            @RequestHeader("Authorization") String token,
            @RequestBody WithdrawalRequest request) {
        
        Long driverId = extractUserIdFromToken(token);
        User driver = userRepository.findById(driverId)
                .orElseThrow(() -> new IllegalArgumentException("Driver not found"));
        
        try {
            walletService.processWithdrawal(driver, request.getAmount());
            DriverWallet wallet = walletService.getWalletDetails(driver);
            
            return ResponseEntity.ok(new WithdrawalResponse(
                    "Withdrawal processed successfully",
                    request.getAmount(),
                    wallet.getBalance()
            ));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest()
                    .body(new WithdrawalResponse(e.getMessage(), null, null));
        }
    }

    /**
     * Extracts a user identifier from a bearer token.
     *
     * @param token authorization header value
     * @return the authenticated user identifier
     */
    private Long extractUserIdFromToken(String token) {
        String jwt = token.replace("Bearer ", "");
        return jwtTokenProvider.getUserIdFromToken(jwt);
    }

    /**
     * Request payload used when a driver requests a wallet withdrawal.
     */
    public static class WithdrawalRequest {
        private BigDecimal amount;

        public BigDecimal getAmount() {
            return amount;
        }

        public void setAmount(BigDecimal amount) {
            this.amount = amount;
        }
    }

    /**
     * Response payload returned after a wallet withdrawal attempt.
     */
    public static class WithdrawalResponse {
        private String message;
        private BigDecimal amount;
        private BigDecimal remainingBalance;

        public WithdrawalResponse(String message, BigDecimal amount, BigDecimal remainingBalance) {
            this.message = message;
            this.amount = amount;
            this.remainingBalance = remainingBalance;
        }

        public String getMessage() {
            return message;
        }

        public void setMessage(String message) {
            this.message = message;
        }

        public BigDecimal getAmount() {
            return amount;
        }

        public void setAmount(BigDecimal amount) {
            this.amount = amount;
        }

        public BigDecimal getRemainingBalance() {
            return remainingBalance;
        }

        public void setRemainingBalance(BigDecimal remainingBalance) {
            this.remainingBalance = remainingBalance;
        }
    }
}
