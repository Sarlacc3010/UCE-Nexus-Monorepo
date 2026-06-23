import { useState, useRef, useEffect, useCallback } from 'react';
import './ChatWidget.css';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface ChatWidgetProps {
  gatewayUrl?: string;
}

const GATEWAY_URL = import.meta.env.PROD ? '' : (import.meta.env.VITE_GATEWAY_URL || 'http://localhost:3000');
const WELCOME_MESSAGE = `¡Hola! Soy **Nexus**, el asistente inteligente de UCE-Nexus 🎓

Puedo ayudarte con:
- 📚 Información sobre la UCE, carreras y facultades
- 🗓️ Eventos del campus
- 📋 Procesos de matrícula y reglamentos

Si inicias sesión, también puedo:
- 🔬 Verificar disponibilidad de laboratorios
- 📅 Hacer reservas por ti

¿En qué te puedo ayudar hoy?`;

function formatMarkdown(text: string): string {
  return text
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/`(.*?)`/g, '<code>$1</code>')
    .replace(/^#{1,3} (.+)$/gm, '<h4>$1</h4>')
    .replace(/^\| (.+) \|$/gm, (line) => {
      const cells = line.split('|').filter(c => c.trim());
      return '<tr>' + cells.map(c => `<td>${c.trim()}</td>`).join('') + '</tr>';
    })
    .replace(/(<tr>.*<\/tr>\n?)+/g, (table) => `<table>${table}</table>`)
    .replace(/^• (.+)$/gm, '<li>$1</li>')
    .replace(/(<li>.*<\/li>\n?)+/g, (list) => `<ul>${list}</ul>`)
    .replace(/^- (.+)$/gm, '<li>$1</li>')
    .replace(/\n/g, '<br/>');
}

export default function ChatWidget({ gatewayUrl = GATEWAY_URL }: ChatWidgetProps) {
  const [isDuplicate, setIsDuplicate] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: WELCOME_MESSAGE,
      timestamp: new Date(),
    },
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [userRole, setUserRole] = useState<'public' | 'user' | 'admin'>('public');
  const [conversationId] = useState(() => `conv_${Date.now()}`);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // MFE Multiple Instance Prevention
  useEffect(() => {
    if ((window as any).__NEXUS_CHATBOT_ACTIVE__) {
      setIsDuplicate(true);
    } else {
      (window as any).__NEXUS_CHATBOT_ACTIVE__ = true;
    }

    return () => {
      if (!(window as any).__NEXUS_CHATBOT_ACTIVE_DUPLICATE__) {
        (window as any).__NEXUS_CHATBOT_ACTIVE__ = false;
      }
    };
  }, []);

  // Detect if user is logged in
  useEffect(() => {
    if (isDuplicate) return;
    const token = localStorage.getItem('uce_token');
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        const roles: string[] = payload?.realm_access?.roles || [];
        
        let hasAdmin = roles.includes('admin') || roles.includes('ADMIN');
        if (!hasAdmin) {
          hasAdmin = roles.some((r: string) => r.toLowerCase().includes('admin'));
        }
        
        if (hasAdmin) {
          setUserRole('admin');
        } else {
          setUserRole('user');
        }
      } catch {
        setUserRole('public');
      }
    } else {
      setUserRole('public');
    }
  }, [isOpen, isDuplicate]);

  useEffect(() => {
    if (isOpen && !isDuplicate) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [messages, isOpen, isDuplicate]);

  const getRoleBadge = () => {
    if (userRole === 'admin') return { label: '🛡️ Admin', cls: 'role-admin' };
    if (userRole === 'user') return { label: '🎓 Estudiante', cls: 'role-student' };
    return { label: '🌐 Público', cls: 'role-public' };
  };

  const sendMessage = useCallback(async () => {
    const trimmed = inputValue.trim();
    if (!trimmed || isLoading) return;

    const userMessage: Message = {
      id: `msg_${Date.now()}`,
      role: 'user',
      content: trimmed,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);

    const history = messages
      .filter(m => m.id !== 'welcome')
      .slice(-10)
      .map(m => ({ role: m.role === 'assistant' ? 'assistant' : 'user', content: m.content }));

    try {
      const token = localStorage.getItem('uce_token');
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const response = await fetch(`${gatewayUrl}/api/chat`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          message: trimmed,
          conversation_id: conversationId,
          history,
        }),
      });

      if (response.status === 429) {
        const data = await response.json();
        throw new Error(data.detail?.message || 'Límite de mensajes alcanzado. Por favor espera un momento.');
      }

      if (!response.ok) {
        throw new Error(`Error ${response.status}`);
      }

      const data = await response.json();

      setMessages(prev => [
        ...prev,
        {
          id: `resp_${Date.now()}`,
          role: 'assistant',
          content: data.response || 'No pude generar una respuesta.',
          timestamp: new Date(),
        },
      ]);

      if (data.role && data.role !== userRole) {
        setUserRole(data.role as 'public' | 'user' | 'admin');
      }
    } catch (error: any) {
      setMessages(prev => [
        ...prev,
        {
          id: `err_${Date.now()}`,
          role: 'assistant',
          content: `⚠️ ${error.message || 'No pude conectarme con el agente. Por favor intenta de nuevo.'}`,
          timestamp: new Date(),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  }, [inputValue, isLoading, messages, conversationId, gatewayUrl, userRole]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  if (isDuplicate) {
    return null;
  }

  const roleBadge = getRoleBadge();

  return (
    <>
      {/* Floating trigger button */}
      <button
        className={`chat-trigger ${isOpen ? 'chat-trigger--open' : ''}`}
        onClick={() => setIsOpen(prev => !prev)}
        aria-label="Abrir asistente Nexus"
        id="chat-trigger-btn"
      >
        {isOpen ? (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
        )}
        {!isOpen && <span className="chat-trigger__badge">IA</span>}
      </button>

      {/* Chat panel */}
      <div className={`chat-panel ${isOpen ? 'chat-panel--open' : ''}`} id="chat-panel">
        {/* Header */}
        <div className="chat-header">
          <div className="chat-header__info">
            <div className="chat-header__avatar">N</div>
            <div>
              <div className="chat-header__title">Nexus</div>
              <div className="chat-header__subtitle">Asistente UCE-Nexus</div>
            </div>
          </div>
          <div className={`chat-header__role ${roleBadge.cls}`}>{roleBadge.label}</div>
        </div>

        {/* Messages */}
        <div className="chat-messages" id="chat-messages">
          {messages.map(msg => (
            <div key={msg.id} className={`chat-message chat-message--${msg.role}`}>
              {msg.role === 'assistant' && (
                <div className="chat-message__avatar">N</div>
              )}
              <div className="chat-message__bubble">
                <div
                  className="chat-message__content"
                  dangerouslySetInnerHTML={{ __html: formatMarkdown(msg.content) }}
                />
                <div className="chat-message__time">
                  {msg.timestamp.toLocaleTimeString('es-EC', { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            </div>
          ))}

          {/* Typing indicator */}
          {isLoading && (
            <div className="chat-message chat-message--assistant">
              <div className="chat-message__avatar">N</div>
              <div className="chat-message__bubble">
                <div className="chat-typing">
                  <span /><span /><span />
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Quick suggestions */}
        {messages.length <= 1 && (
          <div className="chat-suggestions">
            {(userRole === 'public'
              ? ['¿Cómo me matriculo?', '¿Qué eventos hay esta semana?', '¿Cuáles son las carreras de la FICA?']
              : ['Ver laboratorios disponibles', 'Reservar LAB-Cisco-01 mañana', 'Mostrar estadísticas de uso']
            ).map(suggestion => (
              <button
                key={suggestion}
                className="chat-suggestion-btn"
                onClick={() => { setInputValue(suggestion); inputRef.current?.focus(); }}
              >
                {suggestion}
              </button>
            ))}
          </div>
        )}

        {/* Input area */}
        <div className="chat-input-area">
          <input
            ref={inputRef}
            className="chat-input"
            type="text"
            placeholder="Escribe tu mensaje..."
            value={inputValue}
            onChange={e => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isLoading}
            maxLength={2000}
            id="chat-input-field"
          />
          <button
            className="chat-send-btn"
            onClick={sendMessage}
            disabled={isLoading || !inputValue.trim()}
            id="chat-send-btn"
            aria-label="Enviar mensaje"
          >
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
            </svg>
          </button>
        </div>
      </div>

      {/* Backdrop (mobile) */}
      {isOpen && <div className="chat-backdrop" onClick={() => setIsOpen(false)} />}
    </>
  );
}
