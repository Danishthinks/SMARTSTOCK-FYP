import React, { useEffect, useMemo, useState, useRef } from "react";
import { collection, onSnapshot } from "firebase/firestore";
import { db } from "../../lib/firebase";
import { MessageCircle, X } from "lucide-react";

export default function ChatbotWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [products, setProducts] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      content: "Hi! I'm SmartStock AI. Ask me about inventory, warehouses, low stock, or product details."
    }
  ]);
  const messagesEndRef = useRef(null);

  const apiKey = useMemo(
    () => process.env.REACT_APP_GROQ_API_KEY || "",
    []
  );

  useEffect(() => {
    if (!db) return;

    const unsubProducts = onSnapshot(
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

    const unsubWarehouses = onSnapshot(
      collection(db, "warehouses"),
      (snapshot) => {
        const items = [];
        snapshot.forEach((doc) => {
          items.push({ id: doc.id, ...doc.data() });
        });
        setWarehouses(items);
      },
      () => {
        console.error("Failed to load warehouses data.");
      }
    );

    return () => {
      unsubProducts();
      unsubWarehouses();
    };
  }, []);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);


  const normalizeText = (value) =>
    (value || "").toString().trim().toLowerCase();

  const getInventoryAnswer = (text) => {
    const query = normalizeText(text);
    if (!query) return null;

    // Check for warehouse queries FIRST (before product queries)
    if (/warehouse|location|where|storage/i.test(query)) {
      // List all warehouses
      if (/list|show all|all warehouse/i.test(query) && !/specific|about|details|in/.test(query)) {
        if (warehouses.length === 0) return "No warehouses found. Create one in the Warehouses section.";
        const list = warehouses.map((w, idx) => {
          const whProducts = products.filter(p => p.warehouse === w.name);
          return `${idx + 1}. ${w.name} - ${w.location}\n   Manager: ${w.manager || 'Not assigned'}\n   Products: ${whProducts.length}`;
        }).join('\n\n');
        return `📍 Your Warehouses (${warehouses.length}):\n\n${list}`;
      }

      // Find specific warehouse by name
      const matchedWarehouse = warehouses.find(w => 
        w.name && query.includes(normalizeText(w.name))
      );
      
      if (matchedWarehouse) {
        const whProducts = products.filter(p => p.warehouse === matchedWarehouse.name);
        const totalQty = whProducts.reduce((sum, p) => sum + (p.quantity || 0), 0);
        const totalValue = whProducts.reduce((sum, p) => sum + ((p.purchasePrice || 0) * (p.quantity || 0)), 0);
        
        let response = `📍 ${matchedWarehouse.name}\n`;
        response += `Location: ${matchedWarehouse.location}\n`;
        response += `Manager: ${matchedWarehouse.manager || 'Not assigned'}\n`;
        if (matchedWarehouse.contact) response += `Contact: ${matchedWarehouse.contact}\n`;
        response += `\nInventory Summary:\n`;
        response += `• Products: ${whProducts.length}\n`;
        response += `• Total Quantity: ${totalQty}\n`;
        response += `• Total Value: Rs. ${totalValue.toLocaleString()}\n`;
        
        if (whProducts.length > 0) {
          response += `\nProducts:\n`;
          const productList = whProducts.slice(0, 10).map(p => 
            `• ${p.name} (${p.category || 'N/A'}): Qty ${p.quantity ?? 0}`
          ).join('\n');
          response += productList;
          if (whProducts.length > 10) response += `\n...and ${whProducts.length - 10} more`;
        } else {
          response += `\nNo products in this warehouse yet.`;
        }
        
        return response;
      }
    }

    // Low stock query
    if (/low stock|running low|need restock|alert/i.test(query)) {
      const lowStockItems = products.filter(p => (p.quantity || 0) < 5);
      if (lowStockItems.length === 0) return "✅ All products are well stocked!";
      const list = lowStockItems.slice(0, 5).map(p => 
        `• ${p.name}: ${p.quantity ?? 0} left${p.warehouse ? ` (${p.warehouse})` : ''}`
      ).join('\n');
      return `⚠️ Low Stock Items (${lowStockItems.length}):\n${list}${lowStockItems.length > 5 ? '\n...and more' : ''}`;
    }

    const isProductQuery =
      /quantity|stock|how many|available|in stock|price|buy|sell|purchase|info|specifications|specs/i.test(query);

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

      const inventoryContext = `Current Inventory: ${products.length} products across ${warehouses.length} warehouses. Total stock value: Rs. ${products.reduce((sum, p) => sum + ((p.purchasePrice || 0) * (p.quantity || 0)), 0).toLocaleString()}.`;

      const systemMessage = {
        role: "system",
        content: `You are SmartStock AI, a helpful inventory assistant. Be direct and conversational. Answer questions immediately with available data. Never ask for credentials or unnecessary details - just provide the information the user needs. ${inventoryContext} If asked about specific products, warehouses, or stock levels, give clear, concise answers without requesting additional information.`
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
          background: "linear-gradient(135deg, #2563eb, #7c3aed)",
          color: "var(--button-text)",
          border: "none",
          boxShadow: "0 10px 24px rgba(0,0,0,0.25)",
          cursor: "pointer",
          zIndex: 9999,
          fontSize: "20px",
          fontWeight: 700,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "6px"
        }}
      >
        {isOpen ? <X size={22} /> : <MessageCircle size={22} />}
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
            boxShadow: "0 12px 30px rgba(0,0,0,0.25)",
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
              color: "var(--text-dark)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              userSelect: "none",
              background: "linear-gradient(90deg, rgba(37,99,235,0.15), rgba(124,58,237,0.15))"
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <MessageCircle size={16} />
              SmartStock AI
            </div>
            <span style={{ fontSize: "11px", opacity: 0.7 }}>Online</span>
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
                      ? "linear-gradient(135deg, #2563eb, #7c3aed)"
                      : "rgba(15,23,42,0.06)",
                  color:
                    msg.role === "user"
                      ? "var(--button-text)"
                      : "var(--text-dark)",
                  padding: "8px 10px",
                  borderRadius: "10px",
                  maxWidth: "85%",
                  fontSize: "13px",
                  lineHeight: 1.4,
                  whiteSpace: "pre-wrap"
                }}
              >
                {msg.content}
              </div>
            ))}
            <div ref={messagesEndRef} />
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
                border: "1px solid rgba(148,163,184,0.5)",
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
                background: "linear-gradient(135deg, #2563eb, #7c3aed)",
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
