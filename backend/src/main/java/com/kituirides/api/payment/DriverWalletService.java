package com.kituirides.api.payment;

import com.kituirides.api.domain.entity.DriverWallet;
import com.kituirides.api.domain.entity.RiderProfile;
import com.kituirides.api.domain.entity.User;
import com.kituirides.api.repository.DriverWalletRepository;
import com.kituirides.api.repository.RiderProfileRepository;
import java.math.BigDecimal;
import java.time.Instant;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Slf4j
@Service
@RequiredArgsConstructor
public class DriverWalletService {

    private final DriverWalletRepository walletRepository;
    private final RiderProfileRepository riderProfileRepository;

    /**
     * Get or create driver wallet
     */
    public DriverWallet getOrCreateWallet(User driver) {
        RiderProfile riderProfile = riderProfileRepository.findByUser(driver)
                .orElseThrow(() -> new IllegalArgumentException("Driver profile not found"));

        return walletRepository.findByDriver(riderProfile)
                .orElseGet(() -> createWallet(riderProfile));
    }

    /**
     * Create new wallet for driver
     */
    private DriverWallet createWallet(RiderProfile driver) {
        DriverWallet wallet = new DriverWallet();
        wallet.setDriver(driver);
        wallet.setBalance(BigDecimal.ZERO);
        wallet.setTotalEarned(BigDecimal.ZERO);
        wallet.setTotalWithdrawn(BigDecimal.ZERO);
        wallet.setCreatedAt(Instant.now());
        wallet.setUpdatedAt(Instant.now());
        return walletRepository.save(wallet);
    }

    /**
     * Add earnings to driver wallet
     */
    @Transactional
    public void addEarnings(User driver, BigDecimal amount) {
        DriverWallet wallet = getOrCreateWallet(driver);
        wallet.setBalance(wallet.getBalance().add(amount));
        wallet.setTotalEarned(wallet.getTotalEarned().add(amount));
        wallet.setUpdatedAt(Instant.now());
        walletRepository.save(wallet);
        log.info("Added earnings {} to driver {} wallet", amount, driver.getId());
    }

    /**
     * Deduct commission from driver wallet
     */
    @Transactional
    public void deductCommission(User driver, BigDecimal commission) {
        DriverWallet wallet = getOrCreateWallet(driver);
        BigDecimal newBalance = wallet.getBalance().subtract(commission);
        if (newBalance.compareTo(BigDecimal.ZERO) < 0) {
            log.warn("Driver {} wallet balance negative after commission deduction", driver.getId());
        }
        wallet.setBalance(newBalance);
        wallet.setUpdatedAt(Instant.now());
        walletRepository.save(wallet);
        log.info("Deducted commission {} from driver {} wallet", commission, driver.getId());
    }

    /**
     * Process withdrawal from driver wallet
     */
    @Transactional
    public void processWithdrawal(User driver, BigDecimal amount) {
        DriverWallet wallet = getOrCreateWallet(driver);
        
        if (wallet.getBalance().compareTo(amount) < 0) {
            throw new IllegalArgumentException("Insufficient balance for withdrawal");
        }

        wallet.setBalance(wallet.getBalance().subtract(amount));
        wallet.setTotalWithdrawn(wallet.getTotalWithdrawn().add(amount));
        wallet.setUpdatedAt(Instant.now());
        walletRepository.save(wallet);
        log.info("Processed withdrawal {} from driver {} wallet", amount, driver.getId());
    }

    /**
     * Get driver wallet balance
     */
    public BigDecimal getWalletBalance(User driver) {
        return getOrCreateWallet(driver).getBalance();
    }

    /**
     * Get driver total earnings
     */
    public BigDecimal getTotalEarnings(User driver) {
        return getOrCreateWallet(driver).getTotalEarned();
    }

    /**
     * Get driver wallet details
     */
    public DriverWallet getWalletDetails(User driver) {
        return getOrCreateWallet(driver);
    }
}
