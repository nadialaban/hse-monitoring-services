
const api = require("../common/api");
const webrtc = require("../services/webrtc");
const remote_storage = require("../services/remote_storage");
const helpers = require('../common/helpers')
const {pgQuery} = require("../common/helpers");

function Room() {
    this.id = undefined
    this.keys = {
        doctor: undefined,
        patient: undefined
    }
    this.sockets = {
        doctor: undefined,
        patient: undefined
    }
    this.mode = undefined
    this.recording_enabled = undefined
    this.state = undefined
    this.last_activity = undefined
    this.is_uploaded_to_s3 = false
}

Room.prototype.close = function () {

    if (this.sockets.doctor) {
        helpers.sendMessage(this.sockets.doctor, helpers.prepareMessage(api.answer_types.ROOM_CLOSED))
    }

    if (this.sockets.patient) {
        helpers.sendMessage(this.sockets.patient, helpers.prepareMessage(api.answer_types.ROOM_CLOSED))
    }

    webrtc.releaseRoom(this)

    this.state = api.room_states.CLOSED
    console.log("Room", this.id, "is closed")
}

Room.prototype.delete = function () {
    this.state = api.room_states.DELETED
}

Room.prototype.upload = async function () {
    let local_dir = process.env.LOCAL_RECORDS_DIRECTORY + '/room_' + this.id
    let remote_dir = '/videos/room_' + this.id
    await remote_storage.store(local_dir, remote_dir)

    this.is_uploaded_to_s3 = true
}

Room.prototype.ping = function () {
    console.log("pinging room with id ", this.id)
    this.last_activity = Date.now()
}

Room.prototype.activate = function () {
    this.state = api.room_states.ACTIVE
}

Room.prototype.save = async function () {
    if (!this.id) {
        let result = await pgQuery('INSERT INTO rooms (doctor_key, patient_key, mode, recording_enabled, state, last_activity, is_uploaded_to_s3) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id',
            [this.keys.doctor, this.keys.patient, this.mode, this.recording_enabled, this.state, this.last_activity, this.is_uploaded_to_s3])

        this.id = result[0][0]
    } else {
        pgQuery('UPDATE rooms SET doctor_key = $1, patient_key = $2, mode = $3, recording_enabled = $4, state = $5, last_activity = $6, is_uploaded_to_s3 = $7 WHERE id = $8',
            [this.keys.doctor, this.keys.patient, this.mode, this.recording_enabled, this.state, this.last_activity, this.is_uploaded_to_s3, this.id])
    }

}

Room.prototype.load = function (description) {
    this.id = description[0]
    this.keys.doctor = description[1]
    this.keys.patient = description[2]
    this.mode = description[3]
    this.recording_enabled = description[4]
    this.state = description[5]
    this.last_activity = description[6]
    this.is_uploaded_to_s3 = description[7]
    this.had_connection = description[8]
}

module.exports = {
    Room: Room
}