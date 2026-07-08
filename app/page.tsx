"use client"
import Image from "next/image"
import f1GPTLogo from "./assets/f1-logo.jpg"
import {useChat} from "ai/react"
import {Message} from "ai"
import LoadingBubble from "./components/LoadingBubble"
import PromptSuggestionRow from "./components/PromptSuggestionRow"
import Bubble from "./components/Bubble"    


const Home=()=>{

    const {append,isLoading,messages,input,handleInputChange,handleSubmit}=useChat()

    const noMessages=!messages || messages.length===0

    const handlePrompt=(promptText)=>{
        const msg: Message={
            id: crypto.randomUUID(),
            content:promptText,
            role:'user'
        }
        append(msg);
    }
    return(
        <main>
            <Image src={f1GPTLogo} width="250" alt="f1GPT"/>
            <section className={noMessages?" ":"populated"}>
                {noMessages ?(
                    <>
                    <p className="starter-text">
                        The ultimate place for Formula One super fans!
                        Ask F1GPT anything about the fantastic topic of F1 racing and it will come back with the most up-to-date answers.
                        We hope you enjoy!
                    </p>
                    <br />
                
                    <PromptSuggestionRow onPromptClick={handlePrompt}/>
                    </>
                    
                ) :(
                    <>
                    {messages.map((message, index)=><Bubble key={`message-${index}`} message={messages}/>)}
                    {isLoading && <LoadingBubble/>}
                    </>
                )}

                <form  onSubmit={handleSubmit}>
                    <input className="question-box" onChange={handleInputChange}
                        value={input} placeholder="Ask me something"/>
                    <input type="submit" />
                    
                </form>

            </section>
        </main>
    )
}

export default Home;


