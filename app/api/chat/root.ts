import openAI from "openai"
import {OpenAIStream,StreamingTextResponse} from 'ai' 
import { DataAPIClient } from "@datastax/astra-db-ts"

const {
    ASTRA_DB_NAMESPACE,
    ASTRA_DB_COLLECTION,
    ASTRA_DB_API_ENDPOINT,
    ASTRA_DB_APPLICATION_TOKEN,
    OPEN_AI_API_KEY 

}=process.env

const openai=new openAI({
    apiKey:OPEN_AI_API_KEY
})

const client=new DataAPIClient(ASTRA_DB_APPLICATION_TOKEN)

const db=client.db(ASTRA_DB_API_ENDPOINT,{namespace:ASTRA_DB_NAMESPACE})

export async function  POST(req:Request){
    try{
        const {messages}=await req.json
        const lastMessage=messages[messages?.length-1]?.content

        let docContext=""

        await openai.embeddings.create({
            model:"text-embedding-3-small",
            input:[lastMessage],
            encoding_format:"float",

        })

        try{
            const collection=await db.collection(ASTRA_DB_COLLECTION)
        
            const cursor=collection.find(null, {
                sort:{
                    $vector:embedding.data[0].embedding
                },
                limit:10
            })

            const documents=await cursor.toArray;

            const docsMap=documents?.map(doc=> doc.text)
            docContext  = Json.stringify(docsMap)
            
        }

    catch(err){
        console.log("Error querring db..")
        docContext=""
    }
    const template={
        role:"system",
        content:`
        You are an AI chatbot that is an expert in Formula 1.
        Use the context to answer the user's question.
        If the answer is not in the context, say that you don't know.
        Question:${lastMessage}
        Context:${docContext}
        `
    }

    const response=await openai.chat.completions.create({
        model:"gpt-4",
        stream:true,
        messages:[template,...messages]
    })

    const stream=OpenAIStream(response){
        return new StreamingTextResponse(stream)
    }catch(err){
        throw err   
    }

}
}
