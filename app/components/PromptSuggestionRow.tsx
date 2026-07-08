import PromptSuggestionButton from "./PromptSuggestionButton";

const PromptSuggestionRow=({onPromptClick})=>{
    const prompts=[
        "Who is the head of racing for Aston Martin's F1 Team?",
        "Who is thee highest paid driver in F1 2026?",
        "Who will be the newest driver for Ferari?",
        "Who is the current Formula one champion? "
    ]
    return (
        <div className="prompt-suggestions">

            {prompts.map((prompt,index)=><PromptSuggestionButton key={`suggestion-${index}`} text={prompt} onClick={() =>onPromptClick(prompt)}/>)}
        </div>
    )
}

export default PromptSuggestionRow;