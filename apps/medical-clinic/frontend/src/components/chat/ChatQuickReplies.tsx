interface QuickReply {
  label: string;
  value: string;
}

interface ChatQuickRepliesProps {
  replies: QuickReply[];
  onSelect: (value: string) => void;
  disabled?: boolean;
}

export function ChatQuickReplies({ replies, onSelect, disabled }: ChatQuickRepliesProps) {
  return (
    <div className="flex flex-wrap gap-2 mt-3">
      {replies.map((reply, index) => (
        <button
          key={index}
          onClick={() => onSelect(reply.value)}
          disabled={disabled}
          className="px-3 py-1.5 text-sm bg-white border border-primary-300 text-primary-700 rounded-full hover:bg-primary-50 hover:border-primary-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-1"
        >
          {reply.label}
        </button>
      ))}
    </div>
  );
}
