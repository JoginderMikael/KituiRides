package com.kituirides.api.domain.entity;

import com.kituirides.api.domain.enums.AuditAction;
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
@Table(name = "audit_log")
public class AuditLog {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "admin_id", nullable = false)
    private User admin;

    @Column(length = 100)
    private String entityType;

    @Column
    private Long entityId;

    @Enumerated(EnumType.STRING)
    @Column(length = 50)
    private AuditAction action;

    @Column(columnDefinition = "jsonb")
    private Object oldValues;

    @Column(columnDefinition = "jsonb")
    private Object newValues;

    @Column(nullable = false, updatable = false)
    private Instant createdAt = Instant.now();
}
