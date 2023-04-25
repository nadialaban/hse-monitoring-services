const api = require("../common/api");
const helpers = require("../common/helpers");
const {repositories} = require('../services/repositories')
const remote_storage = require("./remote_storage");

let closeRoomForClient = (client, message) => {
    if (client.role !== api.roles.DOCTOR) {
        helpers.sendMessage(client.socket, helpers.prepareError(["You need to be doctor to close room"]))
        return
    }

    if (client.room) {
        client.room.close()
    }
}

let pingActiveRooms = () => {
    console.log("Pinging active rooms")
    repositories.clients.apply((client) => {
        if (client.room) {
            client.room.ping()
            client.room.save()
        }
    })
}

let closeInactiveRooms = () => {
    console.log("Closing inactive rooms")
    repositories.rooms.apply((room) => {
        if (room.state === api.room_states.ACTIVE) {
            if ((Date.now() - room.last_activity) / 1000 > 60 * 60) {
                room.close()
                room.save()
            }
        }
        else if (room.state === api.room_states.OPENED) {
            if ((Date.now() - room.last_activity) / 1000 > 60 * 60 * 48) {
                room.close()
                room.save()
            }
        }
        else if (room.state === api.room_states.CLOSED) {
            if ((Date.now() - room.last_activity) / 1000 > 60 * 60 * 96) {
                room.delete()
                room.save()
            }
        }
    })
}

let uploadClosedRooms = () => {
    repositories.rooms.apply(async (room) => {
        if (room.state === api.room_states.CLOSED && room.recording_enabled && !room.is_uploaded_to_s3) {
            console.log("start uploading")
            await room.upload()
            room.save()
            console.log("upload done")
        }
    })
}

module.exports = {
    closeRoomForClient: closeRoomForClient,
    pingActiveRooms: pingActiveRooms,
    closeInactiveRooms: closeInactiveRooms,
    uploadClosedRooms: uploadClosedRooms
}
