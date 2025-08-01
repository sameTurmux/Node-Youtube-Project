import dotenv from "dotenv";
import connectDB from "./db/index.js";
import {app} from "./app.js";

dotenv.config({
    path:"./.env"
});


connectDB().then( () => {

    app.listen(process.env.PORT || 5000,() => {
        console.log(`server running at this Port:${process.env.PORT}`);
    })

}).catch( (error) => {
    console.log("error from index js after function colling",error)
})