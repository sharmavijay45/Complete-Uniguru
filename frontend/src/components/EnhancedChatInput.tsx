import React, { useState, useRef, useEffect } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faPaperclip,
  faMicrophone,
  faArrowUp,
  faExpand,
  faCompress,
  faCopy,
  faImage,
  faFile,
  faFilePdf,
  faTimes
} from "@fortawesome/free-solid-svg-icons";
import { gsap } from "gsap";
import BubblyButton from "./BubblyButton";
import toast from "react-hot-toast";

interface FileAttachment {
  id: string;
  file: File;
  type: 'image' | 'pdf' | 'document';
  preview?: string;
}

interface EnhancedChatInputProps {
  message: string;
  setMessage: (message: string) => void;
  onSendMessage: () => void;
  onKeyDown: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  textareaRef: React.RefObject<HTMLTextAreaElement>;
  onFileUpload?: (file: File) => void;
  attachments?: FileAttachment[];
  onRemoveAttachment?: (id: string) => void;
}

const EnhancedChatInput: React.FC<EnhancedChatInputProps> = ({
  message,
  setMessage,
  onSendMessage,
  onKeyDown,
  textareaRef,
  onFileUpload,
  attachments = [],
  onRemoveAttachment,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [showPlaceholder, setShowPlaceholder] = useState(true);
  const [showStats, setShowStats] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const placeholderRef = useRef<HTMLSpanElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout>();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  // Calculate stats
  const charCount = message.length;
  const wordCount = message.trim() ? message.trim().split(/\s+/).length : 0;
  const maxChars = 2000;

  // Copy text function
  const handleCopyText = async () => {
    if (message.trim()) {
      try {
        await navigator.clipboard.writeText(message);
        toast.success("Text copied to clipboard!", {
          duration: 2000,
          icon: '📋'
        });
      } catch (err) {
        console.error('Failed to copy text: ', err);
        // Fallback for older browsers
        const textArea = document.createElement('textarea');
        textArea.value = message;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        toast.success("Text copied to clipboard!", {
          duration: 2000,
          icon: '📋'
        });
      }
    }
  };

  // File upload handlers
  const handleFileClick = () => {
    fileInputRef.current?.click();
  };

  const handleImageClick = () => {
    imageInputRef.current?.click();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && onFileUpload) {
      onFileUpload(file);
    }
    // Reset the input so the same file can be selected again
    event.target.value = '';
  };

  const handleImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && onFileUpload) {
      onFileUpload(file);
    }
    // Reset the input so the same file can be selected again
    event.target.value = '';
  };

  // Voice recording functionality
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data);
      };

      mediaRecorder.onstop = () => {
        // const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
        // Here you could implement speech-to-text conversion
        // For now, we'll just show a message
        toast.success("Voice recording completed! (Speech-to-text coming soon)", {
          duration: 3000,
          icon: '🎤'
        });

        // Stop all tracks to release the microphone
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      toast.success("Recording started...", {
        duration: 2000,
        icon: '🎤'
      });
    } catch (error) {
      console.error('Error accessing microphone:', error);
      toast.error("Could not access microphone", {
        duration: 3000,
        icon: '❌'
      });
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const handleMicrophoneClick = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  // Drag and drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);

    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0 && onFileUpload) {
      const file = files[0]; // Take the first file
      onFileUpload(file);
    }
  };

  // Enhanced keyboard handler
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Ctrl/Cmd + E to toggle expand
    if ((e.ctrlKey || e.metaKey) && e.key === 'e') {
      e.preventDefault();
      toggleExpanded();
      return;
    }

    // Ctrl/Cmd + Shift + Enter for new line (when expanded)
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'Enter') {
      e.preventDefault();
      const textarea = e.currentTarget;
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const newValue = message.substring(0, start) + '\n' + message.substring(end);
      setMessage(newValue);

      // Set cursor position after the new line
      setTimeout(() => {
        textarea.selectionStart = textarea.selectionEnd = start + 1;
      }, 0);
      return;
    }

    // Call original handler
    onKeyDown(e);
  };

  // Typewriter effect for placeholder
  const placeholderTexts = [
    "Type a message...",
    "Ask me anything...",
    "What can I help you with?",
    "Start a conversation...",
    "Share your thoughts..."
  ];
  const [currentPlaceholderIndex, setCurrentPlaceholderIndex] = useState(0);
  const [currentText, setCurrentText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  // Typewriter animation effect
  useEffect(() => {
    if (!showPlaceholder) return;

    const currentFullText = placeholderTexts[currentPlaceholderIndex];
    const typingSpeed = isDeleting ? 50 : 100;
    const pauseTime = isDeleting ? 500 : 2000;

    const timeout = setTimeout(() => {
      if (!isDeleting) {
        if (currentText.length < currentFullText.length) {
          setCurrentText(currentFullText.slice(0, currentText.length + 1));
        } else {
          setTimeout(() => setIsDeleting(true), pauseTime);
        }
      } else {
        if (currentText.length > 0) {
          setCurrentText(currentText.slice(0, -1));
        } else {
          setIsDeleting(false);
          setCurrentPlaceholderIndex((prev) => (prev + 1) % placeholderTexts.length);
        }
      }
    }, typingSpeed);

    return () => clearTimeout(timeout);
  }, [currentText, isDeleting, currentPlaceholderIndex, showPlaceholder]);

  // Handle input changes
  const handleInput = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    const textarea = event.target;
    const value = event.target.value;

    // Enforce character limit
    if (value.length > maxChars) {
      return;
    }

    setMessage(value);
    setShowPlaceholder(value.length === 0);

    // Auto-resize textarea based on expanded state
    textarea.style.height = "auto";
    const maxHeight = isExpanded ? 300 : 150;
    const newHeight = Math.min(textarea.scrollHeight, maxHeight);
    textarea.style.height = `${newHeight}px`;

    // Typing indicator
    setIsTyping(true);
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
    }, 1000);
  };

  // Toggle expanded state
  const toggleExpanded = () => {
    setIsExpanded(!isExpanded);

    if (textareaRef.current) {
      const textarea = textareaRef.current;

      if (!isExpanded) {
        // Expanding animation - increase height
        gsap.to(textarea, {
          maxHeight: "300px",
          duration: 0.4,
          ease: "power2.out"
        });

        // Subtle container pulse effect
        if (containerRef.current) {
          gsap.timeline()
            .to(containerRef.current, {
              scale: 1.01,
              duration: 0.15,
              ease: "power2.out"
            })
            .to(containerRef.current, {
              scale: 1,
              duration: 0.25,
              ease: "power2.out"
            });
        }
      } else {
        // Collapsing animation - decrease height
        gsap.to(textarea, {
          maxHeight: "150px",
          duration: 0.3,
          ease: "power2.inOut"
        });
      }

      // Auto-resize to content if needed
      setTimeout(() => {
        textarea.style.height = "auto";
        const newHeight = Math.min(textarea.scrollHeight, isExpanded ? 150 : 300);
        textarea.style.height = `${newHeight}px`;
      }, 50);
    }
  };

  // Focus animation
  const handleFocus = () => {
    setShowPlaceholder(false);
    setShowStats(true);
    if (containerRef.current) {
      gsap.to(containerRef.current, {
        boxShadow: "0 0 8px rgba(139, 92, 246, 0.1), 0 0 16px rgba(124, 58, 237, 0.05)",
        scale: 1.02,
        duration: 0.3,
        ease: "power2.out"
      });
    }
  };

  // Blur animation
  const handleBlur = () => {
    if (message.length === 0) {
      setShowPlaceholder(true);
    }
    setShowStats(false);
    if (containerRef.current) {
      gsap.to(containerRef.current, {
        boxShadow: "none",
        scale: 1,
        duration: 0.3,
        ease: "power2.out"
      });
    }
  };

  return (
    <div className="w-full flex flex-col relative">
      {/* File Attachments Preview */}
      {attachments.length > 0 && (
        <div className="mb-3 flex flex-wrap gap-2">
          {attachments.map((attachment) => (
            <div
              key={attachment.id}
              className="relative bg-gray-800/40 backdrop-blur-sm border border-purple-400/20 rounded-lg p-2 flex items-center space-x-2 max-w-xs"
            >
              {/* File Icon */}
              <div className="flex-shrink-0">
                {attachment.type === 'image' ? (
                  attachment.preview ? (
                    <img
                      src={attachment.preview}
                      alt={attachment.file.name}
                      className="w-8 h-8 object-cover rounded"
                    />
                  ) : (
                    <FontAwesomeIcon
                      icon={faImage}
                      className="text-blue-400 w-8 h-8"
                    />
                  )
                ) : attachment.type === 'pdf' ? (
                  <FontAwesomeIcon
                    icon={faFilePdf}
                    className="text-red-400 w-8 h-8"
                  />
                ) : (
                  <FontAwesomeIcon
                    icon={faFile}
                    className="text-gray-400 w-8 h-8"
                  />
                )}
              </div>

              {/* File Info */}
              <div className="flex-1 min-w-0">
                <p className="text-white text-sm font-medium truncate">
                  {attachment.file.name}
                </p>
                <p className="text-gray-400 text-xs">
                  {(attachment.file.size / 1024 / 1024).toFixed(1)} MB
                </p>
              </div>

              {/* Remove Button */}
              {onRemoveAttachment && (
                <button
                  onClick={() => onRemoveAttachment(attachment.id)}
                  className="flex-shrink-0 text-gray-400 hover:text-red-400 transition-colors"
                  title="Remove file"
                >
                  <FontAwesomeIcon icon={faTimes} className="w-4 h-4" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Chat Input Container */}
      <div className="flex items-center w-full">
        <div
        ref={containerRef}
        className={`enhanced-chat-input flex items-center w-full transition-all duration-300 rounded-2xl sm:rounded-3xl ${isTyping ? 'typing-animation' : ''} ${isDragOver ? 'drag-over' : ''}`}
        style={{
          background: 'transparent',
          border: '2px solid transparent',
          backgroundImage: charCount > maxChars * 0.9
            ? 'linear-gradient(transparent, transparent), linear-gradient(135deg, #fbbf24, #f59e0b, #d97706)'
            : isDragOver
            ? 'linear-gradient(rgba(0,0,0,0.15), rgba(0,0,0,0.15)), linear-gradient(135deg, rgba(168, 85, 247, 0.3), rgba(124, 58, 237, 0.2), rgba(139, 92, 246, 0.25))'
            : 'linear-gradient(rgba(0,0,0,0.1), rgba(0,0,0,0.1)), linear-gradient(135deg, rgba(139, 92, 246, 0.2), rgba(124, 58, 237, 0.15), rgba(168, 85, 247, 0.1))',
          backgroundOrigin: 'border-box',
          backgroundClip: 'content-box, border-box',
        }}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {/* Left side icons */}
        <div className="flex items-center px-2 sm:px-3 py-2 sm:py-3">
          <FontAwesomeIcon
            icon={faPaperclip}
            className="mx-1 sm:mx-2 cursor-pointer text-white/80 hover:text-white transition-colors"
            style={{ fontSize: '16px' }}
            title="Attach file"
            onClick={handleFileClick}
          />
          <FontAwesomeIcon
            icon={faImage}
            className="mx-1 sm:mx-2 cursor-pointer text-white/80 hover:text-white transition-colors hidden xs:block"
            style={{ fontSize: '16px' }}
            title="Add image"
            onClick={handleImageClick}
          />
        </div>

        {/* Text input area */}
        <div className="flex-1 relative">
          {showPlaceholder && (
            <span
              ref={placeholderRef}
              className="absolute left-3 top-3 text-white/60 pointer-events-none select-none"
              style={{
                fontSize: "inherit",
                lineHeight: "inherit"
              }}
            >
              {currentText}
              <span className="cursor-blink">|</span>
            </span>
          )}
          <textarea
            ref={textareaRef}
            className={`w-full p-2 sm:p-3 bg-transparent text-white focus:outline-none resize-none transition-all duration-300 text-sm sm:text-base mobile-scroll ${
              showPlaceholder ? 'text-transparent' : 'text-white'
            }`}
            value={message}
            onChange={handleInput}
            onKeyDown={handleKeyDown}
            onFocus={handleFocus}
            onBlur={handleBlur}
            rows={1}
            style={{
              maxHeight: isExpanded ? (window.innerWidth < 640 ? "200px" : "300px") : (window.innerWidth < 640 ? "120px" : "150px"),
              overflowY: "auto",
              scrollbarWidth: "thin",
              scrollbarColor: "rgba(139, 92, 246, 0.2) transparent",
              outline: "none",
              border: "none",
              boxShadow: "none",
              color: "#ffffff",
              fontWeight: "500",
            }}
          />
        </div>

        {/* Right side icons */}
        <div className="flex items-center px-2 sm:px-3 py-2 sm:py-3">
          <FontAwesomeIcon
            icon={faCopy}
            className={`mx-1 sm:mx-2 cursor-pointer transition-all duration-300 hidden xs:block ${
              message.trim() ? 'text-white/80 hover:text-white' : 'text-white/40 cursor-not-allowed'
            }`}
            style={{ fontSize: '16px' }}
            onClick={handleCopyText}
            title={message.trim() ? "Copy text" : "No text to copy"}
          />
          <FontAwesomeIcon
            icon={faMicrophone}
            className={`mx-1 sm:mx-2 cursor-pointer hidden sm:block transition-all duration-300 ${
              isRecording
                ? 'text-red-400 hover:text-red-300 animate-pulse'
                : 'text-white/80 hover:text-white'
            }`}
            style={{ fontSize: '16px' }}
            title={isRecording ? "Stop recording" : "Start voice recording"}
            onClick={handleMicrophoneClick}
          />
          <button
            onClick={toggleExpanded}
            className="mx-1 sm:mx-2 cursor-pointer text-white/80 hover:text-white"
            title={isExpanded ? "Collapse" : "Expand"}
          >
            <FontAwesomeIcon
              icon={isExpanded ? faCompress : faExpand}
              className="transition-transform duration-300"
              style={{ fontSize: '16px' }}
            />
          </button>
        </div>
      </div>

      {/* Send button */}
      <BubblyButton
        onClick={onSendMessage}
        variant="primary"
        className="ml-2 sm:ml-3 send-button flex items-center justify-center transition-all duration-300 touch-target"
        disabled={!message.trim() && attachments.length === 0}
        style={{
          width: window.innerWidth < 640 ? '44px' : '48px',
          height: window.innerWidth < 640 ? '44px' : '48px',
          borderRadius: '50%',
          background: (message.trim() || attachments.length > 0)
            ? 'linear-gradient(135deg, #61ACEF, #9987ED, #B679E1, #9791DB, #74BDCC, #59D2BF)'
            : 'linear-gradient(135deg, #4B5563, #6B7280)',
          boxShadow: (message.trim() || attachments.length > 0)
            ? '0 2px 8px rgba(139, 92, 246, 0.15), 0 0 12px rgba(124, 58, 237, 0.1)'
            : '0 1px 4px rgba(75, 85, 99, 0.2)',
          transform: (message.trim() || attachments.length > 0) ? 'scale(1)' : 'scale(0.95)',
        }}
      >
        <FontAwesomeIcon
          className={`transition-all duration-300 ${
            (message.trim() || attachments.length > 0) ? 'text-white text-base sm:text-lg' : 'text-gray-400 text-sm sm:text-base'
          }`}
          icon={faArrowUp}
        />
      </BubblyButton>

      {/* Typing indicator and stats */}
      <div className="absolute -top-6 sm:-top-8 left-2 sm:left-4 right-2 sm:right-4 flex justify-between items-center">
        {isTyping && (
          <div className="text-xs text-white/70 animate-pulse">
            Typing...
          </div>
        )}

        {showStats && (isExpanded || charCount > 100) && (
          <div className="text-xs text-white/70 flex items-center gap-2 sm:gap-3 ml-auto">
            <span className={charCount > maxChars * 0.8 ? 'text-yellow-400' : ''}>
              {charCount}/{maxChars}
            </span>
            <span className="hidden xs:inline">{wordCount} words</span>
            <span className="text-white/50 hidden lg:inline" title="Keyboard shortcuts">
              Ctrl+E: Expand
            </span>
          </div>
        )}
        </div>
      </div>

      {/* Hidden file inputs */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.doc,.docx,.txt"
        onChange={handleFileChange}
        style={{ display: 'none' }}
      />
      <input
        ref={imageInputRef}
        type="file"
        accept="image/*"
        onChange={handleImageChange}
        style={{ display: 'none' }}
      />
    </div>
  );
};

export default EnhancedChatInput;
