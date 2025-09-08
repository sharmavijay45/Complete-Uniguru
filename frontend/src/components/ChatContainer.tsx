import { useState, useRef, useEffect } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCopy, faVolumeHigh, faPause, faPlay, faStop } from "@fortawesome/free-solid-svg-icons";
import uniguru from "../assets/uni-logo.png";
import userimage from "../assets/userimage.png";
import guruLogo from "../assets/guru.png";

// import BubblyButton from "./BubblyButton";

import EnhancedChatInput from "./EnhancedChatInput";
import LoadingSpinner from "./LoadingSpinner";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { useAuth } from "../context/AuthContext";
import { useChat } from "../context/ChatContext";
import { useGuru } from "../context/GuruContext";
import { sendChatRequest, getChatSessionById, scanImageText, readPdf } from "../helpers/api-communicator";

interface Message {
  text: string;
  sender: "user" | "bot";
  timestamp?: Date;
  isLoading?: boolean;
}

const ChatContainer: React.FC = () => {
  const { user } = useAuth();
  const { currentChatId } = useChat();
  const { selectedGuru } = useGuru();
  interface FileAttachment {
    id: string;
    file: File;
    type: 'image' | 'pdf' | 'document';
    preview?: string;
  }

  const [messages, setMessages] = useState<Message[]>([]);
  const [message, setMessage] = useState<string>("");
  const [attachments, setAttachments] = useState<FileAttachment[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [, setCurrentUtterance] = useState<SpeechSynthesisUtterance | null>(null);
  const [playingMessageIndex, setPlayingMessageIndex] = useState<number | null>(null);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const messagesContainerRef = useRef<HTMLDivElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const navigate = useNavigate();

  const scrollToBottom = () => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  };

  // Always scroll to bottom for all messages (new and loaded)
  useEffect(() => {
    // Always scroll to bottom to show the most recent messages
    scrollToBottom();
  }, [messages]);

  // Cleanup audio on component unmount
  useEffect(() => {
    return () => {
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  // Keyboard shortcuts for audio control
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isPlaying) {
        handleStopAudio();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isPlaying]);

  // Clear messages when guru changes
  useEffect(() => {
    setMessages([]);
    console.log(`Cleared messages due to guru change: ${selectedGuru?.name || 'None'}`);
  }, [selectedGuru]);

  // Load chat history when current chat changes
  useEffect(() => {
    const loadChatHistory = async () => {
      if (currentChatId) {
        try {
          console.log(`Loading chat history for chat ID: ${currentChatId}`);
          const response = await getChatSessionById(currentChatId);
          const chatMessages = response.chat.messages || [];
          const formattedMessages = chatMessages.map((msg: any) => ({
            text: msg.content,
            sender: msg.sender === 'user' ? 'user' : 'bot',
            timestamp: new Date(msg.timestamp)
          }));
          setMessages(formattedMessages);
          console.log(`Loaded ${formattedMessages.length} messages for chat ${currentChatId}`);

          if (formattedMessages.length > 0) {
            toast.success(`Loaded ${formattedMessages.length} previous messages`, {
              duration: 2000,
              icon: '💬'
            });
          }
        } catch (error) {
          console.error('Error loading chat history:', error);
          toast.error("Failed to load chat history", {
            duration: 2000,
            icon: '⚠️'
          });
          setMessages([]);
        }
      } else {
        // No current chat selected, clear messages
        console.log('No current chat selected, clearing messages');
        setMessages([]);
      }
    };

    loadChatHistory();
  }, [currentChatId]); // Only depend on currentChatId for proper isolation

  const handleSendMessage = async () => {
    if ((!message.trim() && attachments.length === 0) || !selectedGuru || !user || isLoading) {
      return;
    }

    const userMessage = message.trim();
    setMessage("");
    setIsLoading(true);

    // Process attachments first
    const attachmentContent = await processAttachments();
    const fullMessage = userMessage + attachmentContent;

    // Clear attachments after processing
    setAttachments([]);

    // Add user message immediately (show original message without attachment content)
    const newUserMessage: Message = {
      text: userMessage + (attachments.length > 0 ? ` [${attachments.length} file(s) attached]` : ''),
      sender: "user",
      timestamp: new Date()
    };
    setMessages(prev => [...prev, newUserMessage]);

    // Add loading message for AI response
    const loadingMessage: Message = {
      text: "Thinking...",
      sender: "bot",
      timestamp: new Date(),
      isLoading: true
    };
    setMessages(prev => [...prev, loadingMessage]);

    // Reset textarea height
    const textarea = document.querySelector("textarea");
    if (textarea) {
      textarea.style.height = "auto";
    }

    try {
      // Send message to backend with specific chat ID for proper isolation
      const response = await sendChatRequest(fullMessage, selectedGuru.id, user.id, currentChatId || undefined);

      // Remove loading message and add AI response
      if (response.aiResponse) {
        const botMessage: Message = {
          text: response.aiResponse.content,
          sender: "bot",
          timestamp: new Date()
        };

        // Replace loading message with actual response
        setMessages(prev => {
          const newMessages = [...prev];
          // Remove the loading message (last message)
          newMessages.pop();
          // Add the actual response
          newMessages.push(botMessage);
          return newMessages;
        });

        // If this created a new chat, update the current chat ID
        if (response.chat && response.chat.id && !currentChatId) {
          console.log(`New chat created with ID: ${response.chat.id}`);
          // The ChatContext should handle this automatically, but we can log it
        }
      }
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error("Failed to send message. Please try again.", {
        duration: 3000,
        icon: '❌'
      });

      // Replace loading message with error message
      const errorMessage: Message = {
        text: "Sorry, I'm having trouble responding right now. Please try again.",
        sender: "bot",
        timestamp: new Date()
      };

      setMessages(prev => {
        const newMessages = [...prev];
        // Remove the loading message (last message)
        newMessages.pop();
        // Add the error message
        newMessages.push(errorMessage);
        return newMessages;
      });
    } finally {
      setIsLoading(false);
    }
  };
  


  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Copy message text to clipboard
  const handleCopyMessage = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Message copied to clipboard!", {
        duration: 2000,
        icon: '📋'
      });
    } catch (err) {
      console.error('Failed to copy text: ', err);
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = text;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      toast.success("Message copied to clipboard!", {
        duration: 2000,
        icon: '📋'
      });
    }
  };

  // Text-to-speech functionality
  const handleTextToSpeech = (text: string, messageIndex: number) => {
    if ('speechSynthesis' in window) {
      // If already playing this message, pause/resume
      if (isPlaying && playingMessageIndex === messageIndex) {
        if (window.speechSynthesis.paused) {
          window.speechSynthesis.resume();
          toast.success("Audio resumed", {
            duration: 1000,
            icon: '▶️'
          });
        } else {
          window.speechSynthesis.pause();
          toast.success("Audio paused", {
            duration: 1000,
            icon: '⏸️'
          });
        }
        return;
      }

      // Cancel any ongoing speech
      window.speechSynthesis.cancel();
      setIsPlaying(false);
      setCurrentUtterance(null);
      setPlayingMessageIndex(null);

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.9;
      utterance.pitch = 1;
      utterance.volume = 0.8;

      // Try to use a more natural voice if available
      const voices = window.speechSynthesis.getVoices();
      const preferredVoice = voices.find(voice =>
        voice.name.includes('Google') ||
        voice.name.includes('Microsoft') ||
        voice.lang.startsWith('en')
      );

      if (preferredVoice) {
        utterance.voice = preferredVoice;
      }

      utterance.onstart = () => {
        setIsPlaying(true);
        setCurrentUtterance(utterance);
        setPlayingMessageIndex(messageIndex);
        toast.success("Playing audio...", {
          duration: 1500,
          icon: '🔊'
        });
      };

      utterance.onend = () => {
        setIsPlaying(false);
        setCurrentUtterance(null);
        setPlayingMessageIndex(null);
        toast.success("Audio finished", {
          duration: 1000,
          icon: '✅'
        });
      };

      utterance.onerror = (_event) => {
        setIsPlaying(false);
        setCurrentUtterance(null);
        setPlayingMessageIndex(null);
        toast.error("Failed to play audio", {
          duration: 2000,
          icon: '❌'
        });
      };

      window.speechSynthesis.speak(utterance);
    } else {
      toast.error("Text-to-speech not supported in this browser", {
        duration: 3000,
        icon: '❌'
      });
    }
  };

  // Stop audio playback
  const handleStopAudio = () => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      setIsPlaying(false);
      setCurrentUtterance(null);
      setPlayingMessageIndex(null);
      toast.success("Audio stopped", {
        duration: 1000,
        icon: '⏹️'
      });
    }
  };

  // Handle file upload (add to attachments for preview)
  const handleFileUpload = async (file: File) => {
    const fileType = file.type;
    const fileName = file.name.toLowerCase();

    // Determine file type
    let type: 'image' | 'pdf' | 'document' = 'document';
    if (fileType.startsWith('image/')) {
      type = 'image';
    } else if (fileType === 'application/pdf' || fileName.endsWith('.pdf')) {
      type = 'pdf';
    }

    // Create attachment object
    const attachment: FileAttachment = {
      id: Date.now().toString(),
      file,
      type,
    };

    // Generate preview for images
    if (type === 'image') {
      const reader = new FileReader();
      reader.onload = (e) => {
        attachment.preview = e.target?.result as string;
        setAttachments(prev => [...prev, attachment]);
      };
      reader.readAsDataURL(file);
    } else {
      setAttachments(prev => [...prev, attachment]);
    }

    toast.success(`${type === 'image' ? 'Image' : type === 'pdf' ? 'PDF' : 'File'} attached successfully!`, {
      duration: 2000,
      icon: type === 'image' ? '🖼️' : type === 'pdf' ? '📄' : '📎'
    });
  };

  // Remove attachment
  const handleRemoveAttachment = (id: string) => {
    setAttachments(prev => prev.filter(att => att.id !== id));
    toast.success("File removed", {
      duration: 1500,
      icon: '🗑️'
    });
  };

  // Process attachments when sending message
  const processAttachments = async (): Promise<string> => {
    if (attachments.length === 0) return '';

    let extractedContent = '';

    for (const attachment of attachments) {
      try {
        if (attachment.type === 'image') {
          toast.loading(`Processing ${attachment.file.name}...`, { id: `process-${attachment.id}` });
          const result = await scanImageText(attachment.file);
          if (result.extractedText) {
            extractedContent += `\n\n[Image: ${attachment.file.name}]\n${result.extractedText}`;
            toast.success(`Image processed successfully!`, { id: `process-${attachment.id}`, icon: '🖼️' });
          }
        } else if (attachment.type === 'pdf') {
          toast.loading(`Processing ${attachment.file.name}...`, { id: `process-${attachment.id}` });
          const result = await readPdf(attachment.file);
          if (result.extractedText) {
            extractedContent += `\n\n[PDF: ${attachment.file.name}]\n${result.extractedText}`;
            toast.success(`PDF processed successfully!`, { id: `process-${attachment.id}`, icon: '📄' });
          }
        }
      } catch (error) {
        console.error(`Error processing ${attachment.file.name}:`, error);
        toast.error(`Failed to process ${attachment.file.name}`, { id: `process-${attachment.id}` });
      }
    }

    return extractedContent;
  };

  return (
    <div
      className="chat-container flex flex-col text-white transition-all duration-300 relative overflow-hidden"
      style={{
        width: "100%",
      }}
    >




      {/* Selected Guru Display */}
      {selectedGuru && (
        <div className="w-full flex justify-center px-3 sm:px-4 pt-4 pb-3 flex-shrink-0">
          <div className="max-w-md w-full bg-white/5 backdrop-blur-sm rounded-lg p-3 border border-white/10">
            <div className="flex items-center justify-center gap-3">
              {/* Simple Avatar */}
              <div className="relative">
                <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-purple-600 rounded-full flex items-center justify-center">
                  <img src={guruLogo} alt="Guru" className="w-6 h-6" />
                </div>
                {/* Simple online dot */}
                <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-400 rounded-full border-2 border-gray-900"></div>
              </div>

              {/* Centered Guru info */}
              <div className="text-center">
                <h3 className="text-white font-medium text-sm">
                  {selectedGuru.name}
                </h3>
                <p className="text-gray-400 text-xs">
                  {selectedGuru.subject}
                </p>
              </div>

              {/* Simple status */}
              <div className="text-xs text-green-400 bg-green-400/10 px-2 py-1 rounded-full">
                Active
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Audio Status Indicator */}
      {isPlaying && (
        <div className="w-full flex justify-center px-3 sm:px-4 pb-3 flex-shrink-0">
          <div className="max-w-sm w-full bg-green-500/10 backdrop-blur-sm rounded-lg p-3 border border-green-400/20">
            <div className="flex items-center justify-center gap-3">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
              <span className="text-green-300 text-sm">Audio playing...</span>
              <div className="flex items-center space-x-2">
                <FontAwesomeIcon
                  icon={window.speechSynthesis?.paused ? faPlay : faPause}
                  className="text-green-400 hover:text-green-300 cursor-pointer transition-colors text-sm"
                  onClick={() => {
                    if (playingMessageIndex !== null) {
                      const message = messages[playingMessageIndex];
                      if (message) {
                        handleTextToSpeech(message.text, playingMessageIndex);
                      }
                    }
                  }}
                  title={window.speechSynthesis?.paused ? "Resume audio" : "Pause audio"}
                />
                <FontAwesomeIcon
                  icon={faStop}
                  className="text-red-400 hover:text-red-300 cursor-pointer transition-colors text-sm"
                  onClick={handleStopAudio}
                  title="Stop audio"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Chat messages */}
      <div
        ref={messagesContainerRef}
        className={`chat-messages-area flex-1 w-full max-w-6xl flex px-4 sm:px-8 py-2 chat-messages-container mx-auto ${
          messages.length > 0 ? 'flex-col gap-3 sm:gap-4' : 'items-center justify-center lg:min-h-[60vh]'
        }`}
        style={{
          minHeight: 0, // Important for flex-1 to work with overflow
          overflowY: 'auto',
          overflowX: 'hidden',
          scrollbarGutter: 'stable',
          position: 'relative',
        }}
      >
        {messages.length > 0 ? (
          messages.map((msg, index) => (
            <div
              key={index}
              className={`flex items-center ${
                msg.sender === "user" ? "justify-end" : "justify-start"
              }`}
              style={{
                width: "100%",
              }}
            >
              {msg.sender === "bot" && (
                <img
                  src={uniguru}
                  alt="Bot Logo"
                  className="w-8 h-8 sm:w-10 sm:h-10 lg:w-12 lg:h-12 rounded-full mr-2 sm:mr-3 flex-shrink-0"
                />
              )}
              <div
                className={`px-3 sm:px-4 py-2 sm:py-2.5 rounded-lg relative ${
                  msg.sender === "bot" && !msg.isLoading ? "flex flex-col" : "flex items-center"
                } ${
                  msg.sender === "user"
                    ? "bg-[linear-gradient(135deg,_#61ACEF,_#9987ED,_#B679E1,_#9791DB,_#74BDCC,_#59D2BF)] text-black"
                    : "border border-gray-700 text-white"
                }`}
                style={{
                  display: "inline-block",
                  maxWidth: "85%", // Increased for mobile
                  wordWrap: "break-word",
                  overflowWrap: "break-word",
                  wordBreak: "break-word",
                  alignSelf: msg.sender === "user" ? "flex-end" : "flex-start",
                  marginTop: "10px",
                  fontSize: window.innerWidth < 640 ? "14px" : "16px", // Responsive font size
                  marginBottom: msg.sender === "bot" && !msg.isLoading ? (window.innerWidth < 640 ? "8px" : "20px") : "0px",
                }}
              >
                {msg.isLoading ? (
                  <div className="flex items-center space-x-3">
                    <LoadingSpinner size="small" variant="dots" />
                    <span className="text-purple-300 text-sm">Guru is thinking...</span>
                  </div>
                ) : (
                  <div className={msg.sender === "bot" ? "w-full" : ""}>
                    {msg.text}
                  </div>
                )}
                {msg.sender === "bot" && !msg.isLoading && (
                  <div className="mt-2 flex items-center justify-end space-x-2 sm:absolute sm:bottom-[-18px] sm:mt-0 sm:bottom-[-20px] sm:right-0 sm:space-x-1.5 sm:space-x-2">
                    {/* Audio Controls */}
                    {isPlaying && playingMessageIndex === index ? (
                      <div className="flex items-center space-x-1">
                        <FontAwesomeIcon
                          icon={window.speechSynthesis?.paused ? faPlay : faPause}
                          className="text-purple-400 hover:text-purple-300 cursor-pointer transition-colors"
                          style={{ fontSize: window.innerWidth < 640 ? '12px' : '14px' }}
                          onClick={() => handleTextToSpeech(msg.text, index)}
                          title={window.speechSynthesis?.paused ? "Resume audio" : "Pause audio"}
                        />
                        <FontAwesomeIcon
                          icon={faStop}
                          className="text-red-400 hover:text-red-300 cursor-pointer transition-colors"
                          style={{ fontSize: window.innerWidth < 640 ? '12px' : '14px' }}
                          onClick={handleStopAudio}
                          title="Stop audio"
                        />
                      </div>
                    ) : (
                      <FontAwesomeIcon
                        icon={faVolumeHigh}
                        className="text-gray-400 hover:text-purple-400 cursor-pointer transition-colors"
                        style={{ fontSize: window.innerWidth < 640 ? '12px' : '14px' }}
                        onClick={() => handleTextToSpeech(msg.text, index)}
                        title="Read aloud"
                      />
                    )}
                    <FontAwesomeIcon
                      icon={faCopy}
                      className="text-gray-400 hover:text-purple-400 cursor-pointer transition-colors"
                      style={{ fontSize: window.innerWidth < 640 ? '12px' : '14px' }}
                      onClick={() => handleCopyMessage(msg.text)}
                      title="Copy message"
                    />
                  </div>
                )}

              </div>
              {msg.sender === "user" && (
                <img
                  src={userimage}
                  alt="User"
                  className="w-6 h-6 sm:w-8 sm:h-8 rounded-full ml-2 sm:ml-3 flex-shrink-0"
                />
              )}
            </div>
          ))
        ) : (
          <>
            {!selectedGuru ? (
              <div></div>
            ) : (
              <div className="text-center">
                <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-r from-purple-500/30 to-blue-500/30 rounded-full flex items-center justify-center border border-purple-400/20">
                  <img src={guruLogo} alt="Guru" className="w-8 h-8" />
                </div>
                <p className="text-gray-400 text-sm sm:text-base">Ready to chat with {selectedGuru.name}!</p>
                <p className="text-gray-500 text-xs sm:text-sm mt-2">Expert in: {selectedGuru.subject}</p>
              </div>
            )}
          </>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Fixed Input Area */}
      {selectedGuru ? (
        <div className="chat-input-area flex-shrink-0 w-full pt-3 pb-4 bg-gradient-to-t from-black/20 to-transparent">
          <div className="w-full max-w-6xl mx-auto px-4 sm:px-8">
            <EnhancedChatInput
              message={message}
              setMessage={setMessage}
              onSendMessage={handleSendMessage}
              onKeyDown={handleKeyDown}
              textareaRef={textareaRef}
              onFileUpload={handleFileUpload}
              attachments={attachments}
              onRemoveAttachment={handleRemoveAttachment}
            />
          </div>

          <div className="text-center text-gray-400 mt-2 text-[10px] xs:text-xs sm:text-sm px-4">
            Guru can make mistakes. Check important info.
          </div>
        </div>
      ) : (
        <div className="chat-input-area flex-shrink-0 w-full pt-3 pb-4 fixed inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-full max-w-3xl mx-auto px-4 sm:px-8 pointer-events-auto">
            <div className="bg-gradient-to-br from-white/10 via-white/5 to-transparent backdrop-blur-xl rounded-3xl border border-white/20 p-12 sm:p-16 text-center shadow-2xl shadow-black/20 transform hover:scale-105 transition-all duration-300">
              <div className="flex items-center justify-center gap-3 mb-6">
                <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full flex items-center justify-center shadow-lg">
                  <img src={guruLogo} alt="Guru" className="w-7 h-7" />
                </div>
                <h4 className="text-white font-semibold text-lg sm:text-xl bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">No guru selected</h4>
              </div>
              <p className="text-gray-300 text-sm sm:text-base mb-8 leading-relaxed">
                Create or select a guru to start chatting.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <button
                  onClick={() => {
                    window.dispatchEvent(new CustomEvent('open-guru-create'));
                  }}
                  className="w-full sm:w-auto px-8 py-3 rounded-xl bg-gradient-to-r from-purple-600 via-purple-500 to-blue-600 hover:from-purple-500 hover:via-purple-400 hover:to-blue-500 text-white text-sm font-semibold shadow-xl shadow-purple-500/30 transform hover:scale-105 hover:-translate-y-1 transition-all duration-300 border border-purple-400/30"
                >
                  Create Guru
                </button>
                <button
                  onClick={() => {
                    window.dispatchEvent(new CustomEvent('restart-guru-onboarding'));
                  }}
                  className="w-full sm:w-auto px-8 py-3 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 hover:border-white/30 text-white text-sm font-semibold backdrop-blur-sm transform hover:scale-105 hover:-translate-y-1 transition-all duration-300 shadow-lg"
                >
                  How to Guru?
                </button>
              </div>
            </div>
          </div>
        </div>
      )}


    </div>
  );
};

export default ChatContainer;
