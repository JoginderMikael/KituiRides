package com.kituirides.api;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

/**
 * Bootstraps the KituiRides backend application.
 */
@SpringBootApplication
@EnableScheduling
public class KituiRidesApplication {

    public static void main(String[] args) {
        SpringApplication.run(KituiRidesApplication.class, args);
    }
}
