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

/**
 * Handles driver wallet workflows.
 */
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
        settleOutstandingCommission(wallet);
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
        BigDecimal remainingCommission = commission;
        if (wallet.getBalance().compareTo(BigDecimal.ZERO) > 0) {
            BigDecimal deducted = wallet.getBalance().min(commission);
            wallet.setBalance(wallet.getBalance().subtract(deducted));
            remainingCommission = commission.subtract(deducted);
        }
        if (remainingCommission.compareTo(BigDecimal.ZERO) > 0) {
            wallet.setOutstandingCommission(wallet.getOutstandingCommission().add(remainingCommission));
        }
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

        if (wallet.getOutstandingCommission().compareTo(BigDecimal.ZERO) > 0) {
            throw new IllegalArgumentException("Outstanding commission must be settled before withdrawal");
        }
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

    @Transactional
    public void settleOutstandingCommission(User driver, BigDecimal amount) {
        DriverWallet wallet = getOrCreateWallet(driver);
        if (amount.compareTo(BigDecimal.ZERO) <= 0) {
            throw new IllegalArgumentException("Settlement amount must be greater than zero");
        }
        if (wallet.getBalance().compareTo(amount) < 0) {
            throw new IllegalArgumentException("Insufficient wallet balance to settle commission");
        }
        if (wallet.getOutstandingCommission().compareTo(BigDecimal.ZERO) <= 0) {
            return;
        }

        BigDecimal settlement = amount.min(wallet.getOutstandingCommission());
        wallet.setBalance(wallet.getBalance().subtract(settlement));
        wallet.setOutstandingCommission(wallet.getOutstandingCommission().subtract(settlement));
        wallet.setUpdatedAt(Instant.now());
        walletRepository.save(wallet);
    }

    private void settleOutstandingCommission(DriverWallet wallet) {
        if (wallet.getOutstandingCommission().compareTo(BigDecimal.ZERO) <= 0
            || wallet.getBalance().compareTo(BigDecimal.ZERO) <= 0) {
            return;
        }
        BigDecimal settlement = wallet.getBalance().min(wallet.getOutstandingCommission());
        wallet.setBalance(wallet.getBalance().subtract(settlement));
        wallet.setOutstandingCommission(wallet.getOutstandingCommission().subtract(settlement));
    }
}
