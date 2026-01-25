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
        if (Array.isArray(parsed)) {
          setMessages(parsed);
        }
      }
    } catch {}
  }, []);

  useEffect(() => {
    localStorage.setItem("doubtSolverHistory", JSON.stringify(messages));
  }, [messages]);

  function handleClearChat() {
    if (!window.confirm("Clear the entire conversation?")) return;
    setMessages([]);
    localStorage.removeItem("doubtSolverHistory");
  }

  /* ===================== SEND ===================== */

  async function handleSend(textOverride) {
    const finalInput = textOverride ?? input;

    if (!finalInput.trim() || loading) return;

    const userMessage = {
      role: "user",
      text: finalInput.trim(),
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
      setError("Something went wrong. Please try again.");
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

  const examples = [
    "Should I switch jobs this year?",
    "Rent or buy in my situation?",
    "Mac or Windows for my work?",
    "Is this startup idea worth pursuing?",
    "How should I invest my savings?",
  ];

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
          {/* Empty State */}
          {messages.length === 0 && (
            <div style={styles.empty}>
              <h1 style={styles.title}>What are you deciding today?</h1>

              <p style={styles.subtitle}>
                A calm assistant to think through everyday choices.
              </p>

              <div style={styles.examplesGrid}>
                {examples.map((ex, i) => (
                  <button
                    key={i}
                    style={styles.exampleChip}
                    onClick={() => handleSend(ex)}
                  >
                    {ex}
                  </button>
                ))}
              </div>

              {/* Trust & Disclaimer */}
              <div style={styles.trustBlock}>
                <p style={styles.trustLine}>
                  You’ll get reasoning, trade-offs, and perspective — not commands.
                </p>

                <p style={styles.disclaimer}>
                  ⚠️ This is an AI and may occasionally be inaccurate or incomplete.  
                  Use it as a thinking aid, not a source of absolute truth.
                </p>

                <p style={styles.finalNote}>
                  Final decisions — and responsibility — are always yours.
                </p>
              </div>
            </div>
          )}

          {/* Messages */}
          <div style={styles.messages}>
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
                    color: "#64748b",
                  }}
                >
                  Considering…
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
              onClick={() => handleSend()}
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
      "linear-gradient(180deg, #f8fafc 0%, #eef2ff 50%, #f8fafc 100%)",
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
    fontSize: 18,
    fontWeight: 700,
    color: "#0f172a",
  },

  brandText: {
    letterSpacing: "0.2px",
  },

  logo: {
    width: 34,
    height: 34,
    borderRadius: 9,
    background: "#0f172a",
    color: "#ffffff",
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
    padding: 20,
  },

  chatBox: {
    width: "100%",
    maxWidth: 860,
    background: "#ffffff",
    borderRadius: 14,
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
    boxShadow: "0 10px 40px rgba(0,0,0,0.04)",
  },

  messages: {
    flex: 1,
    padding: 22,
    overflowY: "auto",
  },

  empty: {
    textAlign: "center",
    marginTop: 90,
    color: "#0f172a",
  },

  title: {
    fontSize: 30,
    fontWeight: 700,
    marginBottom: 10,
  },

  subtitle: {
    fontSize: 16,
    color: "#475569",
    marginBottom: 28,
  },

  examplesGrid: {
    display: "flex",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 12,
    marginBottom: 34,
  },

  exampleChip: {
    background: "#f1f5f9",
    border: "1px solid #e2e8f0",
    borderRadius: 999,
    padding: "10px 16px",
    cursor: "pointer",
    fontSize: 14,
    color: "#0f172a",
    transition: "all 0.15s ease",
  },

  trustBlock: {
    maxWidth: 520,
    margin: "0 auto",
    fontSize: 13.5,
    color: "#475569",
    lineHeight: 1.6,
  },

  trustLine: {
    marginBottom: 8,
  },

  disclaimer: {
    marginTop: 8,
    color: "#64748b",
    fontSize: 12.5,
  },

  finalNote: {
    marginTop: 6,
    fontWeight: 500,
  },

  row: {
    display: "flex",
    marginBottom: 14,
  },

  bubble: {
    maxWidth: "75%",
    padding: "12px 16px",
    borderRadius: 12,
    fontSize: 15,
    lineHeight: 1.6,
  },

  userBubble: {
    background: "#0f172a",
    color: "#ffffff",
    borderBottomRightRadius: 4,
  },

  aiBubble: {
    background: "#f1f5f9",
    color: "#0f172a",
    borderBottomLeftRadius: 4,
  },

  inputBar: {
    display: "flex",
    gap: 10,
    padding: 14,
    borderTop: "1px solid #e5e7eb",
  },

  textarea: {
    flex: 1,
    resize: "none",
    border: "1px solid #e5e7eb",
    borderRadius: 10,
    padding: "10px 12px",
    fontSize: 15,
    outline: "none",
  },

  sendBtn: {
    background: "#0f172a",
    color: "#ffffff",
    border: "none",
    borderRadius: 10,
    padding: "10px 20px",
    cursor: "pointer",
    fontWeight: 600,
  },

  error: {
    color: "#b91c1c",
    fontSize: 13,
    padding: "8px 14px",
    background: "#fef2f2",
    borderTop: "1px solid #fecaca",
  },
};
