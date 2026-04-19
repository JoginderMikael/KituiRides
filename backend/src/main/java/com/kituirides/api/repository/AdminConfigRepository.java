package com.kituirides.api.repository;

import com.kituirides.api.domain.entity.AdminConfig;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface AdminConfigRepository extends JpaRepository<AdminConfig, Long> {
    Optional<AdminConfig> findByConfigKey(String configKey);
}
