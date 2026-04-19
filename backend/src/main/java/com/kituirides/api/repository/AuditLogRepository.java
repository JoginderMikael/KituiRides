package com.kituirides.api.repository;

import com.kituirides.api.domain.entity.AuditLog;
import com.kituirides.api.domain.enums.AuditAction;
import java.time.Instant;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface AuditLogRepository extends JpaRepository<AuditLog, Long> {
    List<AuditLog> findByAdmin_IdOrderByCreatedAtDesc(Long adminId);
    List<AuditLog> findByEntityTypeAndActionOrderByCreatedAtDesc(String entityType, AuditAction action);
    List<AuditLog> findByCreatedAtBetweenOrderByCreatedAtDesc(Instant from, Instant to);
}
