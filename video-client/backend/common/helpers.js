const api = require("./api")
const {v4: uuidv4} = require('uuid');
const connections = require('./connections')

require('dotenv').config()

let getError = (errors, type) => {
    if (type == undefined) {
        type = api.answer_types.ERROR
    }

    return [type, undefined, errors]
}

let getAnswer = (type, params) => {
    return [type, params, undefined]
}

let parseMessage = (socket, message, validators) => {

    try {
        message = JSON.parse(message)
    } catch (e) {
        throw "Message is not JSON formatted"
    }

    if (message.type === undefined) {
        throw "Message is not JSON formatted"
    }

    if (message.timestamp === undefined) {
        throw "Message should have timestamp"
    }

    if (message.id === undefined) {
        throw "Message should have id"
    }

    if (!Object.values(api.query_types).includes(message.type)) {
        throw "Unknown message type"
    }

    if (validators.has(message.type)) {
        let validator = validators.get(message.type)
        validator(message.params)
    }

    return message
}

let prepareError = (errors, type) => {
    if (!type) {
        type = api.answer_types.ERROR
    }
    return JSON.stringify({
        type: type,
        errors: errors
    })
}

let prepareMessage = (type, params) => {
    if (params === undefined) {
        params = {}
    }

    return JSON.stringify({
        type: type,
        params: params,
        timestamp: Date.now(),
        id: uuidv4()
    })
}

let handle = (socket, type, params, errors) => {
    if (process.env.MESSAGE_DEBUG === true) {
        console.log(`Handling ${type} with params ${JSON.stringify(params)} / errors ${JSON.stringify(errors)} from socket id ${socket.id}`)
    }

    if (errors !== undefined) {
        socket.emit('message', prepareError(errors))
        throw "Handle error"
    } else {
        if (type !== undefined) {
            socket.emit('message', prepareMessage(type, params))
        }
    }

    return [type, params, errors]
}

let check = (socket, type, params, errors) => {
    if (errors !== undefined) {
        socket.emit('message', prepareError(errors))
        throw "Handle error"
    }

    return [type, params, errors]
}

let breakConnection = (socket, reason, params) => {
    console.log(`Disconnecting socket ${socket.id} by reason ${reason}`)
    sendMessage(socket, prepareMessage(reason, params))
    socket.disconnect(0)
}

let sendConnectedEvents = (room) => {
    if (room.sockets.doctor && room.sockets.patient) {
        room.sockets.doctor.emit('message', prepareMessage(api.answer_types.INTERLOCUTOR_CONNECTED))
        room.sockets.patient.emit('message', prepareMessage(api.answer_types.INTERLOCUTOR_CONNECTED))
    }
}

let getInterlocutorSocket = (client) => {
    if (!client.room) {
        return undefined
    }

    if (client.role === api.roles.DOCTOR) {
        return client.room.sockets.patient
    }

    if (client.role === api.roles.PATIENT) {
        return client.room.sockets.doctor
    }

    return undefined
}

let sendMessage = (socket, message) => {
    try {
        socket.emit('message', message)
        logMessage(getClientForSocket(socket), JSON.parse(message), "outcoming")

        if (process.env.MESSAGE_DEBUG === true) {
            console.log(`Sending ${message} to ${socket.id}`)
        }

    } catch (e) {

    }
}

let markHadConnection = (room) => {
    console.log("Running markHadConnection for room ", room.id)
    room.had_connection = true
    pgQuery('UPDATE rooms SET had_connection = true WHERE id = $1', [room.id])
}

let logMessage = (client, message, direction) => {

    let received = null;

    if (direction === 'incoming') {
        received = Date.now()
    }

    pgQuery('INSERT INTO message_log (type, params, sender_id, direction, sent_timestamp, received_timestamp, connection_id, client_state, client_role, room_id) ' +
        'VALUES ($1::text, $2::json,$3::text,$4::text,$5::float,$6::float,$7::text, $8::text,  $9::text, $10::integer)', [message.type, message.params, message.id, direction, message.timestamp, received, client.socket.id, client.state, client.role ? client.role : null, client.room ? client.room.id : null])
}

let pgQuery = async (query, params) => {
    const q = {
        text: query,
        values: params,
        rowMode: 'array',
    }

    return await (new Promise((resolve, reject) => {
        connections.get().postgres
            .query(q)
            .then((res) => {
                resolve(res.rows)
            })
            .catch((e) => {
                reject(e)
            })
    }))

}

let getRtcConfig = () => {
    if (process.env.STUN_SERVER && process.env.STUN_PORT && process.env.TURN_SERVER_URL && process.env.TURN_PORT) {
        return {
            iceServers: [
                {
                    urls: 'stun:' + process.env.STUN_SERVER + ':' + process.env.STUN_PORT
                },
                {
                    urls: 'turn:' + process.env.TURN_SERVER_URL + ':' + process.env.TURN_PORT + '?transport=tcp',
                    credential: process.env.TURN_LOGIN,
                    username: process.env.TURN_PASSWORD
                }
            ]
        }
    } else {
        return {}
    }

}

let getTurnUri = () => {
    return process.env.TURN_LOGIN + ":" + process.env.TURN_PASSWORD + '@' + process.env.TURN_SERVER_IP + ':' + process.env.TURN_PORT + '?transport=tcp'
}

let run_reactor = async (reactor, client, message) => {
    try {
        await reactor(client, message)
    } catch (e) {
        console.log(`Error while handling ${message.type} for ${client.socket.id}: ${e}`)
        sendMessage(client.socket, prepareError(["Server error"]))
    }
}

let disconnectClient = (client) => {
    logMessage(client, JSON.parse(prepareMessage(api.answer_types.DISCONNECTED)), "service_log")

    if (client.room) {
        if (client.role === api.roles.DOCTOR) {
            client.room.sockets.doctor = undefined
        }
        if (client.role === api.roles.PATIENT) {
            client.room.sockets.patient = undefined
        }
    }

    interlocutor_socket = getInterlocutorSocket(client)

    if (interlocutor_socket !== undefined) {
        sendMessage(interlocutor_socket, prepareMessage(api.answer_types.INTERLOCUTOR_DISCONNECTED))
    }
}

module.exports = {
    parseMessage: parseMessage,
    prepareError: prepareError,
    prepareMessage: prepareMessage,
    getError: getError,
    getAnswer: getAnswer,
    handle: handle,
    check: check,
    breakConnection: breakConnection,
    getInterlocutorSocket: getInterlocutorSocket,
    sendConnectedEvents: sendConnectedEvents,
    sendMessage: sendMessage,
    getRtcConfig: getRtcConfig,
    getTurnUri: getTurnUri,
    runReactor: run_reactor,
    logMessage: logMessage,
    disconnectClient: disconnectClient,
    pgQuery: pgQuery,
    markHadConnection: markHadConnection
};

