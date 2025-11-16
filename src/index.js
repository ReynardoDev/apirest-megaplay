import app from "./app.js";
import {BASE_PORT} from "./config.js";


app.listen(BASE_PORT, () => {
    console.log("Server is running on port " + BASE_PORT);
});
