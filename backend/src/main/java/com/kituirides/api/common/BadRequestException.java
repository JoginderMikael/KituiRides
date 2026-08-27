package com.kituirides.api.common;

import org.springframework.http.HttpStatus;

/**
 * Raised when a request is syntactically valid but cannot be accepted.
 */
public class BadRequestException extends ApiException {

    public BadRequestException(String message) {
        super(HttpStatus.BAD_REQUEST, message);
    }
}
