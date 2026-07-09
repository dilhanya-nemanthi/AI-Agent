import { streamText } from "ai"
import { createGroq } from "@ai-sdk/groq"
import { DataAPIClient } from "@datastax/astra-db-ts"

const {
    ASTRA_DB_NAMESPACE,
    ASTRA_DB_COLLECTION,
    ASTRA_DB_API_ENDPOINT,
    ASTRA_DB_APPLICATION_TOKEN,
    GROQ_API_KEY,
} = process.env

const groq = createGroq({ apiKey: GROQ_API_KEY })

// Astra DB client (optional — gracefully skipped if unavailable)
const client = new DataAPIClient(ASTRA_DB_APPLICATION_TOKEN)
const db = client.db(ASTRA_DB_API_ENDPOINT!, { keyspace: ASTRA_DB_NAMESPACE })

export async function POST(req: Request) {
    try {
        const { messages } = await req.json()
        const lastMessage = messages[messages?.length - 1]?.content

        let docContext = ""

        // Try to fetch relevant context from Astra DB vector search
        // This is optional — if DB is unreachable, the agent still works
        try {
            const collection = await db.collection(ASTRA_DB_COLLECTION!)

            // Use Groq to generate a search query, then query the DB
            // Since Groq doesn't offer embeddings, we do a simple text search
            // If you have embeddings stored, you'll need a separate embedding provider
            const dbQuery = async () => {
                const cursor = collection.find(
                    { $text: lastMessage },
                    { limit: 5 }
                )
                return await cursor.toArray()
            }

            const timeout = new Promise((_, reject) =>
                setTimeout(() => reject(new Error("DB query timeout")), 5000)
            )

            const documents = await Promise.race([dbQuery(), timeout]) as any[]
            const docsMap = documents?.map(doc => doc.text)
            docContext = JSON.stringify(docsMap)

        } catch (err) {
            console.log("Error querying db:", err instanceof Error ? err.message : err)
            docContext = ""
        }

        const systemPrompt = `
You are an AI chatbot that is an expert in Astronomy.
Use the context below (if available) to enhance your answers.
If the context is empty or irrelevant, use your own knowledge to answer.
Be informative, accurate, and engaging.

Context: ${docContext}
`.trim()

        // Stream chat response from Groq (works on both local and Vercel)
        const result = await streamText({
            model: groq("llama-3.3-70b-versatile"),
            system: systemPrompt,
            messages,
        })

        return result.toDataStreamResponse()

    } catch (err) {
        console.error("Chat API error:", err)
        return new Response(
            JSON.stringify({ error: "Failed to process chat request" }),
            { status: 500, headers: { "Content-Type": "application/json" } }
        )
    }
}
