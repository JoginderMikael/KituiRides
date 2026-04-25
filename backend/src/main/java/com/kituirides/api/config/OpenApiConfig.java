package com.kituirides.api.config;

import io.swagger.v3.oas.annotations.OpenAPIDefinition;
import io.swagger.v3.oas.annotations.enums.SecuritySchemeType;
import io.swagger.v3.oas.annotations.info.Contact;
import io.swagger.v3.oas.annotations.info.Info;
import io.swagger.v3.oas.annotations.security.SecurityScheme;
import org.springframework.context.annotation.Configuration;

/**
 * Declares the top-level OpenAPI metadata and JWT bearer authentication scheme.
 */
@Configuration
@OpenAPIDefinition(
    info = @Info(
        title = "KituiRides API",
        version = "v1",
        description = "Interactive API documentation for KituiRides backend services.",
        contact = @Contact(name = "KituiRides")
    )
)
@SecurityScheme(
    name = "bearerAuth",
    type = SecuritySchemeType.HTTP,
    scheme = "bearer",
    bearerFormat = "JWT"
)
public class OpenApiConfig {
}
