/// <reference types="vite/client" />

declare module 'chatbot/ChatWidget' {
  import { ComponentType } from 'react';
  const ChatWidget: ComponentType<{ gatewayUrl?: string }>;
  export default ChatWidget;
}
