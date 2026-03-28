import React, { useEffect, useMemo, useState, useRef } from "react";
import { collection, onSnapshot, query, orderBy, limit } from "firebase/firestore";
import { db } from "../../lib/firebase";
import { MessageCircle, X } from "lucide-react";

export default function ChatbotWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [products, setProducts] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [logs, setLogs] = useState([]);
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      content: "Hi! I'm SmartStock AI. Ask me about inventory, warehouses, low stock, or product details."
    }
  ]);
  const messagesEndRef = useRef(null);

  const formatCurrency = (value) =>
    new Intl.NumberFormat("en-PK", {
      style: "currency",
      currency: "PKR",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value || 0);

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

    const unsubLogs = onSnapshot(
      query(collection(db, 'logs'), orderBy('timestamp', 'desc'), limit(150)),
      (snapshot) => {
        const items = [];
        snapshot.forEach((doc) => items.push({ id: doc.id, ...doc.data() }));
        setLogs(items);
      },
      () => {}
    );

    return () => {
      unsubProducts();
      unsubWarehouses();
      unsubLogs();
    };
  }, []);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);


  const normalizeText = (value) =>
    (value || "").toString().trim().toLowerCase();

  const isGreetingIntent = (text) => {
    const value = normalizeText(text);
    return /^(hi|hey|hello|hy|salam|assalamualaikum|good morning|good afternoon|good evening)(\b|\s|!|\.)/.test(value);
  };

  const getGreetingReply = () =>
    "Hi! Welcome to SmartStock. I can help with inventory workflows, product and warehouse actions, stock checks, and step-by-step guidance.";

  const isInventoryIntent = (text) =>
    /inventory|stock|product|warehouse|qty|quantity|price|selling|purchase|restock|low stock|item|catalog|sku|product id/i.test(text || "");

  const getWorkflowAnswer = (text) => {
    const query = normalizeText(text);
    if (!query) return null;

    if (/how to|steps|process|workflow|guide|procedure|what should i do/.test(query)) {
      if (/add product|create product|new product/.test(query)) {
        return [
          "Add Product Workflow:",
          "1. Open Add Product from the left sidebar.",
          "2. Enter product details: name, category, quantity, purchase price, selling price, and warehouse.",
          "3. Verify values carefully, especially quantity and prices.",
          "4. Click the submit/add button to save the product.",
          "5. Open Inventory List to confirm the item appears with correct data.",
          "6. If needed, edit immediately from Inventory List to correct any fields."
        ].join("\n");
      }

      if (/update product|edit product|modify product/.test(query)) {
        return [
          "Update Product Workflow:",
          "1. Open Inventory List from the sidebar.",
          "2. Use search or category filter to find the target product.",
          "3. Click Edit on that row.",
          "4. Update fields like name, category, purchase price, or selling price.",
          "5. Save the changes.",
          "6. Verify the updated values in the table and check logs if needed."
        ].join("\n");
      }

      if (/delete product|remove product/.test(query)) {
        return [
          "Delete Product Workflow:",
          "1. Open Inventory List.",
          "2. Search and locate the product row.",
          "3. Click Delete and confirm the prompt.",
          "4. Use Undo (if available in the prompt/message) to restore quickly if removed by mistake.",
          "5. Confirm removal from Inventory List and review Activity Logs."
        ].join("\n");
      }

      if (/adjust stock|change quantity|increase stock|decrease stock/.test(query)) {
        return [
          "Stock Adjustment Workflow:",
          "1. Open Inventory List.",
          "2. Find the product and click Adjust Stock.",
          "3. Enter a positive or negative quantity change.",
          "4. Submit adjustment and verify the new quantity.",
          "5. Watch for low-stock alerts if quantity drops below threshold."
        ].join("\n");
      }

      if (/transfer stock|move stock|warehouse transfer/.test(query)) {
        return [
          "Transfer Stock Workflow:",
          "1. Open Warehouse Management.",
          "2. Click Transfer Stock.",
          "3. Select product, source warehouse, destination warehouse, and quantity.",
          "4. Confirm source and destination are different.",
          "5. Submit transfer and verify product warehouse/quantity updates.",
          "6. Check Activity Logs for transfer history."
        ].join("\n");
      }

      if (/add warehouse|create warehouse/.test(query)) {
        return [
          "Add Warehouse Workflow:",
          "1. Open Warehouse Management.",
          "2. Click Add Warehouse.",
          "3. Fill required fields (name and location), then manager/contact.",
          "4. Submit and confirm it appears in the warehouse list.",
          "5. Start assigning products to this warehouse from inventory operations."
        ].join("\n");
      }

      if (/delete warehouse|remove warehouse/.test(query)) {
        return [
          "Delete Warehouse Workflow:",
          "1. Open Warehouse Management.",
          "2. Confirm the warehouse has no assigned products.",
          "3. Click Delete and approve confirmation.",
          "4. Verify it is removed from the list.",
          "5. Review Activity Logs for the delete action."
        ].join("\n");
      }

      if (/activity log|logs|history|audit/.test(query)) {
        return [
          "Activity Logs Workflow:",
          "1. Open Activity Logs from the sidebar.",
          "2. Filter by user and action type to narrow results.",
          "3. Review timestamps, actions, product names, and quantities.",
          "4. Export logs to CSV or PDF for reporting and audits."
        ].join("\n");
      }

      if (/export|report|csv|pdf/.test(query)) {
        return [
          "Inventory Export Workflow:",
          "1. Open Inventory List.",
          "2. Apply search/category filters for the exact dataset you want.",
          "3. Click Export CSV for spreadsheet analysis.",
          "4. Click Export PDF for shareable report format.",
          "5. Validate exported totals and item rows before sending."
        ].join("\n");
      }
    }

    return null;
  };

  // Compute restock candidates from recent log frequency
  const restockCandidates = useMemo(() => {
    if (logs.length === 0) return [];
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 90);
    const freq = new Map();
    const monthly = new Map();
    logs.forEach((log) => {
      const ts = log.timestamp?.toDate ? log.timestamp.toDate() : null;
      if (!ts || ts < cutoff || !log.productName) return;
      const n = log.productName;
      freq.set(n, (freq.get(n) || 0) + 1);
      const mk = `${n}:${ts.getFullYear()}-${String(ts.getMonth() + 1).padStart(2, '0')}`;
      monthly.set(mk, (monthly.get(mk) || 0) + 1);
    });
    const now = new Date();
    const tm = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const pd = new Date(now); pd.setMonth(pd.getMonth() - 1);
    const lm = `${pd.getFullYear()}-${String(pd.getMonth() + 1).padStart(2, '0')}`;
    return Array.from(freq.entries())
      .map(([name, cnt]) => ({
        name,
        count: cnt,
        thisM: monthly.get(`${name}:${tm}`) || 0,
        lastM: monthly.get(`${name}:${lm}`) || 0
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 6);
  }, [logs]);

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
        response += `• Total Value: ${formatCurrency(totalValue)}\n`;
        
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

    // Restock / demand trend query
    if (/restock|hot item|trending|demand|season|predict|top sell|best sell/i.test(query)) {
      if (restockCandidates.length === 0) {
        return "Not enough activity data yet to predict restock candidates. Try again after a few stock operations.";
      }
      const rows = restockCandidates.map((r, i) => {
        const trend = r.thisM > r.lastM ? '📈 Rising' : r.thisM < r.lastM ? '📉 Declining' : '➡️ Stable';
        return `${i + 1}. ${r.name} — ${r.count} events in 90d | ${trend} (this month: ${r.thisM}, last: ${r.lastM})`;
      }).join('\n');
      return `🤖 AI Restock Predictions (last 90 days):\n\n${rows}\n\nConsider restocking rising-demand items before stock runs out.`;
    }

    // Low stock query
    if (/low stock|running low|need restock|alert/i.test(query)) {
      const lowStockItems = products.filter(p => (p.quantity || 0) < (p.threshold != null ? p.threshold : 5));
      if (lowStockItems.length === 0) return "✅ All products are well stocked!";
      const list = lowStockItems.slice(0, 5).map(p => {
        const thresh = p.threshold != null ? p.threshold : 5;
        return `• ${p.name}: ${p.quantity ?? 0} left (threshold: ${thresh})${p.warehouse ? ` | ${p.warehouse}` : ''}`;
      }).join('\n');
      return `⚠️ Low Stock Items (${lowStockItems.length}):\n${list}${lowStockItems.length > 5 ? '\n...and more' : ''}`;
    }

    const isProductQuery =
      /quantity|stock|how many|available|in stock|price|buy|sell|purchase|info|specifications|specs|category|product|item|inventory status/i.test(query);

    if (products.length === 0) return null;

    const byName = products.filter((p) =>
      normalizeText(p.name) && query.includes(normalizeText(p.name))
    );

    const byCategory = products.filter((p) =>
      normalizeText(p.category) && query.includes(normalizeText(p.category))
    );

    const byProductId = products.filter((p) =>
      normalizeText(p.productId) && query.includes(normalizeText(p.productId))
    );

    const hasAnyMatch = byName.length > 0 || byCategory.length > 0 || byProductId.length > 0;

    if (!isProductQuery && !hasAnyMatch) return null;

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
      if (item.purchasePrice != null) details.push(`Purchase Price: ${formatCurrency(item.purchasePrice)}`);
      if (item.sellingPrice != null) details.push(`Selling Price: ${formatCurrency(item.sellingPrice)}`);
      if (item.warehouse) details.push(`Warehouse: ${item.warehouse}`);
      
      return details.join("\n");
    }

    if (matches.length > 1) {
      const list = matches
        .slice(0, 5)
        .map((p) => `${p.name} (Qty: ${p.quantity ?? 0}, Price: ${formatCurrency(p.sellingPrice ?? 0)})`)
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
        .map((p) => `• ${p.name}: Qty ${p.quantity ?? 0}, Price ${formatCurrency(p.sellingPrice ?? 0)}`)
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
      const workflowReply = getWorkflowAnswer(trimmed);
      if (workflowReply) {
        setMessages((prev) => [...prev, { role: "assistant", content: workflowReply }]);
        setIsLoading(false);
        return;
      }

      if (isGreetingIntent(trimmed)) {
        setMessages((prev) => [...prev, { role: "assistant", content: getGreetingReply() }]);
        setIsLoading(false);
        return;
      }

      const localReply = getInventoryAnswer(trimmed);
      if (localReply) {
        setMessages((prev) => [...prev, { role: "assistant", content: localReply }]);
        setIsLoading(false);
        return;
      }

      if (!isInventoryIntent(trimmed)) {
        setMessages((prev) => [...prev, { role: "assistant", content: "I’m focused on SmartStock inventory, products, pricing, and warehouses. Please ask an inventory-related question." }]);
        setIsLoading(false);
        return;
      }

      const totalValue = products.reduce((sum, p) => sum + ((p.purchasePrice || 0) * (p.quantity || 0)), 0);
      const lowStockNames = products.filter(p => (p.quantity || 0) < (p.threshold != null ? p.threshold : 5)).map(p => p.name).join(', ') || 'None';
      const topRestock = restockCandidates.slice(0, 3).map(r => r.name).join(', ') || 'Insufficient data';
      const inventoryContext = `Current Inventory: ${products.length} products, ${warehouses.length} warehouses. Total stock value: ${formatCurrency(totalValue)}. Low stock items (qty<5): ${lowStockNames}. Top AI restock candidates based on 90-day trend: ${topRestock}.`;

      const systemMessage = {
        role: "system",
        content: `You are SmartStock AI, an inventory management assistant for this app. If the user says hi/hello/hey, greet briefly and warmly. For inventory workflows (add, update, delete products; stock adjustments; warehouse actions; exports; logs), provide clear step-by-step guidance. For off-topic questions, politely refuse and say you only handle SmartStock inventory operations. Be concise, practical, and never invent data. Use this context: ${inventoryContext}`
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
