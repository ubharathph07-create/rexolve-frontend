import { useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";

const API_BASE = "https://rexolve-backend.onrender.com";

export default function App() {
  const [sessions, setSessions] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  /* ===================== STORAGE ===================== */

  useEffect(() => {
    const saved = localStorage.getItem("prepseek_sessions");
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) {
        setSessions(parsed);
        setActiveId(parsed[0].id);
        return;
      }
    }
    createNewSession();
  }, []);

  useEffect(() => {
    localStorage.setItem("prepseek_sessions", JSON.stringify(sessions));
  }, [sessions]);

  function createNewSession() {
    const id = Date.now();
    const newSession = {
      id,
      title: "New decision",
      messages: [],
    };
    setSessions((prev) => [newSession, ...prev]);
    setActiveId(id);
  }

  function updateSession(id, updater) {
    setSessions((prev) =>
      prev.map((s) => (s.id === id ? updater(s) : s))
    );
  }

  function deleteSession(id) {
    if (!window.confirm("Delete this decision?")) return;
    const remaining = sessions.filter((s) => s.id !== id);
    setSessions(remaining);
    if (remaining.length > 0) {
      setActiveId(remaining[0].id);
    } else {
      createNewSession();
    }
  }

  const activeSession =
    sessions.find((s) => s.id === activeId) || sessions[0];

  /* ===================== SEND ===================== */

  async function handleSend() {
    if (!input.trim() || loading || !activeSession) return;

    const userMessage = {
      role: "user",
      text: input.trim(),
    };

    const updatedMessages = [...activeSession.messages, userMessage];

    updateSession(activeId, (s) => ({
      ...s,
      messages: updatedMessages,
      title: s.messages.length === 0 ? input.slice(0, 40) : s.title,
    }));

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

      updateSession(activeId, (s) => ({
        ...s,
        messages: [
          ...updatedMessages,
          { role: "assistant", text: data.answer },
        ],
      }));
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
      <aside style={styles.sidebar}>
        <div style={styles.sidebarHeader}>
          <div style={styles.brand}>
            <div style={styles.logo}>P</div>
            <span>PrepSeek</span>
          </div>

          <button onClick={createNewSession} style={styles.newBtn}>
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
              <span style={styles.sessionTitle}>{s.title}</span>

              <div style={styles.sessionActions}>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    const name = prompt("Rename decision:", s.title);
                    if (name) {
                      updateSession(s.id, (x) => ({
                        ...x,
                        title: name,
                      }));
                    }
                  }}
                  style={styles.iconBtn}
                >
                  ✏️
                </button>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteSession(s.id);
                  }}
                  style={styles.iconBtn}
                >
                  🗑️
                </button>
              </div>
            </div>
          ))}
        </div>
      </aside>

      {/* MAIN */}
      <main style={styles.main}>
        <header style={styles.topBar}>
          <span style={{ fontWeight: 600 }}>
            {activeSession?.title}
          </span>

          <button
            onClick={() =>
              updateSession(activeId, (s) => ({
                ...s,
                messages: [],
              }))
            }
            style={styles.clearBtn}
          >
            Clear
          </button>
        </header>

        <div style={styles.chatBox}>
          <div style={styles.messages}>
            {activeSession.messages.length === 0 && (
              <div style={styles.empty}>
                <h2>What are you deciding today?</h2>
                <p>A calm assistant to think through everyday choices.</p>

                <div style={styles.suggestions}>
                  <div>Should I switch jobs this year?</div>
                  <div>Rent or buy in my situation?</div>
                  <div>Mac or Windows for my work?</div>
                </div>

                <p style={styles.disclaimer}>
                  ⚠️ This is an AI and may be inaccurate or incomplete.
                  Use it as a thinking aid — not a source of absolute
                  truth. Final decisions are always yours.
                </p>
              </div>
            )}

            {activeSession.messages.map((m, i) => (
              <div
                key={i}
                style={{
                  ...styles.row,
                  justifyContent:
                    m.role === "user"
                      ? "flex-end"
                      : "flex-start",
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
              <div style={styles.row}>
                <div
                  style={{
                    ...styles.bubble,
                    ...styles.aiBubble,
                    fontStyle: "italic",
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
              Send
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
    padding: 16,
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

  newBtn: {
    border: "1px solid #e5e7eb",
    borderRadius: 6,
    padding: "4px 10px",
    cursor: "pointer",
  },

  sessionList: {
    flex: 1,
    padding: 8,
    overflowY: "auto",
  },

  sessionItem: {
    padding: "10px 12px",
    borderRadius: 8,
    cursor: "pointer",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },

  sessionActive: {
    background: "#eef2ff",
  },

  sessionTitle: {
    fontSize: 14,
  },

  sessionActions: {
    display: "flex",
    gap: 6,
  },

  iconBtn: {
    background: "transparent",
    border: "none",
    cursor: "pointer",
  },

  /* MAIN */

  main: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
  },

  topBar: {
    padding: "14px 20px",
    borderBottom: "1px solid #e5e7eb",
    display: "flex",
    justifyContent: "space-between",
  },

  clearBtn: {
    border: "1px solid #e5e7eb",
    borderRadius: 6,
    padding: "6px 12px",
    cursor: "pointer",
  },

  chatBox: {
    flex: 1,
    maxWidth: 900,
    margin: "0 auto",
    width: "100%",
    display: "flex",
    flexDirection: "column",
  },

  messages: {
    flex: 1,
    padding: 30,
    overflowY: "auto",
  },

  empty: {
    textAlign: "center",
    marginTop: 100,
    color: "#334155",
  },

  suggestions: {
    marginTop: 20,
    display: "flex",
    gap: 10,
    justifyContent: "center",
    flexWrap: "wrap",
  },

  disclaimer: {
    marginTop: 30,
    fontSize: 13,
    color: "#64748b",
    maxWidth: 500,
    marginLeft: "auto",
    marginRight: "auto",
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
    padding: 16,
    borderTop: "1px solid #e5e7eb",
  },

  textarea: {
    flex: 1,
    resize: "none",
    border: "1px solid #e5e7eb",
    borderRadius: 8,
    padding: "10px 12px",
  },

  sendBtn: {
    background: "#0f172a",
    color: "#ffffff",
    border: "none",
    borderRadius: 8,
    padding: "10px 18px",
    cursor: "pointer",
  },

  error: {
    color: "#b91c1c",
    fontSize: 12,
    padding: "6px 12px",
    background: "#fef2f2",
  },
};
