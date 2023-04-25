import dotenv from 'dotenv'
import fetch from "node-fetch";

dotenv.config()

let response = await fetch(process.env.VUE_APP_SERVER_URL + '/admin/rooms', {
    method: "POST",
    headers: {
        'Content-Type': 'application/json',
        "Auth": process.env.ADMIN_KEY
    }
})
let data = await response.json();

console.log("Data:", data)
console.log("Patient link:", process.env.VUE_APP_SERVER_URL + "/?access_key=" + data.keys.patient)
console.log("Doctor link:", process.env.VUE_APP_SERVER_URL + "/?access_key=" + data.keys.doctor)
