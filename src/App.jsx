import { useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";

const API_BASE = "https://rexolve-backend.onrender.com";

/* ===================== HELPERS ===================== */

function generateId() {
  return Math.random().toString(36).substring(2, 10);
}

/* ===================== SESSION ROW ===================== */

function SessionRow({ session, active, onSelect, onRename, onDelete }) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(session.title);

  function finishRename() {
    setEditing(false);
    if (value.trim()) onRename(value.trim());
  }

  return (
    <div
      onClick={!editing ? onSelect : undefined}
      style={{
        ...styles.sessionItem,
        background: active ? "#eef2ff" : "transparent",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        gap: 8,
      }}
    >
      {editing ? (
        <input
          autoFocus
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onBlur={finishRename}
          onKeyDown={(e) => e.key === "Enter" && finishRename()}
          style={{
            flex: 1,
            border: "1px solid #e5e7eb",
            borderRadius: 6,
            padding: "4px 6px",
            fontSize: 14,
          }}
        />
      ) : (
        <span
          style={{
            flex: 1,
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {session.title}
        </span>
      )}

      {!editing && (
        <div style={{ display: "flex", gap: 6 }}>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setEditing(true);
            }}
            style={styles.iconBtn}
          >
            ✏️
          </button>

          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            style={styles.iconBtn}
          >
            🗑
          </button>
        </div>
      )}
    </div>
  );
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

  function renameSession(id, title) {
    setSessions(
      sessions.map((s) =>
        s.id === id ? { ...s, title } : s
      )
    );
  }

  function deleteSession(id) {
    if (!window.confirm("Delete this decision permanently?")) return;

    const remaining = sessions.filter((s) => s.id !== id);

    if (remaining.length === 0) {
      const fresh = {
        id: generateId(),
        title: "New decision",
        messages: [],
        createdAt: Date.now(),
      };

      setSessions([fresh]);
      setCurrentId(fresh.id);
    } else {
      setSessions(remaining);
      setCurrentId(remaining[0].id);
    }
  }

  function clearCurrent() {
    if (!window.confirm("Clear this conversation?")) return;

    setSessions(
      sessions.map((s) =>
        s.id === currentId ? { ...s, messages: [] } : s
      )
    );
  }

  /* ===================== SEND ===================== */

  async function handleSend() {
    if (!input.trim() || loading) return;

    const userMessage = {
      role: "user",
      text: input.trim(),
    };

    const updated = {
      ...currentSession,
      messages: [...currentSession.messages, userMessage],
    };

    setSessions(
      sessions.map((s) =>
        s.id === currentId ? updated : s
      )
    );

    setInput("");
    setLoading(true);
    setError("");

    try {
      const res = await fetch(`${API_BASE}/ask-doubt`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: updated.messages.map((m) => ({
            role: m.role,
            content: m.text,
          })),
        }),
      });

      if (!res.ok) throw new Error("Server error");

      const data = await res.json();

      const withAnswer = {
        ...updated,
        messages: [
          ...updated.messages,
          { role: "assistant", text: data.answer },
        ],
      };

      if (updated.messages.length === 1) {
        const title =
          updated.messages[0].text.slice(0, 40) + "...";
        withAnswer.title = title;
      }

      setSessions(
        sessions.map((s) =>
          s.id === currentId ? withAnswer : s
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
      {/* SIDEBAR */}
      <div style={styles.sidebar}>
        <div style={styles.sidebarHeader}>
  <div style={styles.brand}>
    <div style={styles.logo}>P</div>
    <strong>PrepSeek</strong>
  </div>

  <button onClick={newSession} style={styles.newBtn}>
    + New
  </button>
</div>

        <div style={styles.sessionList}>
          {sessions.map((s) => (
            <SessionRow
              key={s.id}
              session={s}
              active={s.id === currentId}
              onSelect={() => setCurrentId(s.id)}
              onRename={(title) => renameSession(s.id, title)}
              onDelete={() => deleteSession(s.id)}
            />
          ))}
        </div>
      </div>

      {/* MAIN */}
      <div style={styles.main}>
        <header style={styles.header}>
          <div style={{ fontWeight: 600 }}>{currentSession.title}</div>

          <button onClick={clearCurrent} style={styles.clearBtn}>
            Clear
          </button>
        </header>

        <main style={styles.container}>
          <div style={styles.chatBox}>
            <div style={styles.messages}>
              {currentSession.messages.length === 0 && (
                <div style={styles.empty}>
                  <h2>What are you deciding today?</h2>
                  <p style={{ marginTop: 8, color: "#555" }}>
                    A calm assistant to think through everyday choices.
                  </p>

                  <div style={styles.examplesBox}>
                    <div style={styles.exampleLine}>Should I switch jobs this year?</div>
                    <div style={styles.exampleLine}>Rent or buy in my situation?</div>
                    <div style={styles.exampleLine}>Is this startup idea worth pursuing?</div>
                  </div>

                  <div style={styles.trustNote}>
                    ⚠️ This is an AI and may be inaccurate or incomplete.  
                    Use it as a thinking aid — not absolute truth.  
                    Final decisions are always yours.
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

            <div style={styles.inputBar}>
              <textarea
                rows={1}
                placeholder="Describe your situation or question..."
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
    padding: "14px 16px",
    borderBottom: "1px solid #e5e7eb",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },

  newBtn: {
    border: "1px solid #e5e7eb",
    borderRadius: 6,
    padding: "4px 10px",
    cursor: "pointer",
    background: "#f8fafc",
  },

  sessionList: {
    flex: 1,
    overflowY: "auto",
    padding: 8,
  },

  sessionItem: {
    padding: "8px 10px",
    borderRadius: 8,
    cursor: "pointer",
    fontSize: 14,
  },

  iconBtn: {
    border: "none",
    background: "transparent",
    cursor: "pointer",
    fontSize: 14,
    opacity: 0.6,
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
    alignItems: "center",
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
    maxWidth: 900,
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
    marginTop: 100,
    color: "#475569",
  },

  examplesBox: {
    marginTop: 24,
    display: "flex",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 10,
  },

  exampleLine: {
    background: "#f1f5f9",
    padding: "8px 14px",
    borderRadius: 999,
    fontSize: 14,
  },

  trustNote: {
    marginTop: 28,
    fontSize: 13,
    color: "#64748b",
    lineHeight: 1.6,
  },

  row: {
    display: "flex",
    marginBottom: 12,
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
    padding: "10px 18px",
    cursor: "pointer",
  },

  error: {
    color: "#b91c1c",
    fontSize: 12,
    padding: "6px 12px",
    background: "#fef2f2",
  },

  brand: {
  display: "flex",
  alignItems: "center",
  gap: 8,
},

logo: {
  width: 28,
  height: 28,
  borderRadius: 7,
  background: "#0f172a",
  color: "#fff",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontWeight: 700,
  fontSize: 14,
},

};
