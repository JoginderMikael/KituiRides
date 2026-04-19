package com.kituirides.api.security;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import java.nio.charset.StandardCharsets;
import java.util.Date;
import javax.crypto.SecretKey;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;


/**
 * JWT Token Provider for generating and validating JWT tokens
 */
@Slf4j
@Component
public class JwtTokenProvider {

    @Value("${jwt.secret:replace-with-at-least-32-random-characters}")
    private String jwtSecret;

    @Value("${jwt.expiration:86400000}")  // 24 hours in milliseconds
    private long jwtExpirationMs;

    /**
     * Generate JWT token for a user
     */
    public String generateToken(Long userId, String email, String role) {
        return Jwts.builder()
                .subject(String.valueOf(userId))
                .claim("email", email)
                .claim("role", role)
                .issuedAt(new Date())
                .expiration(new Date(System.currentTimeMillis() + jwtExpirationMs))
                .signWith(getSigningKey())
                .compact();
    }

    /**
     * Extract user ID from JWT token
     */
    public Long getUserIdFromToken(String token) {
        try {
            Claims claims = Jwts.parser()
                    .verifyWith(getSigningKey())
                    .build()
                    .parseSignedClaims(token)
                    .getPayload();
            
            String subject = claims.getSubject();
            return Long.parseLong(subject);
        } catch (Exception e) {
            log.error("Error extracting user ID from token", e);
            throw new IllegalArgumentException("Invalid JWT token");
        }
    }

    /**
     * Extract email from JWT token
     */
    public String getEmailFromToken(String token) {
        try {
            Claims claims = Jwts.parser()
                    .verifyWith(getSigningKey())
                    .build()
                    .parseSignedClaims(token)
                    .getPayload();
            
            return claims.get("email", String.class);
        } catch (Exception e) {
            log.error("Error extracting email from token", e);
            throw new IllegalArgumentException("Invalid JWT token");
        }
    }

    /**
     * Extract role from JWT token
     */
    public String getRoleFromToken(String token) {
        try {
            Claims claims = Jwts.parser()
                    .verifyWith(getSigningKey())
                    .build()
                    .parseSignedClaims(token)
                    .getPayload();
            
            return claims.get("role", String.class);
        } catch (Exception e) {
            log.error("Error extracting role from token", e);
            throw new IllegalArgumentException("Invalid JWT token");
        }
    }

    /**
     * Validate JWT token
     */
    public boolean validateToken(String token) {
        try {
            Jwts.parser()
                    .verifyWith(getSigningKey())
                    .build()
                    .parseSignedClaims(token);
            return true;
        } catch (Exception e) {
            log.error("JWT token validation failed: {}", e.getMessage());
            return false;
        }
    }

    /**
     * Check if token is expired
     */
    public boolean isTokenExpired(String token) {
        try {
            Claims claims = Jwts.parser()
                    .verifyWith(getSigningKey())
                    .build()
                    .parseSignedClaims(token)
                    .getPayload();
            
            return claims.getExpiration().before(new Date());
        } catch (Exception e) {
            log.error("Error checking token expiration", e);
            return true;
        }
    }

    /**
     * Get signing key for JWT
     */
    private SecretKey getSigningKey() {
        return Keys.hmacShaKeyFor(jwtSecret.getBytes(StandardCharsets.UTF_8));
    }
}
