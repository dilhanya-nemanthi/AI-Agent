import PromptSuggestionButton from "./PromptSuggestionButton";

const PromptSuggestionRow=({onPromptClick})=>{
    const prompts=[
        "Stars",
        "Planets",
        "Galaxies",
        "Asteriods",
        "Black holes",  
        "Space missions",
        "Exoplanets",
        "Latest discoveries",
        "Space research"
    ]
    return (
        <div className="prompt-suggestions">

            {prompts.map((prompt,index)=><PromptSuggestionButton key={`suggestion-${index}`} text={prompt} onClick={() =>onPromptClick(prompt)}/>)}
        </div>
    )
}

export default PromptSuggestionRow;