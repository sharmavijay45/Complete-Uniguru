  import React, { useState, useEffect } from "react";
import toast from "react-hot-toast";
import ChatContainer from "../components/ChatContainer";
import LoadingSpinner from "../components/LoadingSpinner";
import { useGuru } from "../context/GuruContext";
import { useChat } from "../context/ChatContext";
import LeftSidebar from "../components/LeftSidebar";

interface ChatPageProps {
  onCreateNewChat?: () => void;
  isCreatingChat?: boolean;
}

const ChatPage: React.FC<ChatPageProps> = ({ onCreateNewChat, isCreatingChat }) => {
  const { selectedGuru } = useGuru();
  const { createNewChatManually, isLoading: isChatLoading } = useChat();
  const [isCreatingChatLocal, setIsCreatingChatLocal] = useState(false);
  const [isPageLoading, setIsPageLoading] = useState(true);

  // Use props if provided, otherwise use local state
  const actualIsCreatingChat = isCreatingChat !== undefined ? isCreatingChat : isCreatingChatLocal;

  // Simulate page loading for better UX
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsPageLoading(false);
    }, 800); // Short delay to show loading state

    return () => clearTimeout(timer);
  }, []);

  // Show loading screen while page is initializing
  if (isPageLoading || isChatLoading) {
    return (
      <div className="relative h-screen overflow-hidden">
        <div className="flex items-center justify-center h-full">
          <div className="bg-glass-card backdrop-blur-xl rounded-xl p-8 border border-glass-border shadow-glass">
            <LoadingSpinner
              size="large"
              variant="orbit"
              text="Loading chat interface..."
            />
          </div>
        </div>
      </div>
    );
  }

  const handleCreateNewChat = async () => {
    if (!selectedGuru) {
      toast.error("Please select a guru first", {
        icon: '🧙‍♂️'
      });
      return;
    }

    // Use provided handler if available, otherwise use local handler
    if (onCreateNewChat) {
      onCreateNewChat();
      return;
    }

    setIsCreatingChatLocal(true);
    toast.loading("Creating new chat...", { id: "create-chat-main" });

    try {
      await createNewChatManually(selectedGuru.id);
      toast.success("New chat created! 🎉", {
        id: "create-chat-main",
        icon: '💬'
      });
    } catch (error) {
      console.error("Error creating new chat:", error);
      toast.error("Failed to create new chat. Please try again.", { id: "create-chat-main" });
    } finally {
      setIsCreatingChatLocal(false);
    }
  };

  return (
    <div className="relative h-screen overflow-hidden">
      {/* Main Chat Layout */}
      <div className="flex h-screen relative z-10 pt-16 overflow-hidden">
        {/* Left Sidebar - Hidden on mobile, visible on larger screens */}
        <div className="hidden lg:block">
          <LeftSidebar onCreateNewChat={handleCreateNewChat} isCreatingChat={actualIsCreatingChat} />
        </div>

        {/* Main Chat Area - Centered and wider */}
        <div className="flex-1 flex justify-center items-stretch overflow-hidden">
          <div className="w-full max-w-7xl flex flex-col overflow-hidden mx-auto">
            {/* Desktop Create Guru CTA - Only show when no guru is selected */}
            {!selectedGuru && (
              <div className="hidden lg:flex flex-1 items-center justify-center p-8">
                <div className="text-center max-w-2xl">
                  <div className="mb-8">
                    <div className="w-24 h-24 mx-auto mb-6 bg-gradient-to-br from-purple-500 to-blue-600 rounded-full flex items-center justify-center shadow-2xl shadow-purple-500/30">
                      <img src="/guru.png" alt="Guru" className="w-12 h-12 drop-shadow-lg" />
                    </div>
                    <h2 className="text-3xl font-bold text-white mb-4 bg-gradient-to-r from-purple-300 to-blue-300 bg-clip-text text-transparent">
                      Welcome to UniGuru
                    </h2>
                    <p className="text-gray-300 text-lg leading-relaxed">
                      Create your first AI tutor to get personalized help with any subject.
                      Each guru is tailored to your learning style and needs.
                    </p>
                  </div>
                  
                  <button
                    onClick={() => {
                      window.dispatchEvent(new CustomEvent('open-guru-create'));
                    }}
                    className="group relative inline-flex items-center justify-center gap-3 px-8 py-4 text-lg font-semibold text-white bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 rounded-xl shadow-2xl shadow-purple-500/30 hover:shadow-purple-500/50 transform hover:scale-105 transition-all duration-300 ease-out overflow-hidden"
                  >
                    {/* Animated background */}
                    <div className="absolute inset-0 bg-gradient-to-r from-purple-400 to-blue-400 opacity-0 group-hover:opacity-20 transition-opacity duration-300"></div>
                    
                    {/* Shimmer effect */}
                    <div className="absolute inset-0 -skew-x-12 bg-gradient-to-r from-transparent via-white/10 to-transparent opacity-0 group-hover:opacity-100 group-hover:animate-pulse transition-opacity duration-300"></div>
                    
                    <svg className="w-6 h-6 relative z-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                    <span className="relative z-10">Create Your First Guru</span>
                  </button>
                  
                  <div className="mt-6 text-sm text-gray-400">
                    Or open the sidebar to browse existing gurus
                  </div>
                </div>
              </div>
            )}

            {/* Chat Container - Only show when guru is selected or on mobile */}
            <div className={`flex-1 overflow-hidden ${!selectedGuru ? 'lg:hidden' : ''}`}>
              <ChatContainer />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatPage;
