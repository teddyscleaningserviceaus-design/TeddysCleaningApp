import React, { createContext, useContext, useState } from 'react';

interface ChatContextType {
  isInChatView: boolean;
  setIsInChatView: (value: boolean) => void;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export const ChatProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isInChatView, setIsInChatView] = useState(false);

  return (
    <ChatContext.Provider value={{ isInChatView, setIsInChatView }}>
      {children}
    </ChatContext.Provider>
  );
};

export const useChatContext = () => {
  const context = useContext(ChatContext);
  if (context === undefined) {
    throw new Error('useChatContext must be used within a ChatProvider');
  }
  return context;
};