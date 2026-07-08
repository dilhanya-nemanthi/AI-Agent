"use client"
import { useRef } from "react"
import { useChat } from "ai/react"
import { Message } from "ai"
import LoadingBubble from "./components/LoadingBubble"
import PromptSuggestionRow from "./components/PromptSuggestionRow"
import Bubble from "./components/Bubble"

const Home = () => {
    const { append, isLoading, messages, input, handleInputChange, handleSubmit, stop } = useChat()
    const chatContainerRef = useRef<HTMLDivElement>(null)

    const noMessages = !messages || messages.length === 0

    // Only user messages go into the sidebar history
    const userMessages = messages.filter(m => m.role === "user")

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
        if (el && chatContainerRef.current) {
            el.scrollIntoView({ behavior: "smooth", block: "start" })
        }
    }

    // Find the index of a user message in the full messages array
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

    return (
        <div className="app-layout">
            {/* ── Left Sidebar ── */}
            <aside className="sidebar">
                <div className="sidebar-header">
                    <span className="sidebar-icon"></span>
                    <h2>History</h2>
                </div>

                {userMessages.length === 0 ? (
                    <p className="sidebar-empty">No questions yet.</p>
                ) : (
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
                )}
            </aside>

            {/* ── Main Panel ── */}
            <main>
                <h1 className="title">Astronomy Research Agent</h1>

                <section className={noMessages ? " " : "populated"} ref={chatContainerRef as any}>
                    {noMessages ? (
                        <>
                            <p className="starter-text">
                                Explore the wonders of the universe with AI.
                                Ask the Astronomy Research Agent anything about planets, stars, galaxies,
                                black holes, space missions, exoplanets, or the latest discoveries.
                            </p>
                            <br />
                            <PromptSuggestionRow onPromptClick={handlePrompt} />
                        </>
                    ) : (
                        <>
                            {messages.map((message, index) => (
                                <div id={`message-${index}`} key={`message-${index}`}>
                                    <Bubble message={message} />
                                </div>
                            ))}
                            {isLoading && <LoadingBubble />}
                        </>
                    )}

                    <div className="chat-toolbar">
                        <form onSubmit={handleSubmit} className="chat-form">
                            <input
                                className="question-box"
                                onChange={handleInputChange}
                                value={input}
                                placeholder="Ask me something"
                            />
                            <input type="submit" value="Ask" />
                        </form>
                        <div className="toolbar-actions">
                            <button
                                type="button"
                                className="btn-pause"
                                onClick={() => stop()}
                                disabled={!isLoading}
                                title="Stop the current response"
                            >
                                ⏹ Pause
                            </button>
                            <button
                                type="button"
                                className="btn-pdf"
                                onClick={downloadAsPDF}
                                disabled={messages.length === 0}
                                title="Download chat as PDF"
                            >
                                ⬇ Download PDF
                            </button>
                        </div>
                    </div>
                </section>
            </main>
        </div>
    )
}

export default Home
