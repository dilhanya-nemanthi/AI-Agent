import "./global.css"

export const metadata={
    title:"Sci-FiGPT",
    description:"The place Sci not being Fi questions!"

}

const RootLayout=({children})=>{
    return(
        <html lang="en">
            <head>
                <meta name="viewport" content="width=device-width, initial-scale=1" />
            </head>
            <body>
                {children}
            </body>
        </html>
        )

}

export default RootLayout