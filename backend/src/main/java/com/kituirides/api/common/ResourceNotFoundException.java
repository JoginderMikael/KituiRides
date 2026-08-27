package com.kituirides.api.common;

import org.springframework.http.HttpStatus;

/**
 * Raised when a requested application resource does not exist.
 */
public class ResourceNotFoundException extends ApiException {

    public ResourceNotFoundException(String message) {
        super(HttpStatus.NOT_FOUND, message);
    }
}
