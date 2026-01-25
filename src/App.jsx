import { useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";

const API_BASE = "https://rexolve-backend.onrender.com";

export default function App() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  /* ===================== LOAD / SAVE ===================== */

  useEffect(() => {
    try {
      const saved = localStorage.getItem("doubtSolverHistory");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) setMessages(parsed);
      }
    } catch {}
  }, []);

  useEffect(() => {
    localStorage.setItem(
      "doubtSolverHistory",
      JSON.stringify(messages)
    );
  }, [messages]);

  function handleClearChat() {
    if (!window.confirm("Clear the entire chat?")) return;
    setMessages([]);
    localStorage.removeItem("doubtSolverHistory");
  }

  /* ===================== SEND ===================== */

  async function handleSend() {
    if (!input.trim() || loading) return;

    const userMessage = {
      role: "user",
      text: input.trim(),
    };

    const nextMessages = [...messages, userMessage];
    setMessages(nextMessages);
    setInput("");
    setLoading(true);
    setError("");

    try {
      const res = await fetch(`${API_BASE}/ask-doubt`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: nextMessages.map((m) => ({
            role: m.role,
            content: m.text,
          })),
        }),
      });

      if (!res.ok) throw new Error("Server error");

      const data = await res.json();

      setMessages([
        ...nextMessages,
        { role: "assistant", text: data.answer },
      ]);
    } catch {
      setError("Something went wrong. Try again.");
    } finally {
      setLoading(false);
    }
  }

  function handleKeyDown(e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  /* ===================== UI ===================== */

  return (
    <div style={styles.app}>
      {/* Header */}
      <header style={styles.header}>
        <div style={styles.brand}>
          <div style={styles.logo}>P</div>
          <span style={styles.brandText}>PrepSeek</span>
        </div>

        <button onClick={handleClearChat} style={styles.clearBtn}>
          Clear
        </button>
      </header>

      {/* Main */}
      <main style={styles.container}>
        <div style={styles.chatBox}>
          <div style={styles.messages}>
            {/* Empty State */}
            {messages.length === 0 && (
              <div style={styles.empty}>
                <h1 style={styles.heroTitle}>
                  What are you deciding today?
                </h1>

                <p style={styles.heroSubtitle}>
                  A calm assistant to think through everyday choices.
                </p>

                <div style={styles.promptGrid}>
                  <div style={styles.prompt}>Should I switch jobs this year?</div>
                  <div style={styles.prompt}>Rent or buy in my situation?</div>
                  <div style={styles.prompt}>Mac or Windows for my work?</div>
                  <div style={styles.prompt}>Is this startup idea worth pursuing?</div>
                  <div style={styles.prompt}>How should I invest my savings?</div>
                </div>

                <p style={styles.trustNote}>
                  You’ll get guidance, trade-offs, and reasoning — not commands.  
                  Final decisions are always yours.
                </p>
              </div>
            )}

            {/* Messages */}
            {messages.map((m, i) => (
              <div
                key={i}
                style={{
                  ...styles.row,
                  justifyContent:
                    m.role === "user" ? "flex-end" : "flex-start",
                }}
              >
                <div
                  style={{
                    ...styles.bubble,
                    ...(m.role === "user"
                      ? styles.userBubble
                      : styles.aiBubble),
                  }}
                >
                  <ReactMarkdown>{m.text}</ReactMarkdown>
                </div>
              </div>
            ))}

            {loading && (
              <div style={{ ...styles.row, justifyContent: "flex-start" }}>
                <div
                  style={{
                    ...styles.bubble,
                    ...styles.aiBubble,
                    fontStyle: "italic",
                    color: "#666",
                  }}
                >
                  Thinking…
                </div>
              </div>
            )}
          </div>

          {error && <div style={styles.error}>{error}</div>}

          {/* Input */}
          <div style={styles.inputBar}>
            <textarea
              rows={1}
              placeholder="Describe your situation or question…"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              style={styles.textarea}
            />

            <button
              onClick={handleSend}
              disabled={loading}
              style={styles.sendBtn}
            >
              {loading ? "…" : "Send"}
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}

/* ===================== STYLES ===================== */

const styles = {
  app: {
    height: "100vh",
    display: "flex",
    flexDirection: "column",
    fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, sans-serif",
    background:
      "linear-gradient(180deg, #f8fafc 0%, #eef2ff 60%, #f8fafc 100%)",
  },

  header: {
    background: "#ffffff",
    padding: "14px 22px",
    borderBottom: "1px solid #e5e7eb",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },

  brand: {
    display: "flex",
    alignItems: "center",
    gap: 10,
  },

  brandText: {
    fontSize: 18,
    fontWeight: 700,
    color: "#0f172a",
  },

  logo: {
    width: 34,
    height: 34,
    borderRadius: 8,
    background: "#0f172a",
    color: "#fff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: 700,
  },

  clearBtn: {
    background: "transparent",
    border: "1px solid #e5e7eb",
    borderRadius: 8,
    padding: "6px 14px",
    cursor: "pointer",
    color: "#334155",
  },

  container: {
    flex: 1,
    display: "flex",
    justifyContent: "center",
    padding: 18,
  },

  chatBox: {
    width: "100%",
    maxWidth: 860,
    background: "#ffffff",
    borderRadius: 14,
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
    boxShadow: "0 10px 30px rgba(0,0,0,0.04)",
  },

  messages: {
    flex: 1,
    padding: "28px 26px",
    overflowY: "auto",
  },

  /* Empty state */

  empty: {
    textAlign: "center",
    marginTop: 90,
    color: "#334155",
  },

  heroTitle: {
    fontSize: 32,
    fontWeight: 700,
    marginBottom: 10,
    color: "#0f172a",
  },

  heroSubtitle: {
    fontSize: 16,
    color: "#555",
    marginBottom: 34,
  },

  promptGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
    gap: 14,
    maxWidth: 640,
    margin: "0 auto 34px",
  },

  prompt: {
    background: "#f1f5f9",
    padding: "12px 16px",
    borderRadius: 10,
    fontSize: 14,
    color: "#334155",
    cursor: "pointer",
  },

  trustNote: {
    fontSize: 13,
    color: "#64748b",
    maxWidth: 520,
    margin: "0 auto",
    lineHeight: "1.6",
  },

  /* Chat */

  row: {
    display: "flex",
    marginBottom: 14,
  },

  bubble: {
    maxWidth: "75%",
    padding: "12px 16px",
    borderRadius: 12,
    lineHeight: "1.6",
    fontSize: 15,
  },

  userBubble: {
    background: "#0f172a",
    color: "#ffffff",
  },

  aiBubble: {
    background: "#f1f5f9",
    color: "#0f172a",
  },

  /* Input */

  inputBar: {
    display: "flex",
    gap: 10,
    padding: "14px 16px",
    borderTop: "1px solid #e5e7eb",
  },

  textarea: {
    flex: 1,
    resize: "none",
    border: "1px solid #e5e7eb",
    borderRadius: 10,
    padding: "10px 12px",
    fontSize: 14,
    outline: "none",
  },

  sendBtn: {
    background: "#0f172a",
    color: "#ffffff",
    border: "none",
    borderRadius: 10,
    padding: "10px 18px",
    cursor: "pointer",
    fontWeight: 600,
  },

  error: {
    color: "#b91c1c",
    fontSize: 12,
    padding: "8px 14px",
    background: "#fef2f2",
  },
};
