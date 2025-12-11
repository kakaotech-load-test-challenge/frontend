import { useState, useCallback } from 'react';
import { Toast } from '../components/Toast';

export const useMessageHandling = (socketRef, currentUser, router, handleSessionError) => {
  const [message, setMessage] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showMentionList, setShowMentionList] = useState(false);
  const [mentionFilter, setMentionFilter] = useState('');
  const [mentionIndex, setMentionIndex] = useState(0);

  const handleMessageChange = useCallback((e) => {
    const newValue = e.target.value;
    setMessage(newValue);

    const cursor = e.target.selectionStart;
    const before = newValue.slice(0, cursor);
    const at = before.lastIndexOf('@');

    if (at !== -1) {
      const mentionText = before.slice(at + 1);
      if (!mentionText.includes(' ')) {
        setMentionFilter(mentionText.toLowerCase());
        setShowMentionList(true);
        return;
      }
    }

    setShowMentionList(false);
  }, []);

  const handleMessageSubmit = useCallback(async (data) => {
    console.log("🔵 [handleMessageSubmit] 호출됨", data);
    

    const { type, file, content } = data;

    const roomId = router?.query?.room;

    if (!roomId) {
      Toast.error('채팅방 정보를 찾을 수 없습니다.');
      return;
    }

    if (type === 'file') {
      try {
        console.log("📁 [handleMessageSubmit] 파일 메시지 감지");

        // 1) 파일 업로드 준비
          const ext = file.name.split('.').pop(); // 원본 확장자 유지
      const uuid = crypto.randomUUID(); // 브라우저 내장 UUID 생성기
      const fileName = `${uuid}.${ext}`;

      const s3Url = `https://ktb-s3-bucket-image-016.s3.ap-northeast-2.amazonaws.com/${fileName}`;

        console.log("📤 [DIRECT-UPLOAD] S3 업로드 시도 →", s3Url);

        // 2) S3 PUT 업로드
        const res = await fetch(s3Url, {
          method: "PUT",
          headers: {
            "Content-Type": file.type,
          },
          body: file,
        });

        if (!res.ok) {
          console.error("❌ [DIRECT-UPLOAD] 업로드 실패", res.status, res.statusText);
          throw new Error("S3 업로드 실패: " + res.status);
        }

        console.log("✅ [DIRECT-UPLOAD] 업로드 성공");

        const uploaded = {
          url: s3Url,
          name: fileName,
          size: file.size,
          mimeType: file.type,
        };

        console.log("📡 [handleMessageSubmit] 업로드 결과:", uploaded);

        // 3) 채팅 메시지 소켓 전송
       socketRef.current.emit("chatMessage", {
        type: "file",
        roomId: roomId,
        content: "", // 기본적으로 파일메시지는 content가 비어있어도 됨

        fileData: {
          url: uploaded.url,
          mimetype: uploaded.mimeType,     // 🔥 오타 수정
          originalname: uploaded.name,     // 🔥 서버 naming convention에 맞춤
          size: uploaded.size
        }
      });

        console.log("📨 [handleMessageSubmit] 파일 메시지 소켓 전송 완료");

        return;

      } catch (err) {
        console.error("❌ [handleMessageSubmit] 파일 업로드 중 오류:", err);
        Toast.error("파일 업로드 실패");
        return;
      }
    }

    // ----------------------
    // ✉️ 텍스트 메시지 처리
    // ----------------------
    if (!content?.trim()) {
      console.log("⚠️ [handleMessageSubmit] content 비어있음 → 전송 안 함");
      return;
    }

    socketRef.current.emit("chatMessage", {
      room: roomId,
      type: "text",
      content: content.trim(),
    });

  }, [socketRef, router, currentUser]);


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
    setMentionIndex
  };
};

export default useMessageHandling;
