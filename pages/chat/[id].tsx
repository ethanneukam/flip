import { useEffect, useState, useRef } from "react";
import { supabase } from "../../lib/supabaseClient";
import { Send } from "lucide-react";
import { useRouter } from "next/router";

export default function ChatRoom() {
  const router = useRouter();
  const { id } = router.query;
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [user, setUser] = useState<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const setup = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);

      const { data } = await supabase
        .from("messages")
        .select("*, sender:profiles(username, avatar_url)")
        .eq("conversation_id", id)
        .order("created_at", { ascending: true });
      setMessages(data || []);
    };

    setup();

    // Real-time subscription
    const sub = supabase
      .channel("realtime:messages")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, (payload) => {
        if (payload.new.conversation_id === id) {
          setMessages((prev) => [...prev, payload.new]);
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(sub);
    };
  }, [id]);
const channel = supabase.channel(`typing:${id}`);
  const sendMessage = async (e: any) => {
    e.preventDefault();
    if (!newMessage.trim() || !user) return;

    await supabase.from("messages").insert([
      {
        conversation_id: id,
        sender_id: user.id,
        content: newMessage.trim(),
      },
    ]);

    setNewMessage("");
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  return (
    <main className="flex flex-col h-screen bg-gray-50">
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.map((m) => (
          <div
            key={m.id}
            className={`flex ${m.sender_id === user?.id ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`p-2 rounded-2xl max-w-[70%] ${
                m.sender_id === user?.id
                  ? "bg-blue-600 text-white"
                  : "bg-white text-gray-800 shadow"
              }`}
            >
              {m.content}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      <form
        onSubmit={sendMessage}
        className="p-3 border-t bg-white flex items-center gap-2"
      >
        <input
          type="text"
          className="flex-1 border rounded-full px-3 py-2 text-sm"
          placeholder="Type a message..."
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
        />
        <button
          type="submit"
          className="bg-blue-600 text-white rounded-full p-2"
        >
          <Send size={18} />
        </button>
      </form>
    </main>
  );
}