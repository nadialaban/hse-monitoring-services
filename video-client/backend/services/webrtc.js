const helpers = require('../common/helpers')
const api = require('../common/api')
const {CallMediaPipeline} = require('../models/pipeline')

let pipelines = new Map()


let retranslateMessage = (client, message) => {
    if (process.env.MESSAGE_DEBUG === true) {
        console.log(`Running retranslateMessage for client ${client.id} with role ${client.role}`)
    }

    let interlocutor_socket = helpers.getInterlocutorSocket(client)

    if (!interlocutor_socket) {
        console.log(`No interlocutor found for client ${client.id} with role ${client.role}`)
        return helpers.getError(["Interlocutor is not connected"], api.answer_types.NO_INTERLOCUTOR, {retranslated_id: message.id})
    } else {
        try {
            helpers.sendMessage(interlocutor_socket, helpers.prepareMessage(message.type, message.params))
            helpers.sendMessage(client.socket, helpers.prepareMessage(api.answer_types.RETRANSLATED, {retranslated_id: message.id}))
        } catch (e) {
            helpers.sendMessage(client.socket, helpers.prepareMessage(api.answer_types.NO_INTERLOCUTOR, {retranslated_id: message.id}))
        }
    }
}

let getPipelineForRoom = async (room) => {
    let pipeline = undefined
    if (!pipelines.has(room.id)) {
        pipeline = new CallMediaPipeline();
        pipelines.set(room.id, pipeline)
    } else {
        pipeline = pipelines.get(room.id)
    }

    if (!pipeline.pipeline) {
        await pipeline.createPipeline(room)
    }

    return pipeline
}

let consumeSDP = async (client, message) => {
    if (!client.room) {
        throw "client is not in room"
    }

    client.room.activate()
    client.room.save()


    if (client.room.mode === api.room_modes.P2P) {
        retranslateMessage(client, message)
    }

    if (client.room.mode === api.room_modes.KURENTO) {
        let pipeline = await getPipelineForRoom(client.room)

        if (pipeline) {

            let answer = {
                "type": "answer",
                "sdp": await pipeline.generateSdpAnswer(client.socket, client.room, message.params)
            }
            if (process.env.MESSAGE_DEBUG === true) {
                console.log("Got SDP answer from kurento", answer)
            }
            helpers.sendMessage(client.socket, helpers.prepareMessage(api.query_types.SDP, answer))
        }

    }
}

let consumeICE = async (client, message) => {
    if (!client.room) {
        throw "client is not in room"
    }

    if (client.room.mode === api.room_modes.P2P) {
        retranslateMessage(client, message)
    }

    if (client.room.mode === api.room_modes.KURENTO) {
        let pipeline = await getPipelineForRoom(client.room)
        if (pipeline) {
            pipeline.pullIce(client.socket, client.room, message.params)
        }
    }


}

let releaseRoom = async (room) => {
    if (room.mode === api.room_modes.KURENTO) {
        if (pipelines.has(room.id)) {
            let pipeline = pipelines.get(room.id)
            if (pipeline) {
                console.log(`releasing pipeline for room ${room.id}`)
                pipeline.release()
            }
            pipelines.delete(room.id)
        }
    }
}


let validateIce = (params) => {
    if (params.candidate === undefined) {
        throw "ICE params should have candidate"
    }
    if (params.candidate !== null) {
        if (params.sdpMid === undefined || params.sdpMLineIndex === undefined) {
            throw "ICE params should have sdpMid and sdpMLineIndex or be null"
        }
    }
}

let validateSdp = (params) => {
    if (params.type === undefined) {
        throw "SDP params should have type"
    }
    if (!params.sdp) {
        throw "SDP params should have sdp"
    }
    if (params.type !== "answer" && params.type !== "offer") {
        throw "SDP params should be answer or offer"
    }
}

let newIceState = (client, message) => {
    Object.values(api.states).forEach((value) => {
        if (message.params.state === value) {
            client.state = value
            helpers.sendMessage(client.socket, helpers.prepareMessage(api.answer_types.STATE_CHANGED), "outcoming")
        }
    })

    if (client.room) {
        client.room.ping()
        client.room.save()
    }
}


module.exports = {
    retranslateMessage: retranslateMessage,
    consumeSDP: consumeSDP,
    consumeICE: consumeICE,
    releaseRoom: releaseRoom,
    newIceState: newIceState,
    validators: {
        ice: validateIce,
        sdp: validateSdp
    }
};