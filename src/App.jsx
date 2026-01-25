import { useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";

const API_BASE = "https://rexolve-backend.onrender.com";

/* ===================== HELPERS ===================== */

function newSession() {
  return {
    id: crypto.randomUUID(),
    title: "New decision",
    messages: [],
  };
}

export default function App() {
  const [sessions, setSessions] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  /* ===================== LOAD / SAVE ===================== */

  useEffect(() => {
    try {
      const saved = localStorage.getItem("prepseek_sessions");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setSessions(parsed);
          setActiveId(parsed[0].id);
          return;
        }
      }
    } catch {}

    const first = newSession();
    setSessions([first]);
    setActiveId(first.id);
  }, []);

  useEffect(() => {
    localStorage.setItem("prepseek_sessions", JSON.stringify(sessions));
  }, [sessions]);

  const activeSession = sessions.find((s) => s.id === activeId);

  /* ===================== SESSION ACTIONS ===================== */

  function createSession() {
    const s = newSession();
    setSessions([s, ...sessions]);
    setActiveId(s.id);
  }

  function deleteSession(id) {
    if (!window.confirm("Delete this decision?")) return;

    const next = sessions.filter((s) => s.id !== id);
    if (next.length === 0) {
      const fresh = newSession();
      setSessions([fresh]);
      setActiveId(fresh.id);
    } else {
      setSessions(next);
      setActiveId(next[0].id);
    }
  }

  function renameSession(id) {
    const title = prompt("Rename this decision:");
    if (!title) return;

    setSessions(
      sessions.map((s) =>
        s.id === id ? { ...s, title } : s
      )
    );
  }

  function clearChat() {
    if (!window.confirm("Clear this conversation?")) return;

    setSessions(
      sessions.map((s) =>
        s.id === activeId ? { ...s, messages: [] } : s
      )
    );
  }

  /* ===================== SEND ===================== */

  async function handleSend(textOverride) {
    const text = (textOverride ?? input).trim();
    if (!text || loading) return;

    const userMessage = { role: "user", text };

    const updated = sessions.map((s) =>
      s.id === activeId
        ? { ...s, messages: [...s.messages, userMessage] }
        : s
    );

    setSessions(updated);
    setInput("");
    setLoading(true);
    setError("");

    try {
      const res = await fetch(`${API_BASE}/ask-doubt`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: updated
            .find((s) => s.id === activeId)
            .messages.map((m) => ({
              role: m.role,
              content: m.text,
            })),
        }),
      });

      if (!res.ok) throw new Error("Server error");

      const data = await res.json();

      setSessions((prev) =>
        prev.map((s) =>
          s.id === activeId
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

  /* ===================== EXAMPLES ===================== */

  const examples = [
    "Should I switch jobs this year?",
    "Rent or buy in my situation?",
    "Is this startup idea worth pursuing?",
    "How should I invest my savings?",
  ];

  /* ===================== UI ===================== */

  return (
    <div style={styles.app}>
      {/* SIDEBAR */}
      <aside style={styles.sidebar}>
        <div style={styles.sidebarHeader}>
          <strong>PrepSeek</strong>
          <button onClick={createSession} style={styles.newBtn}>
            + New
          </button>
        </div>

        <div style={styles.sessionList}>
          {sessions.map((s) => (
            <div
              key={s.id}
              onClick={() => setActiveId(s.id)}
              style={{
                ...styles.sessionItem,
                ...(s.id === activeId
                  ? styles.sessionActive
                  : {}),
              }}
            >
              <span>{s.title}</span>

              <div style={styles.sessionActions}>
                <span
                  onClick={(e) => {
                    e.stopPropagation();
                    renameSession(s.id);
                  }}
                  style={styles.icon}
                >
                  ✏️
                </span>
                <span
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteSession(s.id);
                  }}
                  style={styles.icon}
                >
                  🗑️
                </span>
              </div>
            </div>
          ))}
        </div>
      </aside>

      {/* MAIN */}
      <main style={styles.main}>
        <header style={styles.header}>
          <div style={{ fontWeight: 600 }}>
            {activeSession?.title}
          </div>

          <button onClick={clearChat} style={styles.clearBtn}>
            Clear
          </button>
        </header>

        <div style={styles.chatBox}>
          <div style={styles.messages}>
            {activeSession?.messages.length === 0 && (
              <div style={styles.empty}>
                <h2>What are you deciding today?</h2>
                <p style={{ color: "#555" }}>
                  A calm assistant to think through everyday choices.
                </p>

                <div style={styles.examplesBox}>
                  {examples.map((text, i) => (
                    <div
                      key={i}
                      onClick={() => handleSend(text)}
                      style={styles.exampleChip}
                    >
                      {text}
                    </div>
                  ))}
                </div>

                <div style={styles.disclaimer}>
                  ⚠️ This is an AI and may be inaccurate or incomplete.
                  Use it as a thinking aid — not a source of absolute truth.
                  <br />
                  Final decisions — and responsibility — are always yours.
                </div>
              </div>
            )}

            {activeSession?.messages.map((m, i) => (
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
                  Considering…
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
              onClick={() => handleSend()}
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
    fontFamily: "system-ui, sans-serif",
    background:
      "linear-gradient(180deg, #f8fafc 0%, #eef2ff 50%, #f8fafc 100%)",
  },

  /* SIDEBAR */

  sidebar: {
    width: 260,
    background: "#ffffff",
    borderRight: "1px solid #e5e7eb",
    display: "flex",
    flexDirection: "column",
  },

  sidebarHeader: {
    padding: 14,
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottom: "1px solid #e5e7eb",
  },

  newBtn: {
    background: "#0f172a",
    color: "#fff",
    border: "none",
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
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },

  sessionActive: {
    background: "#eef2ff",
    fontWeight: 600,
  },

  sessionActions: {
    display: "flex",
    gap: 8,
  },

  icon: {
    cursor: "pointer",
    fontSize: 14,
  },

  /* MAIN */

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
  },

  clearBtn: {
    background: "transparent",
    border: "1px solid #e5e7eb",
    borderRadius: 6,
    padding: "6px 12px",
    cursor: "pointer",
  },

  chatBox: {
    flex: 1,
    maxWidth: 900,
    margin: "20px auto",
    width: "100%",
    background: "#ffffff",
    borderRadius: 12,
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

  examplesBox: {
    marginTop: 24,
    display: "flex",
    flexWrap: "wrap",
    gap: 10,
    justifyContent: "center",
  },

  exampleChip: {
    background: "#f1f5f9",
    padding: "8px 14px",
    borderRadius: 999,
    fontSize: 14,
    cursor: "pointer",
    transition: "all 0.2s ease",
    userSelect: "none",
  },

  disclaimer: {
    marginTop: 24,
    fontSize: 13,
    color: "#64748b",
    maxWidth: 520,
    marginInline: "auto",
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
    cursor: "pointer",
  },

  error: {
    color: "#b91c1c",
    fontSize: 12,
    padding: "6px 12px",
    background: "#fef2f2",
  },
};
