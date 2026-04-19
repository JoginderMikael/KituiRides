package com.kituirides.api.domain.entity;

import com.kituirides.api.domain.enums.DocumentStatus;
import com.kituirides.api.domain.enums.DocumentType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import java.time.Instant;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "documents")
public class Document {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "driver_id", nullable = false)
    private User driver;

    @Enumerated(EnumType.STRING)
    @Column(length = 50)
    private DocumentType documentType;

    @Column(length = 500)
    private String filePath;

    @Column(length = 500)
    private String fileUrl;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private DocumentStatus status = DocumentStatus.PENDING;

    @Column(nullable = false, updatable = false)
    private Instant uploadDate = Instant.now();

    @Column
    private Instant approvalDate;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "approved_by")
    private User approvedBy;

    @Column(columnDefinition = "TEXT")
    private String rejectionReason;
}
