import { useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";

const API_BASE = "https://rexolve-backend.onrender.com";

/* ===================== HELPERS ===================== */

function generateId() {
  return Math.random().toString(36).slice(2, 10);
}

/* ===================== APP ===================== */

export default function App() {
  const [sessions, setSessions] = useState([]);
  const [currentId, setCurrentId] = useState(null);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  /* ===================== LOAD / SAVE ===================== */

  useEffect(() => {
    const saved = localStorage.getItem("prepseekSessions");

    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed.length > 0) {
        setSessions(parsed);
        setCurrentId(parsed[0].id);
        return;
      }
    }

    const first = {
      id: generateId(),
      title: "New decision",
      messages: [],
      createdAt: Date.now(),
    };

    setSessions([first]);
    setCurrentId(first.id);
  }, []);

  useEffect(() => {
    localStorage.setItem("prepseekSessions", JSON.stringify(sessions));
  }, [sessions]);

  const currentSession = sessions.find((s) => s.id === currentId);

  if (!currentSession) {
    return <div style={{ padding: 40 }}>Loading…</div>;
  }

  /* ===================== SESSION CONTROLS ===================== */

  function createNewSession() {
    const fresh = {
      id: generateId(),
      title: "New decision",
      messages: [],
      createdAt: Date.now(),
    };

    setSessions([fresh, ...sessions]);
    setCurrentId(fresh.id);
    setInput("");
  }

  function clearCurrentSession() {
    if (!window.confirm("Clear this decision thread?")) return;

    const updated = sessions.map((s) =>
      s.id === currentId ? { ...s, messages: [] } : s
    );

    setSessions(updated);
  }

  /* ===================== SEND ===================== */

  async function handleSend() {
    if (!input.trim() || loading) return;

    const userMessage = { role: "user", text: input.trim() };
    const updatedMessages = [...currentSession.messages, userMessage];

    updateSessionMessages(updatedMessages);
    setInput("");
    setLoading(true);
    setError("");

    try {
      const res = await fetch(`${API_BASE}/ask-doubt`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: updatedMessages.map((m) => ({
            role: m.role,
            content: m.text,
          })),
        }),
      });

      if (!res.ok) throw new Error("Server error");

      const data = await res.json();

      const finalMessages = [
        ...updatedMessages,
        { role: "assistant", text: data.answer },
      ];

      updateSessionMessages(finalMessages);

      // Auto-title session from first question
      if (currentSession.messages.length === 0) {
        renameSession(
          currentId,
          userMessage.text.slice(0, 40) + "…"
        );
      }
    } catch {
      setError("Something went wrong. Try again.");
    } finally {
      setLoading(false);
    }
  }

  function updateSessionMessages(messages) {
    setSessions((prev) =>
      prev.map((s) =>
        s.id === currentId ? { ...s, messages } : s
      )
    );
  }

  function renameSession(id, title) {
    setSessions((prev) =>
      prev.map((s) =>
        s.id === id ? { ...s, title } : s
      )
    );
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
      {/* SIDEBAR */}
      <aside style={styles.sidebar}>
        <div style={styles.sidebarHeader}>
          <div style={styles.brand}>
            <div style={styles.logo}>P</div>
            PrepSeek
          </div>

          <button onClick={createNewSession} style={styles.newBtn}>
            + New
          </button>
        </div>

        <div style={styles.sessionList}>
          {sessions.map((s) => (
            <div
              key={s.id}
              onClick={() => setCurrentId(s.id)}
              style={{
                ...styles.sessionItem,
                background:
                  s.id === currentId ? "#eef2ff" : "transparent",
              }}
            >
              {s.title}
            </div>
          ))}
        </div>
      </aside>

      {/* MAIN */}
      <div style={styles.main}>
        <header style={styles.header}>
          <div style={styles.title}>{currentSession.title}</div>

          <button onClick={clearCurrentSession} style={styles.clearBtn}>
            Clear
          </button>
        </header>

        <main style={styles.container}>
          <div style={styles.chatBox}>
            <div style={styles.messages}>
              {currentSession.messages.length === 0 && (
                <div style={styles.empty}>
                  <h2>What are you deciding today?</h2>
                  <p style={styles.subtitle}>
                    A calm assistant to think through everyday choices.
                  </p>

                  <div style={styles.examplesBox}>
                    {[
                      "Should I switch jobs this year?",
                      "Rent or buy in my situation?",
                      "Mac or Windows for my work?",
                      "Is this startup idea worth pursuing?",
                      "How should I invest my savings?",
                    ].map((q, i) => (
                      <div
                        key={i}
                        style={styles.examplePill}
                        onClick={() => setInput(q)}
                      >
                        {q}
                      </div>
                    ))}
                  </div>

                  <div style={styles.disclaimer}>
                    ⚠️ This is an AI and may be inaccurate or incomplete.  
                    Use it as a thinking aid — not a source of absolute truth.
                  </div>

                  <div style={styles.footerNote}>
                    Final decisions — and responsibility — are always yours.
                  </div>
                </div>
              )}

              {currentSession.messages.map((m, i) => (
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
                  <div style={{ ...styles.bubble, ...styles.aiBubble }}>
                    Thinking…
                  </div>
                </div>
              )}
            </div>

            {error && <div style={styles.error}>{error}</div>}

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
                Send
              </button>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

/* ===================== STYLES ===================== */

const styles = {
  app: {
    height: "100vh",
    display: "flex",
    fontFamily: "system-ui, sans-serif",
    background:
      "linear-gradient(180deg, #f8fafc 0%, #eef2ff 50%, #f8fafc 100%)",
  },

  sidebar: {
    width: 260,
    background: "#ffffff",
    borderRight: "1px solid #e5e7eb",
    display: "flex",
    flexDirection: "column",
  },

  sidebarHeader: {
    padding: 14,
    borderBottom: "1px solid #e5e7eb",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },

  brand: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    fontWeight: 700,
  },

  logo: {
    width: 30,
    height: 30,
    borderRadius: 8,
    background: "#0f172a",
    color: "#fff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },

  newBtn: {
    border: "1px solid #e5e7eb",
    background: "#f8fafc",
    borderRadius: 6,
    padding: "4px 10px",
    cursor: "pointer",
  },

  sessionList: {
    flex: 1,
    overflowY: "auto",
    padding: 8,
  },

  sessionItem: {
    padding: "8px 10px",
    borderRadius: 6,
    cursor: "pointer",
    fontSize: 14,
    color: "#1e293b",
  },

  main: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
  },

  header: {
    background: "#ffffff",
    padding: "14px 20px",
    borderBottom: "1px solid #e5e7eb",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },

  title: {
    fontWeight: 600,
  },

  clearBtn: {
    border: "1px solid #e5e7eb",
    background: "transparent",
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
    maxWidth: 900,
    background: "#ffffff",
    borderRadius: 14,
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
  },

  messages: {
    flex: 1,
    padding: 24,
    overflowY: "auto",
  },

  empty: {
    textAlign: "center",
    marginTop: 80,
  },

  subtitle: {
    marginTop: 10,
    color: "#555",
  },

  examplesBox: {
    marginTop: 30,
    display: "flex",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 10,
  },

  examplePill: {
    background: "#f1f5f9",
    borderRadius: 20,
    padding: "8px 14px",
    fontSize: 14,
    cursor: "pointer",
  },

  disclaimer: {
    marginTop: 30,
    fontSize: 13,
    color: "#666",
  },

  footerNote: {
    marginTop: 8,
    fontSize: 13,
    color: "#475569",
  },

  row: {
    display: "flex",
    marginBottom: 14,
  },

  bubble: {
    maxWidth: "70%",
    padding: "12px 16px",
    borderRadius: 12,
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
    padding: 14,
    borderTop: "1px solid #e5e7eb",
  },

  textarea: {
    flex: 1,
    resize: "none",
    border: "1px solid #e5e7eb",
    borderRadius: 8,
    padding: "10px 12px",
    fontSize: 14,
  },

  sendBtn: {
    background: "#0f172a",
    color: "#ffffff",
    border: "none",
    borderRadius: 8,
    padding: "10px 20px",
    cursor: "pointer",
  },

  error: {
    color: "#b91c1c",
    fontSize: 13,
    padding: "6px 12px",
    background: "#fef2f2",
  },
};
