package com.kituirides.api.repository;

import com.kituirides.api.domain.entity.Message;
import com.kituirides.api.domain.entity.MessageReadState;
import java.util.Collection;
import org.springframework.data.jpa.repository.JpaRepository;

/**
 * Provides persistence access for message read state.
 */
public interface MessageReadStateRepository extends JpaRepository<MessageReadState, Long> {
    boolean existsByMessage_IdAndUser_Id(Long messageId, Long userId);
    void deleteByMessageIn(Collection<Message> messages);
}
