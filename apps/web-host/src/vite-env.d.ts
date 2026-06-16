/// <reference types="vite/client" />

declare module 'academic/DashboardApp' {
  import { ComponentType } from 'react';
  const DashboardApp: ComponentType;
  export default DashboardApp;
}

declare module 'academic/BookingApp' {
  import { ComponentType } from 'react';
  const BookingApp: ComponentType;
  export default BookingApp;
}

declare module 'gateway/GatewayApp' {
  import { ComponentType } from 'react';
  const GatewayApp: ComponentType;
  export default GatewayApp;
}

declare module 'chatbot/ChatWidget' {
  import { ComponentType } from 'react';
  const ChatWidget: ComponentType<{ gatewayUrl?: string }>;
  export default ChatWidget;
}
