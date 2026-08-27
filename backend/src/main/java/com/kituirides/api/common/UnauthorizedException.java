package com.kituirides.api.common;

import org.springframework.http.HttpStatus;

/**
 * Raised when request authentication is missing or invalid.
 */
public class UnauthorizedException extends ApiException {

    public UnauthorizedException(String message) {
        super(HttpStatus.UNAUTHORIZED, message);
    }
}
