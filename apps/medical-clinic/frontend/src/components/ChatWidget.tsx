import { useState, useRef, useEffect, useCallback } from 'react';
import { useVoiceInput } from '../hooks/useVoiceInput';
import { usePatientAuth } from '../contexts/PatientAuthContext';
import {
  ChatQuickReplies,
  ChatProviderCards,
  ChatTimeGrid,
  ChatAppointmentTypes,
} from './chat';

interface UIComponent {
  type: 'provider-select' | 'appointment-types' | 'time-grid' | 'date-picker' | 'quick-replies';
  data: unknown;
}

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  requiresAuth?: boolean; // Flag to show sign-in prompt after this message
  uiComponents?: UIComponent[]; // Rich UI components to render
}

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3080';

export function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSignInPrompt, setShowSignInPrompt] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  // Ref to hold latest sendMessage to avoid stale closure in handleAutoSend
  const sendMessageRef = useRef<(content: string) => Promise<void>>();
  // Ref to always have access to current messages (avoids stale closure issues)
  const messagesRef = useRef<Message[]>([]);

  // Patient authentication
  const { isSignedIn, isLoaded: authLoaded, signIn, getToken, clerkAvailable } = usePatientAuth();

  // Voice input integration - use ref to avoid stale closure
  const handleAutoSend = useCallback((transcript: string) => {
    if (transcript.trim() && sendMessageRef.current) {
      sendMessageRef.current(transcript.trim());
    }
  }, []);

  const {
    isListening,
    isSupported: voiceSupported,
    transcript,
    interimTranscript,
    startListening,
    stopListening,
    clearTranscript,
    error: voiceError,
  } = useVoiceInput({
    silenceTimeout: 1500,
    onAutoSend: handleAutoSend,
  });

  // Update input value with voice transcript
  useEffect(() => {
    if (transcript || interimTranscript) {
      setInputValue(transcript + (interimTranscript ? ` ${interimTranscript}` : ''));
    }
  }, [transcript, interimTranscript]);

  // Keep messagesRef in sync with messages state
  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus input when chat opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  // Welcome menu quick replies
  const welcomeQuickReplies = [
    { label: 'Find a doctor', value: 'Find a doctor' },
    { label: 'Check availability', value: 'Check appointment availability' },
    { label: 'My appointments', value: 'View my appointments' },
    { label: 'Appointment types', value: 'See appointment types' },
    { label: 'Book appointment', value: 'Book an appointment' },
  ];

  // Show welcome message on first open
  useEffect(() => {
    if (isOpen && messages.length === 0) {
      setMessages([{
        id: 'welcome',
        role: 'assistant',
        content: "Hello! I'm your clinic assistant. How can I help you today?",
        timestamp: new Date(),
        uiComponents: [{ type: 'quick-replies', data: welcomeQuickReplies }],
      }]);
    }
  }, [isOpen, messages.length]);

  // Clear sign-in prompt when user signs in
  useEffect(() => {
    if (isSignedIn) {
      setShowSignInPrompt(false);
    }
  }, [isSignedIn]);

  const sendMessage = async (content: string) => {
    if (!content.trim() || isLoading) return;

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: content.trim(),
      timestamp: new Date(),
    };

    // Use messagesRef to get the current messages (avoids stale closure)
    const currentMessages = [...messagesRef.current, userMessage];

    // Build messages array for API (exclude welcome message)
    const apiMessages = currentMessages
      .filter(m => m.id !== 'welcome')
      .map(m => ({ role: m.role, content: m.content }));

    // Update both state and ref immediately
    messagesRef.current = currentMessages;
    setMessages(currentMessages);
    setInputValue('');
    clearTranscript();
    setIsLoading(true);
    setError(null);

    try {

      // Get auth token if signed in
      const token = await getToken();

      const response = await fetch(`${API_BASE}/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { Authorization: `Bearer ${token}` }),
        },
        body: JSON.stringify({ messages: apiMessages }),
      });

      if (!response.ok) {
        if (response.status === 429) {
          throw new Error('Too many messages. Please wait a moment and try again.');
        }
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to send message');
      }

      const data = await response.json();

      // Check if any tool result requires authentication
      const requiresAuth = data.toolResults?.some(
        (tr: { tool: string; result: { requiresAuth?: boolean } }) => tr.result?.requiresAuth === true
      );

      const assistantMessage: Message = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: data.response,
        timestamp: new Date(),
        requiresAuth,
        uiComponents: data.uiComponents,
      };

      setMessages(prev => [...prev, assistantMessage]);

      // Show sign-in prompt if auth is required
      if (requiresAuth && !isSignedIn && clerkAvailable) {
        setShowSignInPrompt(true);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send message');
    } finally {
      setIsLoading(false);
      // Re-focus input after response
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  };

  // Keep sendMessageRef updated with the latest sendMessage function
  useEffect(() => {
    sendMessageRef.current = sendMessage;
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(inputValue);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(inputValue);
    }
  };

  const toggleVoice = () => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };

  // Format message content with line breaks
  const formatContent = (content: string) => {
    return content.split('\n').map((line, i) => (
      <span key={i}>
        {line}
        {i < content.split('\n').length - 1 && <br />}
      </span>
    ));
  };

  return (
    <>
      {/* Chat toggle button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-6 right-6 z-50 w-14 h-14 bg-primary-600 text-white rounded-full shadow-lg hover:bg-primary-700 transition-all focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
        aria-label={isOpen ? 'Close chat' : 'Open chat assistant'}
      >
        {isOpen ? (
          <svg className="w-6 h-6 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        ) : (
          <svg className="w-6 h-6 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
          </svg>
        )}
      </button>

      {/* Chat panel */}
      {isOpen && (
        <div
          className="fixed z-50 bg-white shadow-2xl flex flex-col border border-gray-200
                     inset-0 sm:inset-auto sm:bottom-24 sm:right-6 sm:w-96 sm:h-[500px] sm:rounded-lg"
          role="dialog"
          aria-label="Chat assistant"
        >
          {/* Header */}
          <div className="px-4 py-3 bg-primary-600 text-white sm:rounded-t-lg flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
              <h2 className="font-medium">Clinic Assistant</h2>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="text-white/80 hover:text-white"
              aria-label="Close chat"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[90%] rounded-lg px-4 py-2 ${
                    message.role === 'user'
                      ? 'bg-primary-600 text-white'
                      : 'bg-gray-100 text-gray-800'
                  }`}
                >
                  <p className="text-sm whitespace-pre-wrap">{formatContent(message.content)}</p>

                  {/* Render rich UI components */}
                  {message.uiComponents?.map((component, idx) => (
                    <div key={idx}>
                      {component.type === 'provider-select' && (
                        <ChatProviderCards
                          providers={component.data as Array<{
                            id: string;
                            name: string;
                            displayName?: string;
                            specialty: string;
                            team?: string;
                            acceptsNewPatients?: boolean;
                          }>}
                          onSelect={(provider) => sendMessage(`I'd like to see ${provider.name}`)}
                          disabled={isLoading}
                        />
                      )}
                      {component.type === 'appointment-types' && (
                        <ChatAppointmentTypes
                          types={component.data as Array<{
                            id: string;
                            name: string;
                            duration: number;
                            description?: string;
                            isCommon?: boolean;
                          }>}
                          onSelect={(type) => sendMessage(`${type.name} appointment`)}
                          disabled={isLoading}
                        />
                      )}
                      {component.type === 'time-grid' && (
                        <ChatTimeGrid
                          slots={(component.data as { slots: Array<{ time: string; available: boolean }> }).slots}
                          onSelect={(time) => sendMessage(`${time} please`)}
                          disabled={isLoading}
                        />
                      )}
                      {component.type === 'quick-replies' && (
                        <ChatQuickReplies
                          replies={component.data as Array<{ label: string; value: string }>}
                          onSelect={(value) => sendMessage(value)}
                          disabled={isLoading}
                        />
                      )}
                    </div>
                  ))}

                  <p className={`text-xs mt-1 ${
                    message.role === 'user' ? 'text-primary-200' : 'text-gray-400'
                  }`}>
                    {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
            ))}

            {/* Loading indicator */}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-gray-100 rounded-lg px-4 py-2">
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              </div>
            )}

            {/* Error display */}
            {(error || voiceError) && (
              <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-2">
                <p className="text-sm text-red-600">{error || voiceError}</p>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Voice listening indicator */}
          {isListening && (
            <div className="px-4 py-2 bg-red-50 border-t border-red-100 flex items-center gap-2">
              <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
              <span className="text-sm text-red-600">Listening... speak now</span>
            </div>
          )}

          {/* Sign-in prompt for booking */}
          {showSignInPrompt && !isSignedIn && clerkAvailable && (
            <div className="px-4 py-3 bg-blue-50 border-t border-blue-200">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 mt-0.5">
                  <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="flex-1">
                  <p className="text-sm text-blue-800 font-medium">Sign in to complete your booking</p>
                  <p className="text-xs text-blue-600 mt-1">You'll receive a magic link via email - no password needed!</p>
                </div>
              </div>
              <button
                onClick={() => signIn()}
                className="mt-3 w-full py-2 px-4 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                </svg>
                Sign In to Continue
              </button>
            </div>
          )}

          {/* Input area */}
          <form onSubmit={handleSubmit} className="p-4 border-t border-gray-200">
            <div className="flex items-end gap-2">
              <textarea
                ref={inputRef}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Type a message or tap the mic..."
                className="flex-1 resize-none border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 max-h-24"
                rows={1}
                disabled={isLoading}
              />

              {/* Voice button */}
              {voiceSupported && (
                <button
                  type="button"
                  onClick={toggleVoice}
                  className={`p-2 rounded-lg transition-colors ${
                    isListening
                      ? 'bg-red-500 text-white hover:bg-red-600'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                  aria-label={isListening ? 'Stop listening' : 'Start voice input'}
                  disabled={isLoading}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
                    />
                  </svg>
                </button>
              )}

              {/* Send button */}
              <button
                type="submit"
                disabled={!inputValue.trim() || isLoading}
                className="p-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                aria-label="Send message"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                  />
                </svg>
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}
