package com.kituirides.api.driver.controller;

import com.kituirides.api.domain.entity.Document;
import com.kituirides.api.domain.enums.DocumentStatus;
import com.kituirides.api.domain.enums.DocumentType;
import com.kituirides.api.driver.DocumentService;
import com.kituirides.api.security.JwtTokenProvider;
import java.util.List;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@Slf4j
@RestController
@RequestMapping("/api/documents")
@RequiredArgsConstructor
public class DocumentController {

    private final DocumentService documentService;
    private final JwtTokenProvider jwtTokenProvider;

    /**
     * Upload driver document
     */
    @PostMapping("/upload")
    @PreAuthorize("hasAnyRole('DRIVER')")
    public ResponseEntity<Document> uploadDocument(
            @RequestHeader("Authorization") String token,
            @RequestBody UploadDocumentRequest request) {
        
        Long driverId = extractUserIdFromToken(token);
        Document document = documentService.uploadDocument(
                driverId,
                request.getDocumentType(),
                request.getFilePath(),
                request.getFileUrl()
        );
        
        return ResponseEntity.ok(document);
    }

    /**
     * Get driver's documents
     */
    @GetMapping("/my-documents")
    @PreAuthorize("hasAnyRole('DRIVER')")
    public ResponseEntity<List<Document>> getMyDocuments(@RequestHeader("Authorization") String token) {
        Long driverId = extractUserIdFromToken(token);
        List<Document> documents = documentService.getDriverDocuments(driverId);
        return ResponseEntity.ok(documents);
    }

    /**
     * Get driver's pending documents
     */
    @GetMapping("/my-documents/pending")
    @PreAuthorize("hasAnyRole('DRIVER')")
    public ResponseEntity<List<Document>> getMyPendingDocuments(@RequestHeader("Authorization") String token) {
        Long driverId = extractUserIdFromToken(token);
        List<Document> documents = documentService.getDriverDocumentsByStatus(driverId, DocumentStatus.PENDING);
        return ResponseEntity.ok(documents);
    }

    /**
     * Get specific document
     */
    @GetMapping("/{documentId}")
    @PreAuthorize("hasAnyRole('DRIVER', 'ADMIN')")
    public ResponseEntity<Document> getDocument(@PathVariable Long documentId) {
        Document document = documentService.getDocument(documentId);
        return ResponseEntity.ok(document);
    }

    /**
     * Delete pending document
     */
    @DeleteMapping("/{documentId}")
    @PreAuthorize("hasAnyRole('DRIVER')")
    public ResponseEntity<Void> deleteDocument(@PathVariable Long documentId) {
        documentService.deleteDocument(documentId);
        return ResponseEntity.ok().build();
    }

    /**
     * Admin: Get all pending documents for review
     */
    @GetMapping("/admin/pending")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<List<Document>> getPendingDocuments() {
        List<Document> documents = documentService.getPendingDocuments();
        return ResponseEntity.ok(documents);
    }

    /**
     * Admin: Approve document
     */
    @PutMapping("/admin/{documentId}/approve")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Document> approveDocument(
            @PathVariable Long documentId,
            @RequestHeader("Authorization") String token) {
        
        Long adminId = extractUserIdFromToken(token);
        Document document = documentService.approveDocument(documentId, adminId);
        
        return ResponseEntity.ok(document);
    }

    /**
     * Admin: Reject document
     */
    @PutMapping("/admin/{documentId}/reject")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Document> rejectDocument(
            @PathVariable Long documentId,
            @RequestHeader("Authorization") String token,
            @RequestBody RejectDocumentRequest request) {
        
        Long adminId = extractUserIdFromToken(token);
        Document document = documentService.rejectDocument(documentId, adminId, request.getRejectionReason());
        
        return ResponseEntity.ok(document);
    }

    /**
     * Check if driver has all required documents
     */
    @GetMapping("/driver/{driverId}/verification-status")
    @PreAuthorize("hasAnyRole('ADMIN', 'DRIVER')")
    public ResponseEntity<VerificationStatus> getVerificationStatus(@PathVariable Long driverId) {
        boolean hasAllDocuments = documentService.hasAllRequiredDocumentsApproved(driverId);
        boolean hasVehicleDocuments = documentService.hasVehicleDocuments(driverId);
        
        VerificationStatus status = new VerificationStatus(hasAllDocuments, hasVehicleDocuments);
        return ResponseEntity.ok(status);
    }

    /**
     * Extract user ID from JWT token
     */
    private Long extractUserIdFromToken(String token) {
        String jwt = token.replace("Bearer ", "");
        return jwtTokenProvider.getUserIdFromToken(jwt);
    }

    // DTOs
    public static class UploadDocumentRequest {
        private DocumentType documentType;
        private String filePath;
        private String fileUrl;

        public DocumentType getDocumentType() {
            return documentType;
        }

        public void setDocumentType(DocumentType documentType) {
            this.documentType = documentType;
        }

        public String getFilePath() {
            return filePath;
        }

        public void setFilePath(String filePath) {
            this.filePath = filePath;
        }

        public String getFileUrl() {
            return fileUrl;
        }

        public void setFileUrl(String fileUrl) {
            this.fileUrl = fileUrl;
        }
    }

    public static class RejectDocumentRequest {
        private String rejectionReason;

        public String getRejectionReason() {
            return rejectionReason;
        }

        public void setRejectionReason(String rejectionReason) {
            this.rejectionReason = rejectionReason;
        }
    }

    public static class VerificationStatus {
        private boolean hasAllPersonalDocuments;
        private boolean hasVehicleDocuments;

        public VerificationStatus(boolean hasAllPersonalDocuments, boolean hasVehicleDocuments) {
            this.hasAllPersonalDocuments = hasAllPersonalDocuments;
            this.hasVehicleDocuments = hasVehicleDocuments;
        }

        public boolean isHasAllPersonalDocuments() {
            return hasAllPersonalDocuments;
        }

        public void setHasAllPersonalDocuments(boolean hasAllPersonalDocuments) {
            this.hasAllPersonalDocuments = hasAllPersonalDocuments;
        }

        public boolean isHasVehicleDocuments() {
            return hasVehicleDocuments;
        }

        public void setHasVehicleDocuments(boolean hasVehicleDocuments) {
            this.hasVehicleDocuments = hasVehicleDocuments;
        }
    }
}
