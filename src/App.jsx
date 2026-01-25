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
    } catch {
      // ignore corrupted storage
    }
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

      if (!res.ok) {
        throw new Error("Server error");
      }

      const data = await res.json();

      setMessages([
        ...nextMessages,
        { role: "assistant", text: data.answer },
      ]);
    } catch (err) {
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
      <header style={styles.header}>
        <div style={styles.brand}>
          <div style={styles.logo}>P</div>
          <span>PrepSeek</span>
        </div>

        <button onClick={handleClearChat} style={styles.clearBtn}>
          Clear
        </button>
      </header>

      <main style={styles.container}>
        <div style={styles.chatBox}>
          <div style={styles.messages}>
            {messages.length === 0 && (
  <div style={styles.empty}>
    <h2 style={{ fontWeight: 600, color: "#222" }}>
      Welcome to PrepSeek
    </h2>

    <p style={{ marginTop: "10px", fontSize: "15px", color: "#555" }}>
      A calm assistant for everyday decisions.
    </p>

    <p style={{ marginTop: "16px", fontSize: "14px", color: "#666", maxWidth: "460px" }}>
      Ask anything — career choices, money decisions, tech picks, or life questions.
      Get clear, balanced guidance in seconds.
    </p>

    <div style={styles.examplesBox}>
      <div style={styles.exampleLine}>“Mac or Windows?”</div>
      <div style={styles.exampleLine}>“Should I switch jobs now?”</div>
      <div style={styles.exampleLine}>“Is renting or buying better for me?”</div>
    </div>

    <div style={styles.trustNote}>
      This tool offers guidance, not instructions.  
      Final decisions are always yours.
    </div>
  </div>
)}


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
                <div style={{ ...styles.bubble, ...styles.aiBubble, fontStyle: "italic", color: "#666" }}>
                  Considering…
                </div>
              </div>
            )}
          </div>

          {error && <div style={styles.error}>{error}</div>}

          <div style={styles.inputBar}>
            <textarea
              rows={1}
              placeholder="Type here…"
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
              {loading ? "..." : "Send"}
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
    fontFamily: "system-ui, sans-serif",
    background:
      "linear-gradient(180deg, #f8fafc 0%, #eef2ff 50%, #f8fafc 100%)",
  },

  header: {
    background: "#ffffff",
    padding: "14px 20px",
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
  },

  logo: {
    width: 32,
    height: 32,
    borderRadius: 8,
    background: "#0f172a",
    color: "#fff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },

  clearBtn: {
    background: "transparent",
    border: "1px solid #e5e7eb",
    borderRadius: 6,
    padding: "6px 12px",
    cursor: "pointer",
  },

  container: {
    flex: 1,
    display: "flex",
    justifyContent: "center",
    padding: 16,
  },

  chatBox: {
    width: "100%",
    maxWidth: 800,
    background: "#ffffff",
    borderRadius: 12,
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
  },

  messages: {
    flex: 1,
    padding: 20,
    overflowY: "auto",
  },

  empty: {
    textAlign: "center",
    marginTop: 80,
    color: "#475569",
  },

  example: {
    marginTop: 8,
    fontSize: 13,
  },

  row: {
    display: "flex",
    marginBottom: 12,
  },

  bubble: {
    maxWidth: "75%",
    padding: "10px 14px",
    borderRadius: 10,
  },

  userBubble: {
    background: "#0f172a",
    color: "#ffffff",
  },

  aiBubble: {
    background: "#f1f5f9",
  },

  inputBar: {
    display: "flex",
    gap: 8,
    padding: 12,
    borderTop: "1px solid #e5e7eb",
  },

  textarea: {
    flex: 1,
    resize: "none",
    border: "1px solid #e5e7eb",
    borderRadius: 8,
    padding: "8px 10px",
  },

  sendBtn: {
    background: "#0f172a",
    color: "#ffffff",
    border: "none",
    borderRadius: 8,
    padding: "8px 16px",
  },

  error: {
    color: "#b91c1c",
    fontSize: 12,
    padding: "6px 12px",
    background: "#fef2f2",
  },
};
