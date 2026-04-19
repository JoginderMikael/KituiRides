package com.kituirides.api.driver.controller;

import com.kituirides.api.domain.entity.DriverWallet;
import com.kituirides.api.domain.entity.User;
import com.kituirides.api.payment.DriverWalletService;
import com.kituirides.api.repository.UserRepository;
import com.kituirides.api.security.JwtTokenProvider;
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

@Slf4j
@RestController
@RequestMapping("/api/wallet")
@RequiredArgsConstructor
public class WalletController {

    private final DriverWalletService walletService;
    private final JwtTokenProvider jwtTokenProvider;
    private final UserRepository userRepository;

    /**
     * Get driver's wallet details
     */
    @GetMapping("/my-wallet")
    @PreAuthorize("hasRole('DRIVER')")
    public ResponseEntity<DriverWallet> getWallet(@RequestHeader("Authorization") String token) {
        Long driverId = extractUserIdFromToken(token);
        User driver = userRepository.findById(driverId)
                .orElseThrow(() -> new IllegalArgumentException("Driver not found"));
        
        DriverWallet wallet = walletService.getWalletDetails(driver);
        return ResponseEntity.ok(wallet);
    }

    /**
     * Get wallet balance
     */
    @GetMapping("/my-wallet/balance")
    @PreAuthorize("hasRole('DRIVER')")
    public ResponseEntity<BigDecimal> getBalance(@RequestHeader("Authorization") String token) {
        Long driverId = extractUserIdFromToken(token);
        User driver = userRepository.findById(driverId)
                .orElseThrow(() -> new IllegalArgumentException("Driver not found"));
        
        BigDecimal balance = walletService.getWalletBalance(driver);
        return ResponseEntity.ok(balance);
    }

    /**
     * Get total earnings
     */
    @GetMapping("/my-wallet/total-earnings")
    @PreAuthorize("hasRole('DRIVER')")
    public ResponseEntity<BigDecimal> getTotalEarnings(@RequestHeader("Authorization") String token) {
        Long driverId = extractUserIdFromToken(token);
        User driver = userRepository.findById(driverId)
                .orElseThrow(() -> new IllegalArgumentException("Driver not found"));
        
        BigDecimal totalEarnings = walletService.getTotalEarnings(driver);
        return ResponseEntity.ok(totalEarnings);
    }

    /**
     * Request withdrawal
     */
    @PostMapping("/withdrawal")
    @PreAuthorize("hasRole('DRIVER')")
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
     * Extract user ID from JWT token
     */
    private Long extractUserIdFromToken(String token) {
        String jwt = token.replace("Bearer ", "");
        return jwtTokenProvider.getUserIdFromToken(jwt);
    }

    // DTOs
    public static class WithdrawalRequest {
        private BigDecimal amount;

        public BigDecimal getAmount() {
            return amount;
        }

        public void setAmount(BigDecimal amount) {
            this.amount = amount;
        }
    }

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
