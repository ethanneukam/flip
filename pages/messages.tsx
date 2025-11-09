import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import Link from "next/link";
import { MessageCircle } from "lucide-react";
import BottomNav from "../components/BottomNav";
import { subscribeToMessages } from "../lib/realtimeClient";
import AuthWrapper from "../components/AuthWrapper";

export default function MessagesPage() {
  const [conversations, setConversations] = useState<any[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [chatId, setChatId] = useState<string | null>(null);
  const [newMsg, setNewMsg] = useState("");

  // Load conversations list
  useEffect(() => {
    const loadConversations = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      setUserId(user.id);

      const { data, error } = await supabase
        .from("conversations")
        .select(
          "*, user1:profiles!user1(username, avatar_url), user2:profiles!user2(username, avatar_url)"
        )
        .or(`user1.eq.${user.id},user2.eq.${user.id}`)
        .order("created_at", { ascending: false });

      if (!error) setConversations(data || []);
    };
    loadConversations();
  }, []);

  // Load first chat and subscribe to messages
  useEffect(() => {
    const loadChat = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      // Example: get the first chat for now
      const { data } = await supabase
        .from("chats")
        .select("id")
        .or(`user1.eq.${user.id},user2.eq.${user.id}`)
        .limit(1)
        .single();

      if (data) {
        setChatId(data.id);
        const { data: msgs } = await supabase
          .from("messages")
          .select("*")
          .eq("chat_id", data.id)
          .order("created_at", { ascending: true });
        setMessages(msgs || []);

        subscribeToMessages(data.id, (msg: any) =>
          setMessages((prev) => [...prev, msg])
        );
      }
    };
    loadChat();
  }, []);

  // Send a message
  const sendMessage = async () => {
    if (!chatId || !newMsg.trim()) return;
    const {
      data: { user },
    } = await supabase.auth.getUser();
    await supabase
      .from("messages")
      .insert([{ chat_id: chatId, sender_id: user.id, content: newMsg }]);
    setNewMsg("");
  };

  return (
    <AuthWrapper>
      <main className="max-w-md mx-auto p-4 pb-20 space-y-6">
        {/* Conversations Header */}
        <h1 className="text-2xl font-bold mb-4 flex items-center gap-2">
          <MessageCircle /> Messages
        </h1>

        {/* Conversations List */}
        {conversations.length === 0 ? (
          <p className="text-gray-500">No conversations yet.</p>
        ) : (
          <ul className="divide-y">
            {conversations.map((c) => {
              const other = c.user1.id === userId ? c.user2 : c.user1;
              return (
                <Link key={c.id} href={`/chat/${c.id}`}>
                  <li className="p-3 flex items-center gap-3 hover:bg-gray-50 cursor-pointer">
                    <img
                      src={other.avatar_url || "/default-avatar.png"}
                      alt={other.username}
                      className="w-10 h-10 rounded-full"
                    />
                    <div>
                      <p className="font-semibold">{other.username}</p>
                      <p className="text-sm text-gray-500">Tap to open chat</p>
                    </div>
                  </li>
                </Link>
              );
            })}
          </ul>
        )}

        {/* Chat Window */}
        <div className="border rounded p-2 h-96 overflow-y-auto bg-gray-50">
          {messages.map((msg) => (
            <p key={msg.id} className="mb-1">
              <span className="font-semibold">{msg.sender_id.slice(0, 6)}:</span>{" "}
              {msg.content}
            </p>
          ))}
        </div>

        {/* Message Input */}
        <div className="flex space-x-2">
          <input
            value={newMsg}
            onChange={(e) => setNewMsg(e.target.value)}
            className="border p-2 flex-grow rounded"
            placeholder="Type a message..."
          />
          <button
            onClick={sendMessage}
            className="bg-blue-600 text-white px-4 py-2 rounded"
          >
            Send
          </button>
        </div>

        <BottomNav />
      </main>
    </AuthWrapper>
  );
}