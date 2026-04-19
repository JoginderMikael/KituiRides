package com.kituirides.api.driver;

import com.kituirides.api.domain.entity.Document;
import com.kituirides.api.domain.entity.User;
import com.kituirides.api.domain.enums.DocumentStatus;
import com.kituirides.api.domain.enums.DocumentType;
import com.kituirides.api.repository.DocumentRepository;
import com.kituirides.api.repository.UserRepository;
import java.time.Instant;
import java.util.List;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Slf4j
@Service
@RequiredArgsConstructor
public class DocumentService {

    private final DocumentRepository documentRepository;
    private final UserRepository userRepository;

    @Value("${file.upload.path:uploads/documents/}")
    private String uploadPath;

    /**
     * Upload driver document
     */
    @Transactional
    public Document uploadDocument(Long driverId, DocumentType documentType, 
                                  String filePath, String fileUrl) {
        User driver = userRepository.findById(driverId)
                .orElseThrow(() -> new IllegalArgumentException("Driver not found"));

        Document document = new Document();
        document.setDriver(driver);
        document.setDocumentType(documentType);
        document.setFilePath(filePath);
        document.setFileUrl(fileUrl);
        document.setStatus(DocumentStatus.PENDING);
        document.setUploadDate(Instant.now());

        document = documentRepository.save(document);
        log.info("Document {} uploaded for driver {} with type {}", 
                document.getId(), driverId, documentType);
        return document;
    }

    /**
     * Approve driver document
     */
    @Transactional
    public Document approveDocument(Long documentId, Long adminId) {
        Document document = documentRepository.findById(documentId)
                .orElseThrow(() -> new IllegalArgumentException("Document not found"));

        User admin = userRepository.findById(adminId)
                .orElseThrow(() -> new IllegalArgumentException("Admin not found"));

        document.setStatus(DocumentStatus.APPROVED);
        document.setApprovalDate(Instant.now());
        document.setApprovedBy(admin);

        document = documentRepository.save(document);
        log.info("Document {} approved by admin {}", documentId, adminId);
        return document;
    }

    /**
     * Reject driver document
     */
    @Transactional
    public Document rejectDocument(Long documentId, Long adminId, String rejectionReason) {
        Document document = documentRepository.findById(documentId)
                .orElseThrow(() -> new IllegalArgumentException("Document not found"));

        User admin = userRepository.findById(adminId)
                .orElseThrow(() -> new IllegalArgumentException("Admin not found"));

        document.setStatus(DocumentStatus.REJECTED);
        document.setApprovalDate(Instant.now());
        document.setApprovedBy(admin);
        document.setRejectionReason(rejectionReason);

        document = documentRepository.save(document);
        log.info("Document {} rejected by admin {} with reason: {}", documentId, adminId, rejectionReason);
        return document;
    }

    /**
     * Get all documents for a driver
     */
    public List<Document> getDriverDocuments(Long driverId) {
        return documentRepository.findByDriver_IdOrderByUploadDateDesc(driverId);
    }

    /**
     * Get documents by status for a driver
     */
    public List<Document> getDriverDocumentsByStatus(Long driverId, DocumentStatus status) {
        return documentRepository.findByDriver_IdAndStatus(driverId, status);
    }

    /**
     * Get all pending documents for admin review
     */
    public List<Document> getPendingDocuments() {
        return documentRepository.findByStatus(DocumentStatus.PENDING);
    }

    /**
     * Check if driver has all required documents approved
     */
    public boolean hasAllRequiredDocumentsApproved(Long driverId) {
        List<Document> approvedDocs = documentRepository.findByDriver_IdAndStatus(
                driverId, DocumentStatus.APPROVED);
        
        // Required documents: passport, ID front, ID back, driver license, etc.
        // At minimum: passport photo, ID front, ID back, driver license (front/back optional)
        long requiredCount = approvedDocs.stream()
                .filter(d -> d.getDocumentType() == DocumentType.PASSPORT_PHOTO ||
                           d.getDocumentType() == DocumentType.ID_FRONT ||
                           d.getDocumentType() == DocumentType.ID_BACK)
                .count();
        
        return requiredCount >= 3;
    }

    /**
     * Check if driver has vehicle documents
     */
    public boolean hasVehicleDocuments(Long driverId) {
        return documentRepository.findByDriver_IdAndStatus(driverId, DocumentStatus.APPROVED)
                .stream()
                .anyMatch(d -> d.getDocumentType() == DocumentType.CAR_FRONT ||
                             d.getDocumentType() == DocumentType.CAR_BACK ||
                             d.getDocumentType() == DocumentType.INSURANCE_STICKER);
    }

    /**
     * Get document by ID
     */
    public Document getDocument(Long documentId) {
        return documentRepository.findById(documentId)
                .orElseThrow(() -> new IllegalArgumentException("Document not found"));
    }

    /**
     * Delete document (only if pending)
     */
    @Transactional
    public void deleteDocument(Long documentId) {
        Document document = documentRepository.findById(documentId)
                .orElseThrow(() -> new IllegalArgumentException("Document not found"));

        if (document.getStatus() != DocumentStatus.PENDING) {
            throw new IllegalArgumentException("Can only delete pending documents");
        }

        documentRepository.deleteById(documentId);
        log.info("Document {} deleted", documentId);
    }
}
