package com.kituirides.api.common.controller;

import com.kituirides.api.common.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.Map;
import java.util.Objects;
import java.util.UUID;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

/**
 * Exposes file upload endpoints for client-provided assets and documents.
 */
@RestController
@RequestMapping("/api/upload")
@Tag(name = "Files", description = "Multipart file upload endpoints")
public class FileController {

    @Value("${file.upload.dir:uploads}")
    private String uploadDir;

    @PostMapping
    @Operation(
        summary = "Upload a file",
        description = "Stores an uploaded file and returns both the public URL and the absolute file path."
    )
    public ResponseEntity<ApiResponse<?>> uploadFile(@RequestParam("file") MultipartFile file) {
        if (file.isEmpty()) {
            return ResponseEntity.badRequest().body(ApiResponse.fail("File is empty"));
        }

        try {
            Path path = Paths.get(uploadDir).toAbsolutePath().normalize();
            Files.createDirectories(path);

            String originalFilename = StringUtils.cleanPath(
                Objects.requireNonNullElse(file.getOriginalFilename(), "upload")
            );
            String safeFileName = Paths.get(originalFilename).getFileName().toString().replaceAll("[\\r\\n]", "_");
            String fileName = UUID.randomUUID() + "_" + safeFileName;
            Path filePath = path.resolve(fileName);
            Files.copy(file.getInputStream(), filePath, StandardCopyOption.REPLACE_EXISTING);

            String fileUrl = "/uploads/" + fileName;
            return ResponseEntity.ok(ApiResponse.ok(Map.of(
                "fileUrl", fileUrl,
                "filePath", filePath.toString()
            )));
        } catch (IOException e) {
            return ResponseEntity.status(500).body(ApiResponse.fail("Failed to upload file: " + e.getMessage()));
        }
    }
}
