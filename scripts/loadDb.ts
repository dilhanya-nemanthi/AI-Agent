import { DataAPIClient } from "@datastax/astra-db-ts"
import { PuppeteerWebBaseLoader } from "langchain/document_loaders/web/puppeteer"
import { Ollama } from "ollama"
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter"
import "dotenv/config"

type SimilarityMetric = "dot_product" | "cosine" | "euclidean"

const {
    ASTRA_DB_NAMESPACE,
    ASTRA_DB_COLLECTION,
    ASTRA_DB_API_ENDPOINT,
    ASTRA_DB_APPLICATION_TOKEN,
    OLLAMA_HOST,
    OLLAMA_EMBEDDING_MODEL,
} = process.env

if (!ASTRA_DB_NAMESPACE || !ASTRA_DB_COLLECTION || !ASTRA_DB_API_ENDPOINT || !ASTRA_DB_APPLICATION_TOKEN) {
    throw new Error("Missing one or more required environment variables. Check your .env file.")
}

const ollama = new Ollama({ host: OLLAMA_HOST ?? "http://localhost:11434" })
const EMBEDDING_MODEL = OLLAMA_EMBEDDING_MODEL ?? "nomic-embed-text"

const f1Data = [
    'https://en.wikipedia.org/wiki/Formula_One',
    'https://www.formula1.com/',
    "https://www.skysports.com/f1",
    "https://www.espn.com/f1",
    "https://www.bbc.com/sport/formula1"
]

const client = new DataAPIClient(ASTRA_DB_APPLICATION_TOKEN)
const db = client.db(ASTRA_DB_API_ENDPOINT, { keyspace: ASTRA_DB_NAMESPACE })

const splitter = new RecursiveCharacterTextSplitter({
    chunkSize: 500,
    chunkOverlap: 100,
})

const createCollection = async (similarityMetric: SimilarityMetric = "dot_product") => {
    try {
        const res = await db.createCollection(ASTRA_DB_COLLECTION, {
            vector: {
                dimension: 768, // nomic-embed-text outputs 768 dimensions
                metric: similarityMetric,
            }
        })
        console.log(res)
    } catch (e: any) {
        if (e?.name === "CollectionAlreadyExistsError") {
            console.log(`Collection '${ASTRA_DB_COLLECTION}' already exists, skipping creation.`)
        } else {
            throw e
        }
    }
}

const scrapePage = async (url: string) => {
    const loader = new PuppeteerWebBaseLoader(url, {
        launchOptions: { headless: true },
        gotoOptions: { waitUntil: "domcontentloaded" },
        evaluate: async (page: any, browser: any) => {
            const result = await page.evaluate(() => (document as Document).body.innerText)
            await browser.close()
            return result
        }
    })
    return (await loader.scrape())?.replace(/<[^>]*>?/gm, "")
}

const loadSampleData = async () => {
    const collection = await db.collection(ASTRA_DB_COLLECTION)
    for await (const url of f1Data) {
        const content = await scrapePage(url)
        const chunks = await splitter.splitText(content)
        for await (const chunk of chunks) {
            // Generate embedding using Ollama (nomic-embed-text → 768 dims)
            const embeddingResponse = await ollama.embeddings({
                model: EMBEDDING_MODEL,
                prompt: chunk,
            })
            const vector = embeddingResponse.embedding
            const res = await collection.insertOne({
                $vector: vector,
                text: chunk,
            })
            console.log(res)
        }
    }
}

createCollection().then(() => loadSampleData())
