import { useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";

const API_BASE = "https://rexolve-backend.onrender.com";

export default function App() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [image, setImage] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  /* ===================== PERSISTENCE ===================== */

  useEffect(() => {
    try {
      const saved = localStorage.getItem("doubtSolverHistory");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          setMessages(parsed);
        }
      }
    } catch (err) {
      console.error("Failed to load history:", err);
    }
  }, []);

  useEffect(() => {
    if (messages.length > 0) {
      localStorage.setItem("doubtSolverHistory", JSON.stringify(messages));
    }
  }, [messages]);

  function handleClearChat() {
    if (!window.confirm("Clear the entire chat?")) return;
    setMessages([]);
    localStorage.removeItem("doubtSolverHistory");
  }

  /* ===================== SEND ===================== */

  async function handleSend() {
    if ((!input.trim() && !image) || loading) return;

    const userMsg = {
      role: "user",
      text: input || "[Image question]",
      imagePreview: image ? URL.createObjectURL(image) : null,
    };

    const nextMessages = [...messages, userMsg];
    setMessages(nextMessages);
    setInput("");
    setLoading(true);
    setError("");

    try {
      let ocrText = "";

      // OCR
      if (image) {
        const formData = new FormData();
        formData.append("image", image);

        const ocrRes = await fetch(`${API_BASE}/ocr`, {
          method: "POST",
          body: formData,
        });

        const contentType = ocrRes.headers.get("content-type");

if (!ocrRes.ok) {
  const errText = await ocrRes.text();
  throw new Error(`OCR failed (${ocrRes.status}): ${errText}`);
}

if (!contentType || !contentType.includes("application/json")) {
  const raw = await ocrRes.text();
  throw new Error("OCR returned non-JSON:\n" + raw.slice(0, 200));
}

const ocrData = await ocrRes.json();
ocrText = ocrData.text;
      }

      // Ask AI
      const res = await fetch(`${API_BASE}/ask-doubt`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
  messages: [
    ...(ocrText
      ? [{
          role: "system",
          content: `The following text was extracted from an image using OCR:\n\n${ocrText}`
        }]
      : []),
    ...nextMessages.map((m) => ({
      role: m.role,
      content: m.text,
    })),
  ],
}),

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "AI error");

      const aiMsg = { role: "assistant", text: data.answer };
      setMessages([...nextMessages, aiMsg]);
    } catch (err) {
      console.error(err);
      setError(err.message || "Something went wrong");
    } finally {
      setImage(null);
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
      {/* HEADER */}
      <header style={styles.header}>
        <div style={styles.brand}>
          <div style={styles.logo}>R</div>
          <span>ReXolve</span>
        </div>

        {/* CLEAR BUTTON — TOP RIGHT */}
        <button onClick={handleClearChat} style={styles.clearBtn}>
          Clear
        </button>
      </header>

      {/* MAIN */}
      <main style={styles.container}>
        <div style={styles.chatBox}>
          <div style={styles.messages}>
            {messages.length === 0 && (
              <div style={styles.empty}>
                <h2>Welcome</h2>
                <p>Your personal study tutor.</p>
                <p style={styles.example}>
                  Try: “Explain photosynthesis simply”
                </p>
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

                  {m.imagePreview && (
                    <img
                      src={m.imagePreview}
                      alt="uploaded"
                      style={styles.image}
                    />
                  )}
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

          {/* INPUT */}
          <div style={styles.inputBar}>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setImage(e.target.files[0] || null)}
              style={styles.fileInput}
            />

            <textarea
              rows={1}
              placeholder="Type your question…"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              style={styles.textarea}
            />

            <button
              onClick={handleSend}
              disabled={loading}
              style={{
                ...styles.sendBtn,
                opacity: loading ? 0.6 : 1,
                cursor: loading ? "not-allowed" : "pointer",
              }}
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
    background: "linear-gradient(180deg, #f8fafc 0%, #eef2ff 50%, #f8fafc 100%)",
  },

  header: {
    background: "#ffffff",
    padding: "14px 20px",
    borderBottom: "1px solid #e5e7eb",
    display: "flex",
    justifyContent: "space-between", // ⬅ pushes Clear to the right
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

  logo: {
    width: 32,
    height: 32,
    borderRadius: 8,
    background: "#0f172a",
    color: "#fff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: 800,
  },

  clearBtn: {
    background: "transparent",
    border: "1px solid #e5e7eb",
    borderRadius: 6,
    padding: "6px 12px",
    fontSize: 12,
    cursor: "pointer",
    color: "#475569",
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
    boxShadow: "0 4px 16px rgba(15,23,42,0.05)",
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
    color: "#0f172a",
  },

  row: {
    display: "flex",
    marginBottom: 12,
  },

  bubble: {
    maxWidth: "75%",
    padding: "10px 14px",
    borderRadius: 10,
    fontSize: 14,
    lineHeight: 1.5,
  },

  userBubble: {
    background: "#0f172a",
    color: "#ffffff",
  },

  aiBubble: {
    background: "#f1f5f9",
    color: "#0f172a",
  },

  image: {
    marginTop: 8,
    maxWidth: "100%",
    borderRadius: 8,
  },

  inputBar: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    padding: 12,
    borderTop: "1px solid #e5e7eb",
    background: "#ffffff",
  },

  fileInput: {
    fontSize: 11,
  },

  textarea: {
    flex: 1,
    resize: "none",
    border: "1px solid #e5e7eb",
    borderRadius: 8,
    padding: "8px 10px",
    fontSize: 14,
    outline: "none",
  },

  sendBtn: {
    background: "#0f172a",
    color: "#ffffff",
    border: "none",
    borderRadius: 8,
    padding: "8px 16px",
    fontSize: 14,
    fontWeight: 500,
  },

  error: {
    color: "#b91c1c",
    fontSize: 12,
    padding: "6px 12px",
    borderTop: "1px solid #fee2e2",
    background: "#fef2f2",
  },
};
