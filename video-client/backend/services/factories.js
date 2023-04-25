const {Room} = require('../models/room')
const {Client} = require('../models/client')
const {v4: uuidv4} = require('uuid');
const api = require('../common/api')

let roomFactory = async (mode, recording) => {
    if (recording === undefined) {
        recording = true
    }

    if (mode === undefined) {
        mode = api.room_modes.KURENTO
    }

    let room = new Room();

    room.keys.doctor = uuidv4()
    room.keys.patient = uuidv4()

    room.mode = mode
    room.recording_enabled = recording
    room.state = api.room_states.OPENED
    room.last_activity = Date.now()
    room.had_connection = false

    await room.save()
    console.log("created room ", room)
    return room
}

let clientFactory = (socket) => {
    let client = new Client()

    client.socket = socket
    client.state = api.states.NEED_AUTH
    client.id = socket.id

    return client
}

module.exports = {
    room: roomFactory,
    client: clientFactory
}