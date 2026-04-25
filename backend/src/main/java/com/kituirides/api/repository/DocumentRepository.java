package com.kituirides.api.repository;

import com.kituirides.api.domain.entity.Document;
import com.kituirides.api.domain.entity.User;
import com.kituirides.api.domain.enums.DocumentStatus;
import com.kituirides.api.domain.enums.DocumentType;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

/**
 * Provides persistence access for document.
 */
@Repository
public interface DocumentRepository extends JpaRepository<Document, Long> {
    List<Document> findByDriver_IdAndStatus(Long driverId, DocumentStatus status);
    List<Document> findByDriver_IdOrderByUploadDateDesc(Long driverId);
    Optional<Document> findByDriver_IdAndDocumentType(Long driverId, DocumentType documentType);
    List<Document> findByStatus(DocumentStatus status);
    List<Document> findByDriver(User driver);
    List<Document> findByApprovedBy(User approvedBy);
}
