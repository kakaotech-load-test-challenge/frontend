import { useState, useCallback } from "react";
import { Toast } from "../components/Toast";

export const useMessageHandling = (
  socketRef,
  currentUser,
  router,
  handleSessionError
) => {
  const [message, setMessage] = useState("");
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showMentionList, setShowMentionList] = useState(false);
  const [mentionFilter, setMentionFilter] = useState("");
  const [mentionIndex, setMentionIndex] = useState(0);

  const handleMessageChange = useCallback((e) => {
    const newValue = e.target.value;
    setMessage(newValue);

    const cursor = e.target.selectionStart;
    const before = newValue.slice(0, cursor);
    const at = before.lastIndexOf("@");

    if (at !== -1) {
      const mentionText = before.slice(at + 1);
      if (!mentionText.includes(" ")) {
        setMentionFilter(mentionText.toLowerCase());
        setShowMentionList(true);
        return;
      }
    }

    setShowMentionList(false);
  }, []);

  const handleMessageSubmit = useCallback(
    async (data) => {
      const { type, file, content } = data;

      const roomId = router?.query?.room;

      if (!roomId) {
        Toast.error("채팅방 정보를 찾을 수 없습니다.");
        return;
      }

      if (type === "file") {
        try {
          // 1) 파일 업로드 준비
          const ext = file.name.split(".").pop();
          const uuid = crypto.randomUUID();
          const fileName = `${uuid}.${ext}`;

          const s3Url = `https://ktb-s3-bucket-image-016.s3.ap-northeast-2.amazonaws.com/${fileName}`;

          // 2) S3 PUT 업로드
          const res = await fetch(s3Url, {
            method: "PUT",
            headers: {
              "Content-Type": file.type,
            },
            body: file,
          });

          if (!res.ok) {
            throw new Error("S3 업로드 실패: " + res.status);
          }

          const uploaded = {
            url: s3Url,
            name: fileName, // S3에 저장된 파일명 (UUID)
            originalName: file.name, // 원본 파일명
            size: file.size,
            mimeType: file.type,
          };

          // 3) 채팅 메시지 소켓 전송
          // 백엔드 FileResponse 구조에 맞춤:
          // - url 또는 fileUrl (백엔드 fromMetadata가 둘 다 지원하도록 원래 코드 사용)
          // - originalname 또는 originalName (백엔드 fromMetadata가 둘 다 지원하도록 원래 코드 사용)
          // - mimetype 또는 mimeType (백엔드 fromMetadata가 둘 다 지원하도록 원래 코드 사용)
          // - size
          // 백엔드 ChatMessageHandler는 data.getRoom()을 사용하므로 'room' 필드 사용
          const messageData = {
            type: "file",
            room: roomId, // ✅ roomId가 아닌 room 사용 (백엔드와 일치)
            content: "",
            fileData: {
              url: uploaded.url, // S3 URL (원래 코드: url 사용, 백엔드가 metadata.url 또는 metadata.fileUrl 둘 다 지원)
              fileUrl: uploaded.url, // fileUrl도 함께 전송 (백엔드 호환성)
              originalname: uploaded.originalName, // 원본 파일명 (원래 코드: originalname)
              originalName: uploaded.originalName, // originalName도 함께 전송 (백엔드 호환성)
              mimetype: uploaded.mimeType, // 원래 코드: mimetype
              mimeType: uploaded.mimeType, // mimeType도 함께 전송 (백엔드 호환성)
              size: uploaded.size,
            },
          };

          console.log("📤 [useMessageHandling] 파일 메시지 전송:", messageData);

          socketRef.current.emit("chatMessage", messageData);

          return;
        } catch (err) {
          Toast.error("파일 업로드 실패");
          return;
        }
      }

      // 텍스트 메시지 처리
      if (!content?.trim()) {
        return;
      }

      socketRef.current.emit("chatMessage", {
        room: roomId,
        type: "text",
        content: content.trim(),
      });
    },
    [socketRef, router, currentUser]
  );

  return {
    message,
    setMessage,
    handleMessageChange,
    handleMessageSubmit,
    showEmojiPicker,
    setShowEmojiPicker,
    showMentionList,
    setShowMentionList,
    mentionFilter,
    mentionIndex,
    setMentionIndex,
  };
};

export default useMessageHandling;
