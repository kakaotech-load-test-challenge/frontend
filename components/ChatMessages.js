import React, { useCallback, useMemo } from 'react';
import { Text, VStack } from '@vapor-ui/core';
import SystemMessage from './SystemMessage';
import FileMessage from './FileMessage';
import UserMessage from './UserMessage';
import { useInfiniteScroll } from '../hooks/useInfiniteScroll';
import { useAutoScroll } from '../hooks/useAutoScroll';

const LoadingIndicator = React.memo(() => (
  <div className="loading-messages">
    <div className="spinner-border spinner-border-sm text-primary" role="status">
      <span className="visually-hidden">Loading...</span>
    </div>
    <span className="text-secondary text-sm">이전 메시지를 불러오는 중...</span>
  </div>
));
LoadingIndicator.displayName = 'LoadingIndicator';

const MessageHistoryEnd = React.memo(() => (
  <div className="text-center p-2 mb-4" data-testid="message-history-end">
    <Text typography="body2" color="neutral-weak">더 이상 불러올 메시지가 없습니다.</Text>
  </div>
));
MessageHistoryEnd.displayName = 'MessageHistoryEnd';

const EmptyMessages = React.memo(() => (
  <div className="empty-messages">
    <Text typography="body1">아직 메시지가 없습니다.</Text>
    <Text typography="body2" color="neutral-weak">첫 메시지를 보내보세요!</Text>
  </div>
));
EmptyMessages.displayName = 'EmptyMessages';

const ChatMessages = ({
  messages = [],
  currentUser = null,
  room = null,
  loadingMessages = false,
  hasMoreMessages = true,
  onReactionAdd = () => {},
  onReactionRemove = () => {},
  onLoadMore = () => {},
  socketRef
}) => {
  // 무한 스크롤 훅
  const { sentinelRef } = useInfiniteScroll(
    onLoadMore,
    hasMoreMessages,
    loadingMessages
  );

  // 자동 스크롤 훅 (스크롤 복원 기능 포함)
  const { containerRef, scrollToBottom, isNearBottom } = useAutoScroll(
    messages,
    currentUser?.id,
    loadingMessages,
    100 // 하단 100px 이내면 자동 스크롤
  );
  const isMine = useCallback((msg) => {
    if (!msg?.sender || !currentUser?.id) return false;
    
    return (
      msg.sender._id === currentUser.id || 
      msg.sender.id === currentUser.id ||
      msg.sender === currentUser.id
    );
  }, [currentUser?.id]);

  const allMessages = useMemo(() => {
    if (!Array.isArray(messages)) return [];

    return messages.sort((a, b) => {
      if (!a?.timestamp || !b?.timestamp) return 0;
      return new Date(a.timestamp) - new Date(b.timestamp);
    });
  }, [messages]);

  console.log("📨 [ChatMessages] messages =", messages);
  const renderMessage = useCallback((msg, idx) => {
     console.log("🔍 renderMessage 호출됨 idx:", idx, "msg:", msg);
    if (!msg) return null;

    const commonProps = {
      currentUser,
      room,
      onReactionAdd,
      onReactionRemove
    };

    const MessageComponent = {
      system: SystemMessage,
      file: FileMessage
    }[msg.type] || UserMessage;

     console.log("🧩 MessageComponent 선택됨:", msg.type, MessageComponent.name);

    return (
      <MessageComponent
        key={msg._id || `msg-${idx}`}
        {...commonProps}
        msg={msg}
        content={msg.content}
        isMine={msg.type !== 'system' ? isMine(msg) : undefined}
        isStreaming={msg.type === 'ai' ? (msg.isStreaming || false) : undefined}
        socketRef={socketRef}
      />
    );
  }, [currentUser, room, isMine, onReactionAdd, onReactionRemove, socketRef]);

  return (
    <VStack
      ref={containerRef}
      gap="$200"
      className="h-full overflow-y-auto overflow-x-hidden scroll-smooth [overflow-scrolling:touch]"
      padding="$300"
      role="log"
      aria-live="polite"
      aria-atomic="false"
      data-testid="chat-messages-container"
    >
      {hasMoreMessages && (
        <div
          ref={sentinelRef}
          style={{
            height: '20px',
            margin: '10px 0',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center'
          }}
        >
          {loadingMessages && <LoadingIndicator />}
        </div>
      )}

      {!hasMoreMessages && messages.length > 0 && (
        <MessageHistoryEnd />
      )}

      {allMessages.length === 0 ? (
        <EmptyMessages />
      ) : (
        allMessages.map((msg, idx) => renderMessage(msg, idx))
      )}
    </VStack>
  );
};

ChatMessages.displayName = 'ChatMessages';

export default React.memo(ChatMessages);