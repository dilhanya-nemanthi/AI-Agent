"use client"
import { useRef, useEffect, useState } from "react"
import { useChat } from "ai/react"
import { Message } from "ai"
import LoadingBubble from "./components/LoadingBubble"
import PromptSuggestionRow from "./components/PromptSuggestionRow"
import Bubble from "./components/Bubble"

// ── Types ──────────────────────────────────────────────────────────────────
interface HistoryEntry {
    id: string
    question: string
    timestamp: number   // Date.now()
    sessionId: string
}

const STORAGE_KEY = "astronomy-chat-history"
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000

// Label a timestamp as "Today", "Yesterday", or day name
function dayLabel(ts: number): string {
    const d = new Date(ts)
    const now = new Date()
    const diffDays = Math.floor((now.setHours(0,0,0,0) - new Date(d).setHours(0,0,0,0)) / 86400000)
    if (diffDays === 0) return "Today"
    if (diffDays === 1) return "Yesterday"
    return d.toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" })
}

// ── Component ───────────────────────────────────────────────────────────────
const Home = () => {
    const { append, isLoading, messages, input, handleInputChange, handleSubmit, stop } = useChat()
    const chatContainerRef = useRef<HTMLDivElement>(null)
    const bottomRef = useRef<HTMLDivElement>(null)
    const [sidebarOpen, setSidebarOpen] = useState(false)

    // Stable session ID for this page load
    const sessionId = useRef<string>(crypto.randomUUID())

    // Past entries from localStorage (not current session)
    const [pastHistory, setPastHistory] = useState<HistoryEntry[]>([])

    // ── Load history from localStorage on mount ────────────────────────────
    useEffect(() => {
        try {
            const raw = localStorage.getItem(STORAGE_KEY)
            if (!raw) return
            const all: HistoryEntry[] = JSON.parse(raw)
            const cutoff = Date.now() - SEVEN_DAYS_MS
            // Keep only last-7-days entries that are NOT from this session
            const filtered = all.filter(e => e.timestamp >= cutoff && e.sessionId !== sessionId.current)
            setPastHistory(filtered)
        } catch { /* ignore parse errors */ }
    }, [])

    // ── Save new user messages to localStorage ─────────────────────────────
    useEffect(() => {
        const userMsgs = messages.filter(m => m.role === "user")
        if (userMsgs.length === 0) return

        try {
            const raw = localStorage.getItem(STORAGE_KEY)
            const existing: HistoryEntry[] = raw ? JSON.parse(raw) : []

            // Build a map of question text → existing entry so we can deduplicate
            const byText = new Map<string, HistoryEntry>()
            for (const e of existing) byText.set(e.question.trim(), e)

            // Upsert each user message: update timestamp if already exists, else add
            for (const m of userMsgs) {
                const key = m.content.trim()
                byText.set(key, {
                    id: byText.get(key)?.id ?? m.id,   // keep original id if exists
                    question: m.content,
                    timestamp: Date.now(),
                    sessionId: sessionId.current,
                })
            }

            // Prune to last 7 days and persist
            const cutoff = Date.now() - SEVEN_DAYS_MS
            const merged = Array.from(byText.values()).filter(e => e.timestamp >= cutoff)
            localStorage.setItem(STORAGE_KEY, JSON.stringify(merged))
        } catch { /* ignore */ }
    }, [messages])

    // ── Auto-scroll to bottom on new messages ─────────────────────────────
    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: "smooth" })
    }, [messages])

    const noMessages = !messages || messages.length === 0

    // Only user messages, deduplicated by content text for sidebar display
    const userMessages = messages
        .filter(m => m.role === "user")
        .filter((m, i, arr) => arr.findIndex(x => x.content.trim() === m.content.trim()) === i)

    const handlePrompt = (promptText: string) => {
        const msg: Message = {
            id: crypto.randomUUID(),
            content: promptText,
            role: "user",
        }
        append(msg)
    }

    const scrollToMessage = (index: number) => {
        const el = document.getElementById(`message-${index}`)
        if (el) el.scrollIntoView({ behavior: "smooth", block: "start" })
    }

    const getMessageIndex = (userMsg: Message) =>
        messages.findIndex(m => m.id === userMsg.id)

    const downloadAsPDF = () => {
        const printWindow = window.open("", "_blank")
        if (!printWindow) return
        const content = messages
            .map(m => `<div style="margin:12px 0; padding:10px 14px; border-radius:10px;
                background:${m.role === "user" ? "#E1F4FF" : "#dce7ff"};
                max-width:80%; ${m.role === "user" ? "margin-left:auto;" : ""} font-family:monospace;">
                <strong>${m.role === "user" ? "You" : "AI"}:</strong><br/>${m.content.replace(/\n/g, "<br/>")}
            </div>`)
            .join("")
        printWindow.document.write(`
            <!DOCTYPE html><html><head>
            <title>Astronomy Research Chat</title>
            <style>body{font-family:monospace;padding:30px;max-width:800px;margin:0 auto}
            h1{font-size:20px;border-bottom:2px solid #333;padding-bottom:10px}
            </style></head><body>
            <h1>Astronomy Research Agent – Chat Export</h1>
            <p style="color:#666;font-size:13px">Exported on ${new Date().toLocaleString()}</p>
            ${content}
            </body></html>`)
        printWindow.document.close()
        printWindow.focus()
        setTimeout(() => printWindow.print(), 400)
    }

    // ── Group past history by day label ───────────────────────────────────
    const pastGroups: Record<string, HistoryEntry[]> = {}
    // Sort newest-first
    const sortedPast = [...pastHistory].sort((a, b) => b.timestamp - a.timestamp)
    for (const entry of sortedPast) {
        const label = dayLabel(entry.timestamp)
        if (!pastGroups[label]) pastGroups[label] = []
        pastGroups[label].push(entry)
    }

    return (
        <div className="app-layout">
            {/* ── Hamburger toggle (visible ≤768px) ── */}
            <button
                className="sidebar-toggle"
                onClick={() => setSidebarOpen(prev => !prev)}
                aria-label="Toggle sidebar"
            >
                {sidebarOpen ? "✕" : "☰"}
            </button>

            {/* Overlay behind sidebar on mobile */}
            <div
                className={`sidebar-overlay${sidebarOpen ? " open" : ""}`}
                onClick={() => setSidebarOpen(false)}
            />

            {/* ── Left Sidebar ── */}
            <aside className={`sidebar${sidebarOpen ? " open" : ""}`}>
                <div className="sidebar-header">
                    <span className="sidebar-icon"></span>
                    <h2>History</h2>
                </div>

                {/* Current session questions */}
                {userMessages.length > 0 && (
                    <div className="sidebar-section">
                        <p className="sidebar-section-label">This session</p>
                        <ul className="sidebar-list">
                            {userMessages.map((msg, i) => (
                                <li key={msg.id}>
                                    <button
                                        className="sidebar-item"
                                        onClick={() => scrollToMessage(getMessageIndex(msg))}
                                        title={msg.content}
                                    >
                                        <span className="sidebar-num">{i + 1}</span>
                                        <span className="sidebar-text">
                                            {msg.content.length > 60
                                                ? msg.content.slice(0, 60) + "…"
                                                : msg.content}
                                        </span>
                                    </button>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}

                {/* Past 7-day history grouped by day */}
                {Object.keys(pastGroups).length > 0 ? (
                    Object.entries(pastGroups).map(([label, entries]) => (
                        <div className="sidebar-section" key={label}>
                            <p className="sidebar-section-label">{label}</p>
                            <ul className="sidebar-list">
                                {entries.map(entry => (
                                    <li key={entry.id}>
                                        <button
                                            className="sidebar-item sidebar-item-past"
                                            onClick={() => handlePrompt(entry.question)}
                                            title={`Re-ask: ${entry.question}`}
                                        >
                                            <span className="sidebar-past-icon">↩</span>
                                            <span className="sidebar-text">
                                                {entry.question.length > 58
                                                    ? entry.question.slice(0, 58) + "…"
                                                    : entry.question}
                                            </span>
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    ))
                ) : userMessages.length === 0 ? (
                    <p className="sidebar-empty">No questions yet.<br/>Your history from the last 7 days will appear here.</p>
                ) : null}
            </aside>

            {/* ── Main Panel ── */}
            <main>
                <h1 className="title">Astronomy Research Agent</h1>

                {noMessages && (
                    <div className="intro-block">
                        <p className="starter-text">
                            Explore the wonders of the universe with AI.
                            Ask the Astronomy Research Agent anything about planets, stars, galaxies,
                            black holes, space missions, exoplanets, or the latest discoveries.
                        </p>
                        <PromptSuggestionRow onPromptClick={handlePrompt} />
                    </div>
                )}

                <section className={noMessages ? " " : "populated"} ref={chatContainerRef as any}>
                    {!noMessages && (
                        <div className="messages-wrapper">
                            {messages.map((message, index) => (
                                <div id={`message-${index}`} key={`message-${index}`}>
                                    <Bubble message={message} />
                                </div>
                            ))}
                            {isLoading && <LoadingBubble />}
                            <div ref={bottomRef} />
                        </div>
                    )}
                </section>

                {/* Toolbar always pinned outside scroll area */}
                <form onSubmit={handleSubmit} className="chat-toolbar">
                    {/* Row 1: full-width input */}
                    <div className="chat-form">
                        <input
                            className="question-box"
                            onChange={handleInputChange}
                            value={input}
                            placeholder="Ask me something"
                        />
                    </div>
                    {/* Row 2: three equal buttons */}
                    <div className="toolbar-actions">
                        <input type="submit" value="Ask" className="action-btn" />
                        <button
                            type="button"
                            className="action-btn"
                            onClick={() => stop()}
                            disabled={!isLoading}
                            title="Stop the current response"
                        >
                            ⏹ Pause
                        </button>
                        <button
                            type="button"
                            className="action-btn"
                            onClick={downloadAsPDF}
                            disabled={messages.length === 0}
                            title="Download chat as PDF"
                        >
                            ⬇ Download PDF
                        </button>
                    </div>
                </form>
            </main>
        </div>
    )
}

export default Home
