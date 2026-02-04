import React, { useEffect, useMemo, useState } from "react";
import { collection, onSnapshot } from "firebase/firestore";
import { db } from "../../lib/firebase";

export default function ChatbotWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [products, setProducts] = useState([]);
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      content: "Hi! I\"m SmartStock AI. Ask me about inventory, low stock, or trends."
    }
  ]);

  const apiKey = useMemo(
    () => process.env.REACT_APP_GROQ_API_KEY || "",
    []
  );

  useEffect(() => {
    if (!db) return;

    const unsubscribe = onSnapshot(
      collection(db, "products"),
      (snapshot) => {
        const items = [];
        snapshot.forEach((doc) => {
          items.push({ id: doc.id, ...doc.data() });
        });
        setProducts(items);
      },
      () => {
        setError("Failed to load inventory data.");
      }
    );

    return () => unsubscribe();
  }, []);

  const normalizeText = (value) =>
    (value || "").toString().trim().toLowerCase();

  const getInventoryAnswer = (text) => {
    const query = normalizeText(text);
    if (!query) return null;

    const isProductQuery =
      /quantity|stock|how many|available|in stock|price|buy|sell|purchase|details|info|specifications|specs/.test(query);

    if (!isProductQuery || products.length === 0) return null;

    const byName = products.filter((p) =>
      normalizeText(p.name) && query.includes(normalizeText(p.name))
    );

    const byCategory = products.filter((p) =>
      normalizeText(p.category) && query.includes(normalizeText(p.category))
    );

    const byProductId = products.filter((p) =>
      normalizeText(p.productId) && query.includes(normalizeText(p.productId))
    );

    let matches = byName.length > 0 ? byName : byProductId;
    if (matches.length && byCategory.length) {
      matches = matches.filter((p) =>
        normalizeText(p.category) &&
        query.includes(normalizeText(p.category))
      );
    }

    if (matches.length === 1) {
      const item = matches[0];
      const details = [];
      if (item.productId) details.push(`Product ID: ${item.productId}`);
      if (item.name) details.push(`Name: ${item.name}`);
      if (item.category) details.push(`Category: ${item.category}`);
      if (item.quantity != null) details.push(`Quantity: ${item.quantity}`);
      if (item.purchasePrice != null) details.push(`Purchase Price: $${item.purchasePrice}`);
      if (item.sellingPrice != null) details.push(`Selling Price: $${item.sellingPrice}`);
      if (item.warehouse) details.push(`Warehouse: ${item.warehouse}`);
      
      return details.join("\n");
    }

    if (matches.length > 1) {
      const list = matches
        .slice(0, 5)
        .map((p) => `${p.name} (Qty: ${p.quantity ?? 0}, Price: $${p.sellingPrice ?? 0})`)
        .join("\n");
      return `I found multiple matches:\n${list}\n\nPlease specify the exact product name.`;
    }

    if (!byName.length && !byProductId.length && byCategory.length) {
      const total = byCategory.reduce(
        (sum, p) => sum + Number(p.quantity || 0),
        0
      );
      const categoryName = byCategory[0]?.category || "that category";
      const items = byCategory
        .slice(0, 5)
        .map((p) => `• ${p.name}: Qty ${p.quantity ?? 0}, Price $${p.sellingPrice ?? 0}`)
        .join("\n");
      return `Total quantity in ${categoryName}: ${total}\n\nProducts:\n${items}`;
    }

    return null;
  };

  const sendMessage = async () => {
    const trimmed = input.trim();
    if (!trimmed || isLoading) return;

    if (!apiKey) {
      setError("Chatbot API key is not configured.");
      return;
    }

    const userMessage = { role: "user", content: trimmed };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);
    setError("");

    try {
      const localReply = getInventoryAnswer(trimmed);
      if (localReply) {
        setMessages((prev) => [...prev, { role: "assistant", content: localReply }]);
        setIsLoading(false);
        return;
      }

      const systemMessage = {
        role: "system",
        content:
          "You are SmartStock AI assistant for inventory management. Be concise and helpful."
      };

      const response = await fetch(
        "https://api.groq.com/openai/v1/chat/completions",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            model: "llama-3.1-8b-instant",
            messages: [systemMessage, ...messages, userMessage]
          })
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data?.error?.message || "Failed to get response from chatbot."
        );
      }

      const reply =
        data?.choices?.[0]?.message?.content ||
        "Sorry, I couldn't generate a response.";

      setMessages((prev) => [...prev, { role: "assistant", content: reply }]);
    } catch (err) {
      setError(err.message || "Something went wrong.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setIsOpen((prev) => !prev)}
        aria-label="Toggle chatbot"
        style={{
          position: "fixed",
          right: "24px",
          bottom: "24px",
          width: "56px",
          height: "56px",
          borderRadius: "50%",
          background: "var(--primary)",
          color: "var(--button-text)",
          border: "none",
          boxShadow: "0 8px 20px rgba(0,0,0,0.2)",
          cursor: "pointer",
          zIndex: 9999,
          fontSize: "20px",
          fontWeight: 700
        }}
      >
        {isOpen ? "×" : "AI"}
      </button>

      {isOpen && (
        <div
          style={{
            position: "fixed",
            right: "24px",
            bottom: "92px",
            width: "320px",
            maxHeight: "420px",
            background: "var(--card)",
            borderRadius: "12px",
            boxShadow: "0 12px 30px rgba(0,0,0,0.2)",
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
            zIndex: 9999
          }}
        >
          <div
            style={{
              padding: "12px 14px",
              borderBottom: "1px solid rgba(255,255,255,0.06)",
              fontWeight: 600,
              color: "var(--text-dark)"
            }}
          >
            SmartStock AI
          </div>

          <div
            style={{
              padding: "12px",
              overflowY: "auto",
              flex: 1,
              display: "flex",
              flexDirection: "column",
              gap: "10px"
            }}
          >
            {messages.map((msg, idx) => (
              <div
                key={`${msg.role}-${idx}`}
                style={{
                  alignSelf: msg.role === "user" ? "flex-end" : "flex-start",
                  background:
                    msg.role === "user"
                      ? "var(--primary)"
                      : "rgba(255,255,255,0.06)",
                  color:
                    msg.role === "user"
                      ? "var(--button-text)"
                      : "var(--text-dark)",
                  padding: "8px 10px",
                  borderRadius: "10px",
                  maxWidth: "85%",
                  fontSize: "13px",
                  lineHeight: 1.4
                }}
              >
                {msg.content}
              </div>
            ))}
          </div>

          {error && (
            <div
              style={{
                padding: "8px 12px",
                color: "#b00020",
                fontSize: "12px",
                borderTop: "1px solid rgba(255,255,255,0.06)"
              }}
            >
              {error}
            </div>
          )}

          <div
            style={{
              padding: "10px",
              display: "flex",
              gap: "8px",
              borderTop: "1px solid rgba(255,255,255,0.06)"
            }}
          >
            <input
              type="text"
              placeholder="Ask something..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") sendMessage();
              }}
              style={{
                flex: 1,
                padding: "8px 10px",
                borderRadius: "8px",
                border: "1px solid #333",
                background: "var(--card)",
                color: "var(--text-dark)",
                fontSize: "13px"
              }}
            />
            <button
              onClick={sendMessage}
              disabled={isLoading}
              style={{
                padding: "8px 12px",
                borderRadius: "8px",
                background: "var(--primary)",
                color: "var(--button-text)",
                border: "none",
                cursor: isLoading ? "not-allowed" : "pointer",
                opacity: isLoading ? 0.7 : 1
              }}
            >
              {isLoading ? "..." : "Send"}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
