import dotenv from 'dotenv'
import fetch from "node-fetch";

dotenv.config()

let response = await fetch(process.env.VUE_APP_SERVER_URL + '/admin/rooms/' + process.argv.slice(2)[0], {
    method: "DELETE",
    headers: {
        'Content-Type': 'application/json',
        "Auth": process.env.ADMIN_KEY
    }
})

let data = await response.text();

console.log("Data:", data)
