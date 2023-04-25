let states = {
    NEED_AUTH: "need_auth",
    DONE_AUTH: "done_auth",
    STARTING: "starting",
    CHECKING: "checking",
    CONNECTED: "connected",
    COMPLETED: "completed",
    FAILED: "failed",
    DISCONNECTED: "disconnected",
    CLOSED: "closed"
}

let query_types = {
    AUTH: "AUTH",
    ICE: "ICE",
    ICE_STATE: "ICE_STATE",
    SDP: "SDP",
    CLOSE_ROOM: "CLOSE_ROOM",
    CAMERA_ENABLED: "CAMERA_ENABLED",
    CAMERA_DISABLED: "CAMERA_DISABLED",
    MIC_ENABLED: "MIC_ENABLED",
    MIC_DISABLED: "MIC_DISABLED"
}

let roles = {
    DOCTOR: "DOCTOR",
    PATIENT: "PATIENT"
}

let room_modes = {
    P2P: "P2P",
    KURENTO: "KURENTO",
}

let room_states = {
    OPENED: "OPENED",
    ACTIVE: "ACTIVE",
    CLOSED: "CLOSED",
    DELETED: "DELETED"
}

let answer_types = {
    AUTH_SUCCESS: "AUTH_SUCCESS",
    AUTH_FAILED: "AUTH_FAILED",
    NO_INTERLOCUTOR: "NO_INTERLOCUTOR",
    RETRANSLATED: "RETRANSLATED",
    INTERLOCUTOR_CONNECTED: "INTERLOCUTOR_CONNECTED",
    INTERLOCUTOR_DISCONNECTED: "INTERLOCUTOR_DISCONNECTED",
    ERROR: "ERROR",
    BREAK_BY_NEW_CONNECTION: "BREAK_BY_NEW_CONNECTION",
    ROOM_CLOSED: "ROOM_CLOSED",
    STATE_CHANGED: "STATE_CHANGED",
    DISCONNECTED: "DISCONNECTED"
}

module.exports = {
    states: states,
    query_types: query_types,
    answer_types: answer_types,
    roles: roles,
    room_modes: room_modes,
    room_states: room_states
};

