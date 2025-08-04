import React, { useState } from 'react';
import toast from 'react-hot-toast';

interface GoogleOAuthDemoProps {
  onSuccess: (credential: string) => void;
  onError?: (error: any) => void;
  text?: string;
  disabled?: boolean;
  className?: string;
}

const GoogleOAuthDemo: React.FC<GoogleOAuthDemoProps> = ({
  onError,
  text = "Continue with Google",
  disabled = false,
  className = ""
}) => {
  const [isLoading, setIsLoading] = useState(false);

  const handleGoogleLogin = async () => {
    if (disabled || isLoading) return;

    setIsLoading(true);
    
    // Show informative message about Google OAuth setup
    toast.loading("Google OAuth Demo", { id: "google-demo" });
    
    setTimeout(() => {
      toast.dismiss("google-demo");
      toast.custom((t) => (
        <div className={`${t.visible ? 'animate-enter' : 'animate-leave'} max-w-md w-full bg-white shadow-lg rounded-lg pointer-events-auto flex ring-1 ring-black ring-opacity-5`}>
          <div className="flex-1 w-0 p-4">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <svg className="h-6 w-6 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="ml-3 flex-1">
                <p className="text-sm font-medium text-gray-900">
                  Google OAuth Setup Required
                </p>
                <p className="mt-1 text-sm text-gray-500">
                  To enable Google authentication, configure your Google Client ID in the environment variables.
                </p>
                <div className="mt-2 text-xs text-gray-400">
                  <p>1. Get Google Client ID from Google Cloud Console</p>
                  <p>2. Add it to VITE_GOOGLE_CLIENT_ID in .env</p>
                  <p>3. Update GOOGLE_CLIENT_ID in server .env</p>
                </div>
              </div>
            </div>
          </div>
          <div className="flex border-l border-gray-200">
            <button
              onClick={() => toast.dismiss(t.id)}
              className="w-full border border-transparent rounded-none rounded-r-lg p-4 flex items-center justify-center text-sm font-medium text-indigo-600 hover:text-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              Got it
            </button>
          </div>
        </div>
      ), {
        duration: 8000,
      });
      
      setIsLoading(false);
      onError?.(new Error("Google OAuth needs to be configured"));
    }, 1000);
  };

  return (
    <button
      type="button"
      onClick={handleGoogleLogin}
      disabled={disabled || isLoading}
      className={`
        w-full flex items-center justify-center gap-3 px-4 py-3 
        border border-gray-600 rounded-lg bg-white hover:bg-gray-50 
        text-gray-900 font-medium transition-all duration-200
        disabled:opacity-50 disabled:cursor-not-allowed
        focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 focus:ring-offset-gray-900
        ${className}
      `}
    >
      {isLoading ? (
        <div className="w-5 h-5 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin"></div>
      ) : (
        <svg className="w-5 h-5" viewBox="0 0 24 24">
          <path
            fill="#4285F4"
            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
          />
          <path
            fill="#34A853"
            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
          />
          <path
            fill="#FBBC05"
            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
          />
          <path
            fill="#EA4335"
            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
          />
        </svg>
      )}
      <span className="text-sm font-medium">
        {isLoading ? "Loading..." : text}
      </span>
    </button>
  );
};

export default GoogleOAuthDemo;
