package com.kituirides.api.location;

import com.fasterxml.jackson.databind.JsonNode;
import com.kituirides.api.common.ApiException;
import java.util.Locale;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

/**
 * Calls Google Directions from the server so browser clients are not blocked by CORS.
 */
@Slf4j
@Service
public class DirectionsService {

    private final RestClient restClient;
    private final String apiKey;

    public DirectionsService(
        RestClient.Builder restClientBuilder,
        @Value("${app.google-maps.base-url:https://maps.googleapis.com}") String baseUrl,
        @Value("${app.google-maps.server-api-key:}") String apiKey
    ) {
        this.restClient = restClientBuilder.baseUrl(baseUrl).build();
        this.apiKey = apiKey == null ? "" : apiKey.trim();
    }

    public DirectionsRouteResponse route(double originLat, double originLng, double destinationLat, double destinationLng) {
        validateCoordinate(originLat, originLng, "origin");
        validateCoordinate(destinationLat, destinationLng, "destination");
        if (apiKey.isBlank() || apiKey.startsWith("replace-with-")) {
            log.warn("Google Directions is unavailable because app.google-maps.server-api-key is not configured");
            return new DirectionsRouteResponse(null);
        }

        try {
            JsonNode response = restClient.get()
                .uri(uriBuilder -> uriBuilder
                    .path("/maps/api/directions/json")
                    .queryParam("origin", coordinate(originLat, originLng))
                    .queryParam("destination", coordinate(destinationLat, destinationLng))
                    .queryParam("mode", "driving")
                    .queryParam("key", apiKey)
                    .build())
                .retrieve()
                .body(JsonNode.class);
            if (response == null || !"OK".equals(response.path("status").asText())) {
                log.warn("Google Directions returned status {}", response == null ? "EMPTY_RESPONSE" : response.path("status").asText());
                return new DirectionsRouteResponse(null);
            }
            String encodedPolyline = response.path("routes").path(0).path("overview_polyline").path("points").asText("");
            return new DirectionsRouteResponse(encodedPolyline.isBlank() ? null : encodedPolyline);
        } catch (RestClientException exception) {
            log.warn("Google Directions request failed: {}", exception.getMessage());
            return new DirectionsRouteResponse(null);
        }
    }

    private void validateCoordinate(double latitude, double longitude, String label) {
        if (!Double.isFinite(latitude) || !Double.isFinite(longitude)
            || latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180
            || (latitude == 0 && longitude == 0)) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Invalid " + label + " coordinates");
        }
    }

    private String coordinate(double latitude, double longitude) {
        return String.format(Locale.ROOT, "%s,%s", latitude, longitude);
    }
}
