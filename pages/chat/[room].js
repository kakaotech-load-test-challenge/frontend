import React from "react";
import { useRouter } from "next/router";
import {
  Box,
  VStack,
  HStack,
  Button,
  Text,
  Callout,
  Card,
} from "@vapor-ui/core";
import { ErrorCircleOutlineIcon, NetworkIcon } from "@vapor-ui/icons";
import { withAuth } from "../../contexts/AuthContext";
import { useChatRoom } from "../../hooks/useChatRoom";
import ChatMessages from "@/components/ChatMessages";
import ChatInput from "@/components/ChatInput";
import ChatRoomInfo from "@/components/ChatRoomInfo";

const ChatPage = () => {
  const router = useRouter();
  const { roomId } = router.query;

  // 🔴 router 준비 전에는 아무 것도 하지 않음
  if (!router.isReady) {
    return null;
  }

  // 🔴 roomId 없으면 진입 불가
  if (typeof roomId !== "string") {
    return (
      <Box padding="$400">
        <Callout color="warning">채팅방 정보가 없습니다.</Callout>
      </Box>
    );
  }

  // ⭐ 핵심: roomId를 useChatRoom에 전달
  const {
    room,
    messages,
    connected,
    connectionStatus,
    messageLoadError,
    retryMessageLoad,
    currentUser,
    message,
    showEmojiPicker,
    showMentionList,
    mentionFilter,
    mentionIndex,
    filePreview,
    fileInputRef,
    messageInputRef,
    socketRef,
    handleMessageChange,
    handleMessageSubmit,
    handleEmojiToggle,
    setMessage,
    setShowEmojiPicker,
    setShowMentionList,
    setMentionFilter,
    setMentionIndex,
    handleKeyDown,
    removeFilePreview,
    getFilteredParticipants,
    insertMention,
    loading,
    error,
    handleReactionAdd,
    handleReactionRemove,
    loadingMessages,
    hasMoreMessages,
    handleLoadMore,
  } = useChatRoom(roomId); // ✅ 여기 중요

  /* ================== 이하 렌더 로직은 기존 그대로 ================== */

  if (loading || !room) {
    return (
      <div className="chat-container">
        <Card.Root className="chat-room-card">
          <Card.Body
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Text typography="heading5">채팅방 연결 중...</Text>
          </Card.Body>
        </Card.Root>
      </div>
    );
  }

  if (error) {
    return (
      <div className="chat-container">
        <Callout color="danger">
          <HStack gap="$200">
            <ErrorCircleOutlineIcon />
            <Text>{error}</Text>
          </HStack>
        </Callout>
        <Button onClick={() => window.location.reload()}>다시 시도</Button>
      </div>
    );
  }

  return (
    <VStack height="calc(100vh - 80px)">
      <ChatRoomInfo room={room} connectionStatus={connectionStatus} />

      <VStack flex="1" overflow="hidden">
        <ChatMessages
          messages={messages}
          currentUser={currentUser}
          room={room}
          onReactionAdd={handleReactionAdd}
          onReactionRemove={handleReactionRemove}
          loadingMessages={loadingMessages}
          hasMoreMessages={hasMoreMessages}
          onLoadMore={handleLoadMore}
          socketRef={socketRef}
        />
      </VStack>

      <ChatInput
        message={message}
        onMessageChange={handleMessageChange}
        onSubmit={handleMessageSubmit}
        onEmojiToggle={handleEmojiToggle}
        fileInputRef={fileInputRef}
        messageInputRef={messageInputRef}
        filePreview={filePreview}
        disabled={connectionStatus !== "connected"}
        showEmojiPicker={showEmojiPicker}
        showMentionList={showMentionList}
        mentionFilter={mentionFilter}
        mentionIndex={mentionIndex}
        getFilteredParticipants={getFilteredParticipants}
        setMessage={setMessage}
        setShowEmojiPicker={setShowEmojiPicker}
        setShowMentionList={setShowMentionList}
        setMentionFilter={setMentionFilter}
        setMentionIndex={setMentionIndex}
        room={room}
        onMentionSelect={(user) => {
          insertMention(user);
          setShowMentionList(false);
        }}
        onFileRemove={removeFilePreview}
      />
    </VStack>
  );
};

export default withAuth(ChatPage);
