import { Ollama } from "ollama"
// OllamaStream was removed in ai v3; using native ReadableStream instead
import { DataAPIClient } from "@datastax/astra-db-ts"

const {
    ASTRA_DB_NAMESPACE,
    ASTRA_DB_COLLECTION,
    ASTRA_DB_API_ENDPOINT,
    ASTRA_DB_APPLICATION_TOKEN,
    OLLAMA_HOST,
    OLLAMA_MODEL,
    OLLAMA_EMBEDDING_MODEL,
} = process.env

const ollama = new Ollama({ host: OLLAMA_HOST ?? "http://localhost:11434" })

const client = new DataAPIClient(ASTRA_DB_APPLICATION_TOKEN)
const db = client.db(ASTRA_DB_API_ENDPOINT, { namespace: ASTRA_DB_NAMESPACE })

export async function POST(req: Request) {
    try {
        const { messages } = await req.json()
        const lastMessage = messages[messages?.length - 1]?.content

        let docContext = ""

        // Generate embedding using Ollama (nomic-embed-text → 768 dimensions)
        const embeddingResponse = await ollama.embeddings({
            model: OLLAMA_EMBEDDING_MODEL ?? "nomic-embed-text",
            prompt: lastMessage,
        })

        try {
            const collection = await db.collection(ASTRA_DB_COLLECTION)

            const cursor = collection.find(null, {
                sort: {
                    $vector: embeddingResponse.embedding,
                },
                limit: 10,
            })

            const documents = await cursor.toArray()
            const docsMap = documents?.map(doc => doc.text)
            docContext = JSON.stringify(docsMap)

        } catch (err) {
            console.log("Error querying db..")
            docContext = ""
        }

        const template = {
            role: "system",
            content: `
            You are an AI chatbot that is an expert in Formula 1.
            Use the context to answer the user's question.
            If the answer is not in the context, say that you don't know.
            Question: ${lastMessage}
            Context: ${docContext}
            `
        }

        // Stream chat response from Ollama
        const response = await ollama.chat({
            model: OLLAMA_MODEL ?? "llama3",
            stream: true,
            messages: [template, ...messages],
        })

        // Convert the Ollama async-iterable stream to a Web ReadableStream
        const stream = new ReadableStream({
            async start(controller) {
                const encoder = new TextEncoder()
                for await (const chunk of response) {
                    const text = chunk.message?.content ?? ""
                    if (text) controller.enqueue(encoder.encode(text))
                }
                controller.close()
            },
        })
        return new Response(stream, {
            headers: { "Content-Type": "text/plain; charset=utf-8" },
        })

    } catch (err) {
        throw err
    }
}
