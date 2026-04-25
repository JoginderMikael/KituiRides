package com.kituirides.api.driver.controller;

import com.kituirides.api.domain.entity.Document;
import com.kituirides.api.domain.enums.DocumentStatus;
import com.kituirides.api.domain.enums.DocumentType;
import com.kituirides.api.driver.DocumentService;
import com.kituirides.api.security.JwtTokenProvider;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
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

/**
 * Exposes driver document upload and administrative verification endpoints.
 */
@Slf4j
@RestController
@RequestMapping("/api/documents")
@RequiredArgsConstructor
@Tag(name = "Documents", description = "Driver document upload and verification endpoints")
public class DocumentController {

    private final DocumentService documentService;
    private final JwtTokenProvider jwtTokenProvider;

    /**
     * Uploads a document for the authenticated driver.
     *
     * @param token bearer token containing the authenticated driver identity
     * @param request document metadata and file location payload
     * @return the stored document record
     */
    @PostMapping("/upload")
    @PreAuthorize("hasAnyRole('DRIVER')")
    @SecurityRequirement(name = "bearerAuth")
    @Operation(summary = "Upload a document", description = "Stores a driver document and associates it with the authenticated driver.")
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
     * Returns all documents belonging to the authenticated driver.
     *
     * @param token bearer token containing the authenticated driver identity
     * @return the driver's document list
     */
    @GetMapping("/my-documents")
    @PreAuthorize("hasAnyRole('DRIVER')")
    @SecurityRequirement(name = "bearerAuth")
    @Operation(summary = "List my documents", description = "Returns every uploaded document for the authenticated driver.")
    public ResponseEntity<List<Document>> getMyDocuments(@RequestHeader("Authorization") String token) {
        Long driverId = extractUserIdFromToken(token);
        List<Document> documents = documentService.getDriverDocuments(driverId);
        return ResponseEntity.ok(documents);
    }

    /**
     * Returns pending documents for the authenticated driver.
     *
     * @param token bearer token containing the authenticated driver identity
     * @return the driver's pending documents
     */
    @GetMapping("/my-documents/pending")
    @PreAuthorize("hasAnyRole('DRIVER')")
    @SecurityRequirement(name = "bearerAuth")
    @Operation(summary = "List my pending documents", description = "Returns only the authenticated driver's pending documents.")
    public ResponseEntity<List<Document>> getMyPendingDocuments(@RequestHeader("Authorization") String token) {
        Long driverId = extractUserIdFromToken(token);
        List<Document> documents = documentService.getDriverDocumentsByStatus(driverId, DocumentStatus.PENDING);
        return ResponseEntity.ok(documents);
    }

    /**
     * Returns a single document by identifier.
     *
     * @param documentId document identifier
     * @return the requested document
     */
    @GetMapping("/{documentId}")
    @PreAuthorize("hasAnyRole('DRIVER', 'ADMIN')")
    @SecurityRequirement(name = "bearerAuth")
    @Operation(summary = "Get a document", description = "Returns a specific document for driver or admin review.")
    public ResponseEntity<Document> getDocument(@PathVariable Long documentId) {
        Document document = documentService.getDocument(documentId);
        return ResponseEntity.ok(document);
    }

    /**
     * Deletes a pending document.
     *
     * @param documentId document identifier
     * @return an empty success response
     */
    @DeleteMapping("/{documentId}")
    @PreAuthorize("hasAnyRole('DRIVER')")
    @SecurityRequirement(name = "bearerAuth")
    @Operation(summary = "Delete a document", description = "Deletes a pending document owned by the authenticated driver.")
    public ResponseEntity<Void> deleteDocument(@PathVariable Long documentId) {
        documentService.deleteDocument(documentId);
        return ResponseEntity.ok().build();
    }

    /**
     * Returns all pending documents awaiting administrator review.
     *
     * @return the pending document queue
     */
    @GetMapping("/admin/pending")
    @PreAuthorize("hasRole('ADMIN')")
    @SecurityRequirement(name = "bearerAuth")
    @Operation(summary = "List pending documents", description = "Returns every document currently awaiting administrative verification.")
    public ResponseEntity<List<Document>> getPendingDocuments() {
        List<Document> documents = documentService.getPendingDocuments();
        return ResponseEntity.ok(documents);
    }

    /**
     * Approves a document on behalf of an administrator.
     *
     * @param documentId document identifier
     * @param token bearer token containing the authenticated administrator identity
     * @return the approved document record
     */
    @PutMapping("/admin/{documentId}/approve")
    @PreAuthorize("hasRole('ADMIN')")
    @SecurityRequirement(name = "bearerAuth")
    @Operation(summary = "Approve a document", description = "Approves a pending driver document as an administrator.")
    public ResponseEntity<Document> approveDocument(
            @PathVariable Long documentId,
            @RequestHeader("Authorization") String token) {
        
        Long adminId = extractUserIdFromToken(token);
        Document document = documentService.approveDocument(documentId, adminId);
        
        return ResponseEntity.ok(document);
    }

    /**
     * Rejects a document on behalf of an administrator.
     *
     * @param documentId document identifier
     * @param token bearer token containing the authenticated administrator identity
     * @param request rejection payload containing the reason
     * @return the rejected document record
     */
    @PutMapping("/admin/{documentId}/reject")
    @PreAuthorize("hasRole('ADMIN')")
    @SecurityRequirement(name = "bearerAuth")
    @Operation(summary = "Reject a document", description = "Rejects a pending driver document and stores the rejection reason.")
    public ResponseEntity<Document> rejectDocument(
            @PathVariable Long documentId,
            @RequestHeader("Authorization") String token,
            @RequestBody RejectDocumentRequest request) {
        
        Long adminId = extractUserIdFromToken(token);
        Document document = documentService.rejectDocument(documentId, adminId, request.getRejectionReason());
        
        return ResponseEntity.ok(document);
    }

    /**
     * Returns the verification status for a driver's required documents.
     *
     * @param driverId driver identifier
     * @return aggregate verification status flags
     */
    @GetMapping("/driver/{driverId}/verification-status")
    @PreAuthorize("hasAnyRole('ADMIN', 'DRIVER')")
    @SecurityRequirement(name = "bearerAuth")
    @Operation(summary = "Get verification status", description = "Returns whether a driver has submitted and approved the required document set.")
    public ResponseEntity<VerificationStatus> getVerificationStatus(@PathVariable Long driverId) {
        boolean hasAllDocuments = documentService.hasAllRequiredDocumentsApproved(driverId);
        boolean hasVehicleDocuments = documentService.hasVehicleDocuments(driverId);
        
        VerificationStatus status = new VerificationStatus(hasAllDocuments, hasVehicleDocuments);
        return ResponseEntity.ok(status);
    }

    /**
     * Extracts a user identifier from a bearer token.
     *
     * @param token authorization header value
     * @return the authenticated user identifier
     */
    private Long extractUserIdFromToken(String token) {
        String jwt = token.replace("Bearer ", "");
        return jwtTokenProvider.getUserIdFromToken(jwt);
    }

    /**
     * Request payload used when uploading a document.
     */
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

    /**
     * Request payload used when rejecting a document.
     */
    public static class RejectDocumentRequest {
        private String rejectionReason;

        public String getRejectionReason() {
            return rejectionReason;
        }

        public void setRejectionReason(String rejectionReason) {
            this.rejectionReason = rejectionReason;
        }
    }

    /**
     * Response payload describing document verification completeness.
     */
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
