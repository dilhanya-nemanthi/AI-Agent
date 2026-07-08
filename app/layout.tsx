import "./global.css"

export const metadata={
    title:"Sci-FiGPT",
    description:"The place Sci not being Fi questions!"

}

const RootLayout=({children})=>{
    return(
        <html lang="en">
            <body>
                {children}
            </body>
        </html>
        )

}

export default RootLayout