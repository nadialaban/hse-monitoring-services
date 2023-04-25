const helpers = require('../common/helpers')
const api = require('../common/api')
const {repositories} = require('../services/repositories')

let makeAuth = (client, message) => {
    console.log(`Running makeAuth for client ${client.id}`)

    let access_key = message.params.access_key

    let room = repositories.rooms.getByAccessKey(access_key)

    if (room) {
        if (room.state === api.room_states.CLOSED) {
            helpers.sendMessage(client.socket, helpers.prepareMessage(api.answer_types.ROOM_CLOSED))
        } else {
            console.log(`Auth success for client ${client.id}`)

            room.ping()
            room.save()

            if (room.keys.doctor === access_key) {
                client.role = api.roles.DOCTOR

                if (room.sockets.doctor) {
                    helpers.breakConnection(room.sockets.doctor, api.answer_types.BREAK_BY_NEW_CONNECTION)

                    if (room.sockets.patient) {
                        helpers.sendMessage(room.sockets.patient, helpers.prepareMessage(api.answer_types.INTERLOCUTOR_DISCONNECTED))
                    }
                }
                room.sockets.doctor = client.socket
            }

            if (room.keys.patient === access_key) {
                client.role = api.roles.PATIENT

                if (room.sockets.patient) {
                    helpers.breakConnection(room.sockets.patient, api.answer_types.BREAK_BY_NEW_CONNECTION)

                    if (room.sockets.doctor) {
                        helpers.sendMessage(room.sockets.doctor, helpers.prepareMessage(api.answer_types.INTERLOCUTOR_DISCONNECTED))
                    }
                }
                room.sockets.patient = client.socket
            }

            client.state = api.states.DONE_AUTH
            client.room = room


            helpers.sendMessage(client.socket, helpers.prepareMessage(api.answer_types.AUTH_SUCCESS, {
                role: client.role,
                room: {
                    id: client.room.id,
                    mode: client.room.mode,
                    recording_enabled: client.room.recording_enabled,
                    rtc_config: helpers.getRtcConfig()
                }
            }))

            let interlocutor = helpers.getInterlocutorSocket(client)
            if (interlocutor) {
                helpers.sendConnectedEvents(client.room)
                helpers.markHadConnection(client.room)
            }
        }
    } else {
        console.log(`Auth failed for client ${client.id}`)
        helpers.sendMessage(client.socket, helpers.prepareError(["Room for key not found"], api.answer_types.AUTH_FAILED))
    }
}

let authValidator = (params) => {
    if (!params.access_key) {
        throw "No access key in params"
    }
}

let onlyDoctor = (client) => {
    if (client.role !== api.roles.DOCTOR) {
        throw "Need to be doctor to close room"
    }
}

module.exports = {
    makeAuth: makeAuth,
    validators: {
        auth: authValidator,
        onlyDoctor: onlyDoctor
    }
};