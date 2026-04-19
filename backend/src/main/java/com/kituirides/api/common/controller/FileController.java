package com.kituirides.api.common.controller;

import com.kituirides.api.common.ApiResponse;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.Map;
import java.util.UUID;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/upload")
public class FileController {

    private final String uploadDir = "uploads";

    @PostMapping
    public ResponseEntity<ApiResponse<?>> uploadFile(@RequestParam("file") MultipartFile file) {
        if (file.isEmpty()) {
            return ResponseEntity.badRequest().body(ApiResponse.fail("File is empty"));
        }

        try {
            Path path = Paths.get(uploadDir);
            if (!Files.exists(path)) {
                Files.createDirectories(path);
            }

            String fileName = UUID.randomUUID() + "_" + file.getOriginalFilename();
            Path filePath = path.resolve(fileName);
            Files.copy(file.getInputStream(), filePath);

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
