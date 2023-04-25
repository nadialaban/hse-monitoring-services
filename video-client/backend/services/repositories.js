const {pgQuery} = require("../common/helpers");
const {Room} = require("../models/room");
const api = require('../common/api')


function RoomRepository() {
    this.rooms = []
}

RoomRepository.prototype.load = async function () {
    let rows = await pgQuery('SELECT * FROM rooms WHERE state != $1', [api.room_states.DELETED])

    rows.forEach((desciption) => {
        let room = new Room()
        room.load(desciption)
        this.rooms.push(room)
    })

}

RoomRepository.prototype.add = function (room) {
    this.rooms.push(room)
}

RoomRepository.prototype.get = function (id) {
    let found_room = undefined;

    this.rooms.some((room) => {
        if (room.id === id) {
            found_room = room
            return true
        }
    })

    return found_room
}

RoomRepository.prototype.apply = function (f) {
    this.rooms.forEach((room) => f(room))
}

RoomRepository.prototype.getByAccessKey = function (access_key) {
    let found_room = undefined;

    this.rooms.some((room) => {
        if (room.keys.doctor === access_key || room.keys.patient === access_key) {
            found_room = room
            return true
        }
    })

    return found_room
}

function ClientsRepository() {
    this.clients = new Map()
}

ClientsRepository.prototype.delete = function (id) {
    if (this.clients.has(id)) {
        this.clients.delete(id)
    }
}

ClientsRepository.prototype.add = function (client) {
    this.clients.set(client.id, client)
}

ClientsRepository.prototype.get = function (id) {
    if (this.clients.has(id)) {
        return this.clients.get(id)
    }
    return undefined
}

ClientsRepository.prototype.apply = function (f) {
    this.clients.forEach((client) => f(client))
}

let repositories = {
    rooms: undefined,
    clients: undefined
}

const load = async () => {
    repositories.rooms = new RoomRepository()
    repositories.clients = new ClientsRepository()
    await repositories.rooms.load()
}


module.exports = {
    repositories: repositories,
    load: load
}