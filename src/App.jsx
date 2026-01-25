import { useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";

const API_BASE = "https://rexolve-backend.onrender.com";

/* ===================== HELPERS ===================== */

function generateId() {
  return Math.random().toString(36).slice(2);
}

function autoTitle(text) {
  return text.replace(/[?.!]/g, "").slice(0, 40);
}

/* ===================== APP ===================== */

export default function App() {
  const [sessions, setSessions] = useState([]);
  const [currentId, setCurrentId] = useState(null);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const currentSession = sessions.find((s) => s.id === currentId);

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

    // create first session
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

  /* ===================== SESSION ACTIONS ===================== */

  function newSession() {
    const fresh = {
      id: generateId(),
      title: "New decision",
      messages: [],
      createdAt: Date.now(),
    };
    setSessions([fresh, ...sessions]);
    setCurrentId(fresh.id);
  }

  function clearAll() {
    if (!window.confirm("Clear all decisions?")) return;
    localStorage.removeItem("prepseekSessions");
    const fresh = {
      id: generateId(),
      title: "New decision",
      messages: [],
      createdAt: Date.now(),
    };
    setSessions([fresh]);
    setCurrentId(fresh.id);
  }

  /* ===================== SEND ===================== */

  async function handleSend() {
    if (!input.trim() || loading) return;

    const userMessage = { role: "user", text: input.trim() };

    let updatedSessions = sessions.map((s) => {
      if (s.id !== currentId) return s;

      const isFirst = s.messages.length === 0;

      return {
        ...s,
        title: isFirst ? autoTitle(input.trim()) : s.title,
        messages: [...s.messages, userMessage],
      };
    });

    setSessions(updatedSessions);
    setInput("");
    setLoading(true);
    setError("");

    try {
      const res = await fetch(`${API_BASE}/ask-doubt`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: updatedSessions
            .find((s) => s.id === currentId)
            .messages.map((m) => ({
              role: m.role,
              content: m.text,
            })),
        }),
      });

      const data = await res.json();

      setSessions((prev) =>
        prev.map((s) =>
          s.id === currentId
            ? {
                ...s,
                messages: [
                  ...s.messages,
                  { role: "assistant", text: data.answer },
                ],
              }
            : s
        )
      );
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
      {/* Sidebar */}
      <div style={styles.sidebar}>
        <div style={styles.sidebarHeader}>
          <strong>Decisions</strong>
          <button onClick={newSession} style={styles.newBtn}>＋</button>
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
      </div>

      {/* Main */}
      <div style={styles.main}>
        <header style={styles.header}>
          <div style={styles.brand}>
            <div style={styles.logo}>P</div>
            <span>PrepSeek</span>
          </div>

          <button onClick={clearAll} style={styles.clearBtn}>
            Clear
          </button>
        </header>

        <main style={styles.container}>
          <div style={styles.chatBox}>
            <div style={styles.messages}>
              {currentSession.messages.length === 0 && (
                <div style={styles.empty}>
                  <h2 style={{ fontWeight: 700 }}>
                    What are you deciding today?
                  </h2>
                  <p style={{ marginTop: 10, color: "#555" }}>
                    A calm assistant to think through everyday choices.
                  </p>

                  <div style={styles.chips}>
                    {[
                      "Should I switch jobs this year?",
                      "Rent or buy in my situation?",
                      "Mac or Windows for my work?",
                      "Is this startup idea worth pursuing?",
                      "How should I invest my savings?",
                    ].map((q, i) => (
                      <div
                        key={i}
                        style={styles.chip}
                        onClick={() => setInput(q)}
                      >
                        {q}
                      </div>
                    ))}
                  </div>

                  <div style={styles.disclaimer}>
                    ⚠️ This is an AI and may be inaccurate. Use it as a thinking aid,
                    not a source of absolute truth.
                    <br />
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
    width: 240,
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
  },

  newBtn: {
    border: "none",
    background: "#0f172a",
    color: "#fff",
    borderRadius: 6,
    cursor: "pointer",
  },

  sessionList: {
    flex: 1,
    overflowY: "auto",
  },

  sessionItem: {
    padding: "10px 14px",
    cursor: "pointer",
    borderBottom: "1px solid #f1f5f9",
  },

  main: { flex: 1, display: "flex", flexDirection: "column" },

  header: {
    background: "#ffffff",
    padding: "14px 20px",
    borderBottom: "1px solid #e5e7eb",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },

  brand: { display: "flex", alignItems: "center", gap: 10, fontSize: 18, fontWeight: 700 },

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

  container: { flex: 1, display: "flex", justifyContent: "center", padding: 16 },

  chatBox: {
    width: "100%",
    maxWidth: 900,
    background: "#ffffff",
    borderRadius: 16,
    display: "flex",
    flexDirection: "column",
  },

  messages: { flex: 1, padding: 24, overflowY: "auto" },

  empty: { textAlign: "center", marginTop: 100 },

  chips: {
    display: "flex",
    gap: 12,
    flexWrap: "wrap",
    justifyContent: "center",
    marginTop: 30,
  },

  chip: {
    padding: "10px 16px",
    background: "#f1f5f9",
    borderRadius: 999,
    cursor: "pointer",
  },

  disclaimer: {
    marginTop: 40,
    fontSize: 13,
    color: "#555",
    maxWidth: 500,
    marginInline: "auto",
  },

  row: { display: "flex", marginBottom: 14 },

  bubble: { maxWidth: "75%", padding: "12px 16px", borderRadius: 14 },

  userBubble: { background: "#0f172a", color: "#ffffff" },

  aiBubble: { background: "#f1f5f9" },

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
    fontSize: 14,
  },

  sendBtn: {
    background: "#0f172a",
    color: "#ffffff",
    border: "none",
    borderRadius: 10,
    padding: "10px 20px",
    cursor: "pointer",
  },

  error: {
    color: "#b91c1c",
    fontSize: 12,
    padding: "6px 12px",
    background: "#fef2f2",
  },
};
