// FIXED VERSION: useChatRoom
// 핵심 변경점:
// 1) useChatRoom(roomId) 시그니처
// 2) router.query 의존 완전 제거
// 3) roomId를 모든 socket / load / cleanup 경로에 명시적으로 전달

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/router";
import socketService from "../services/socket";
import { useAuth } from "../contexts/AuthContext";
import { useFileHandling } from "./useFileHandling";
import { useMessageHandling } from "./useMessageHandling";
import { useReactionHandling } from "./useReactionHandling";
import { useSocketHandling } from "./useSocketHandling";
import { useRoomHandling } from "./useRoomHandling";
import { Toast } from "../components/Toast";

const CLEANUP_REASONS = {
  DISCONNECT: "disconnect",
  MANUAL: "manual",
  RECONNECT: "reconnect",
  UNMOUNT: "unmount",
  ERROR: "error",
};

export const useChatRoom = (roomId) => {
  const router = useRouter();
  const { user: authUser, logout } = useAuth();

  const [room, setRoom] = useState(null);
  const [messages, setMessages] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [connectionStatus, setConnectionStatus] = useState("checking");
  const [hasMoreMessages, setHasMoreMessages] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);

  const mountedRef = useRef(true);
  const processedMessageIds = useRef(new Set());
  const loadMoreTimeoutRef = useRef(null);

  // socket handling
  const { connected, socketRef, setConnected } = useSocketHandling(router);

  // message input handling
  const {
    message,
    showEmojiPicker,
    showMentionList,
    mentionFilter,
    mentionIndex,
    setMessage,
    setShowEmojiPicker,
    setShowMentionList,
    setMentionFilter,
    setMentionIndex,
    handleMessageChange,
    handleMessageSubmit,
  } = useMessageHandling(socketRef, currentUser, router, undefined);

  // emoji
  const handleEmojiToggle = useCallback(() => {
    setShowEmojiPicker((prev) => !prev);
  }, []);

  // pagination
  const handleLoadMore = useCallback(() => {
    if (!socketRef.current?.connected) return;
    if (loadingMessages || !hasMoreMessages) return;

    setLoadingMessages(true);
    socketRef.current.emit("loadPreviousMessages", {
      room: roomId,
      limit: 50,
    });
  }, [roomId, loadingMessages, hasMoreMessages]);

  const safeHandleLoadMore = useCallback(() => {
    if (loadMoreTimeoutRef.current) clearTimeout(loadMoreTimeoutRef.current);
    loadMoreTimeoutRef.current = setTimeout(handleLoadMore, 300);
  }, [handleLoadMore]);

  // reactions
  const { handleReactionAdd, handleReactionRemove, handleReactionUpdate } =
    useReactionHandling(socketRef, currentUser, messages, setMessages);

  // process loaded messages
  const processMessages = useCallback((loadedMessages, hasMore) => {
    setMessages((prev) => {
      const merged = [...prev];
      loadedMessages.forEach((msg) => {
        if (!processedMessageIds.current.has(msg._id)) {
          processedMessageIds.current.add(msg._id);
          merged.push(msg);
        }
      });
      return merged.sort(
        (a, b) => new Date(a.timestamp) - new Date(b.timestamp)
      );
    });
    setHasMoreMessages(hasMore);
    setLoadingMessages(false);
  }, []);

  // socket listeners
  useEffect(() => {
    if (!socketRef.current || !roomId) return;

    const socket = socketRef.current;

    socket.on("message", (msg) => {
      if (!processedMessageIds.current.has(msg._id)) {
        processedMessageIds.current.add(msg._id);
        setMessages((prev) => [...prev, msg]);
      }
    });

    socket.on("previousMessagesLoaded", ({ messages, hasMore }) => {
      processMessages(messages, hasMore);
    });

    socket.on("messageReactionUpdate", handleReactionUpdate);

    socket.on("session_ended", () => {
      logout();
      router.replace("/");
    });

    return () => {
      socket.off("message");
      socket.off("previousMessagesLoaded");
      socket.off("messageReactionUpdate");
      socket.off("session_ended");
    };
  }, [roomId, processMessages, handleReactionUpdate]);

  // room setup
  const { setupRoom } = useRoomHandling(
    socketRef,
    currentUser,
    mountedRef,
    router,
    setRoom,
    setError,
    setMessages,
    setHasMoreMessages,
    setLoadingMessages,
    setLoading,
    () => {},
    () => {},
    loading,
    () => {},
    { current: false },
    { current: false },
    new Map(),
    processMessages
  );

  // init
  useEffect(() => {
    if (!roomId) return;
    if (!authUser) {
      router.replace("/");
      return;
    }

    setCurrentUser(authUser);
    setupRoom(roomId);

    return () => {
      if (socketRef.current?.connected) {
        socketRef.current.emit("leaveRoom", roomId);
      }
    };
  }, [roomId, authUser]);

  // file handling
  const {
    filePreview,
    uploading,
    uploadProgress,
    uploadError,
    fileInputRef,
    handleFileSelect,
    removeFilePreview,
  } = useFileHandling(socketRef, currentUser, router, undefined);

  return {
    room,
    messages,
    error,
    loading,
    connected,
    currentUser,
    message,
    showEmojiPicker,
    showMentionList,
    mentionFilter,
    mentionIndex,
    filePreview,
    uploading,
    uploadProgress,
    uploadError,
    hasMoreMessages,
    loadingMessages,

    fileInputRef,
    socketRef,

    handleMessageChange,
    handleMessageSubmit,
    handleEmojiToggle,
    handleReactionAdd,
    handleReactionRemove,
    handleLoadMore: safeHandleLoadMore,
    removeFilePreview,

    setMessage,
    setShowEmojiPicker,
    setShowMentionList,
    setMentionFilter,
    setMentionIndex,

    connectionStatus,
  };
};

export default useChatRoom;
