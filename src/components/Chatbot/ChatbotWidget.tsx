import { ArrowUp, MessageSquare, X } from 'lucide-react';
import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent,
} from 'react';

const MAX_MESSAGES = 50;
const TYPING_MS = 1000;

export interface ChatMessage {
  id: string;
  role: 'user' | 'bot';
  text: string;
  at: Date;
}

function mockReply(userText: string): string {
  const t = userText.trim().toLowerCase();
  if (t === 'hello') {
    return 'Hi! How can I help?';
  }
  return userText.trim();
}

function formatTime(d: Date): string {
  return d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
}

let idCounter = 0;
function nextId(): string {
  idCounter += 1;
  return `msg-${Date.now()}-${idCounter}`;
}

export function ChatbotWidget() {
  const panelId = useId();
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [typing, setTyping] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const scrollToBottom = useCallback(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, typing, scrollToBottom]);

  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    };
  }, []);

  const sendMessage = useCallback(
    (raw: string) => {
      const text = raw.trim();
      if (!text || typing) return;

      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);

      const userMsg: ChatMessage = {
        id: nextId(),
        role: 'user',
        text,
        at: new Date(),
      };

      setMessages((prev) => [...prev, userMsg].slice(-MAX_MESSAGES));
      setInput('');
      setTyping(true);

      typingTimeoutRef.current = setTimeout(() => {
        const replyText = mockReply(text);
        const botMsg: ChatMessage = {
          id: nextId(),
          role: 'bot',
          text: replyText,
          at: new Date(),
        };
        setTyping(false);
        setMessages((prev) => [...prev, botMsg].slice(-MAX_MESSAGES));
        typingTimeoutRef.current = null;
      }, TYPING_MS);
    },
    [typing]
  );

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    sendMessage(input);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  return (
    <>
      <button
        type="button"
        aria-expanded={open}
        aria-controls={open ? panelId : undefined}
        aria-label="Open Morpheus AI chat"
        onClick={() => setOpen((o) => !o)}
        className={[
          'fixed bottom-6 right-6 z-[200] flex h-14 w-14 items-center justify-center rounded-full bg-emerald text-white shadow-lg shadow-emerald/30 transition-transform duration-200 hover:scale-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald',
          open ? 'pointer-events-none scale-0 opacity-0' : 'scale-100 opacity-100',
        ].join(' ')}
      >
        <MessageSquare className="h-6 w-6" aria-hidden />
      </button>

      <div
        id={panelId}
        role="dialog"
        aria-label="Morpheus AI chat"
        aria-modal="false"
        className={[
          'fixed z-[200] flex min-h-0 flex-col overflow-hidden rounded-2xl border border-navy/10 bg-white shadow-2xl transition-all duration-300 ease-out dark:border-white/10 dark:bg-navy',
          'bottom-24 left-4 right-4 h-96 max-h-[min(384px,70vh)] sm:left-auto sm:right-6 sm:w-80 sm:max-w-[320px]',
          open
            ? 'translate-y-0 scale-100 opacity-100'
            : 'pointer-events-none translate-y-4 scale-95 opacity-0 sm:translate-y-2',
        ].join(' ')}
      >
        <header className="flex shrink-0 items-start justify-between gap-2 border-b border-navy/10 px-4 py-3 dark:border-white/10">
          <div>
            <h2 className="text-sm font-semibold tracking-tight text-navy dark:text-white">
              MORPHEUS AI
            </h2>
            <p className="text-xs text-gray dark:text-gray">Smart Financial Guidance</p>
          </div>
          <button
            type="button"
            aria-label="Close chat"
            onClick={() => setOpen(false)}
            className="rounded-lg p-1.5 text-gray transition-colors hover:bg-navy/5 hover:text-navy dark:hover:bg-white/10 dark:hover:text-white"
          >
            <X className="h-5 w-5" aria-hidden />
          </button>
        </header>

        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-3 py-3">
          {messages.length === 0 && !typing ? (
            <p className="px-1 text-center text-xs text-gray dark:text-gray">
              Ask about markets, your portfolio, or risk — mock mode echoes your message (try “hello”).
            </p>
          ) : null}
          {messages.map((m) => (
            <div
              key={m.id}
              className={m.role === 'user' ? 'flex flex-col items-end' : 'flex flex-col items-start'}
            >
              <div
                className={[
                  'max-w-[85%] rounded-2xl px-3 py-2 text-sm transition-colors',
                  m.role === 'user'
                    ? 'bg-emerald text-white'
                    : 'bg-gray/20 text-navy dark:bg-white/10 dark:text-white',
                ].join(' ')}
              >
                {m.text}
              </div>
              <time
                className="mt-1 px-1 text-[10px] text-gray dark:text-gray"
                dateTime={m.at.toISOString()}
              >
                {formatTime(m.at)}
              </time>
            </div>
          ))}
          {typing ? (
            <div className="flex flex-col items-start">
              <div
                className="flex items-center gap-1 rounded-2xl bg-gray/20 px-4 py-3 dark:bg-white/10"
                aria-live="polite"
                aria-label="Assistant is typing"
              >
                <span className="h-2 w-2 animate-chatbot-dot rounded-full bg-gray dark:bg-gray" />
                <span className="h-2 w-2 animate-chatbot-dot animate-chatbot-dot-delay-1 rounded-full bg-gray dark:bg-gray" />
                <span className="h-2 w-2 animate-chatbot-dot animate-chatbot-dot-delay-2 rounded-full bg-gray dark:bg-gray" />
              </div>
            </div>
          ) : null}
          <div ref={endRef} />
        </div>

        <form
          onSubmit={onSubmit}
          className="shrink-0 border-t border-navy/10 p-3 dark:border-white/10"
        >
          <div className="flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={onKeyDown}
              placeholder="Ask a question..."
              maxLength={2000}
              disabled={typing}
              className="min-w-0 flex-1 rounded-xl border border-navy/15 bg-white px-3 py-2 text-sm text-navy placeholder:text-gray/80 focus:border-emerald focus:outline-none focus:ring-2 focus:ring-emerald/25 dark:border-white/10 dark:bg-slate dark:text-white dark:placeholder:text-gray"
            />
            <button
              type="submit"
              aria-label="Send message"
              disabled={typing || !input.trim()}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald text-white transition-transform hover:scale-105 disabled:pointer-events-none disabled:opacity-40"
            >
              <ArrowUp className="h-5 w-5" aria-hidden />
            </button>
          </div>
        </form>
      </div>

    </>
  );
}
