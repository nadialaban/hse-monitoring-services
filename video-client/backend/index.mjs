import api from "./common/api.js"
import auth from './services/auth.js'
import webrtc from './services/webrtc.js'
import helpers from './common/helpers.js'
import express from 'express';
import {createServer} from "http";
import {Server} from "socket.io";
import connections from "./common/connections.js"
import rooms from './services/rooms.js'
import admin from './services/admin.js'
import path from 'path';
import {fileURLToPath} from 'url';
import dotenv from 'dotenv'
import repositories from './services/repositories.js'
import factories from './services/factories.js'

dotenv.config()

console.log("Running Medsenger VC")

const app = express()
const http = createServer(app)
const io = new Server(http, {
    cors: {
        origins: [process.env.SERVER_URL]
    }
})
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const host = '127.0.0.1'
const port = process.env.PORT || 7000;

await connections.connect()
await repositories.load()

setInterval(rooms.pingActiveRooms, 5 * 60 * 1000)
setInterval(rooms.closeInactiveRooms, 5 * 60 * 1000)

if (process.env.S3_ENABLED) {
    setInterval(rooms.uploadClosedRooms, 5 * 60 * 1000)
}

rooms.closeInactiveRooms()
rooms.uploadClosedRooms()

let clients = repositories.repositories.clients
let reactors = new Map() // message type -> function
let validators = new Map() // message type -> function

validators.set(api.query_types.AUTH, auth.validators.auth)
validators.set(api.query_types.ICE, webrtc.validators.ice)
validators.set(api.query_types.SDP, webrtc.validators.sdp)

reactors.set(api.query_types.AUTH, (client, message) => auth.makeAuth(client, message))
reactors.set(api.query_types.ICE, (client, message) => webrtc.consumeICE(client, message))
reactors.set(api.query_types.ICE_STATE, (client, message) => webrtc.newIceState(client, message))
reactors.set(api.query_types.SDP, (client, message) => webrtc.consumeSDP(client, message))
reactors.set(api.query_types.CLOSE_ROOM, (client, message) => rooms.closeRoomForClient(client, message))

let retranslative_types = [api.query_types.CAMERA_ENABLED, api.query_types.CAMERA_DISABLED, api.query_types.MIC_DISABLED, api.query_types.MIC_ENABLED]

retranslative_types.forEach(query_type => {
    reactors.set(query_type, (client, message) => webrtc.retranslateMessage(client, message))
})


io.on('connection', (socket) => {
    console.log(`Client with id ${socket.id} connected`)

    let client = factories.client(socket)
    clients.add(client)

    socket.on('message', (message) => {
        if (process.env.MESSAGE_DEBUG === true) {
            console.log(`Got message ${message} from ${socket.id}`)
        }

        try {
            message = helpers.parseMessage(socket, message, validators)
        } catch (error) {
            console.log(`Error parsing message ${message.type} from ${socket.id}: ${error}`)
            helpers.sendMessage(socket, helpers.prepareError([error]))
            return;
        }

        let client = clients.get(socket.id)
        if (!client) return;

        helpers.logMessage(client, message, "incoming")

        if (reactors.has(message.type)) {
            helpers.runReactor(reactors.get(message.type), client, message)
        } else {
            helpers.sendMessage(socket, helpers.prepareError(["Not implemented"]))
        }
    })

    socket.on('disconnect', async () => {
        let client = clients.get(socket.id)

        if (client) {
            helpers.disconnectClient(client)
            if (client.room) {
                await webrtc.releaseRoom(client.room)
            }
            clients.delete(socket.id)
        }

        console.log(`Client with id ${socket.id} disconnected`)
    })
})

app.use('/static', express.static(`./frontend/static`))

app.get('/', (req, res) => res.sendFile('./frontend/index.html', {root: '.'}))

//получение количества активных клиентов
app.post('/admin/rooms', admin.roomCreator)
app.delete('/admin/rooms/:id', admin.roomDeleter)
app.get('/admin/rooms/:id', admin.roomInformer)


http.listen(port, host, () => console.log(`Server listens http://${host}:${port}`))
