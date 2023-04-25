const factories = require('./factories')
const {repositories} = require('./repositories')

let roomCreator = async (req, res) => {
    if (req.headers.auth !== process.env.ADMIN_KEY) {
        return res.status(403).send({message: "Invalid Auth header"})
    }

    let room = await factories.room()
    repositories.rooms.add(room)

    return res.status(200).send(
        {
            id: room.id,
            keys: room.keys
        }
    )
}

let roomDeleter = (req, res) => {
    if (req.headers.auth !== process.env.ADMIN_KEY) {
        return res.status(403).send({message: "Invalid Auth header"})
    }

    let id = req.params.id;

    if (!id) {
        return res.status(422).send({message: "No id in params"})
    }

    try {
        id = parseInt(id)
    }
    catch (e) {
        return res.status(422).send({message: "Id should be number"})
    }

    let room = repositories.rooms.get(id)

    if (!room) {
        return res.status(404).send({message: "Room not found"})
    }

    room.close()
    room.save()

    return res.status(200).send(
        {
            message: "room closed"
        }
    )
}

let roomInformer = (req, res) => {
    if (req.headers.auth !== process.env.ADMIN_KEY) {
        return res.status(403).send({message: "Invalid Auth header"})
    }

    let id = req.params.id;

    if (!id) {
        return res.status(422).send({message: "No id in params"})
    }

    try {
        id = parseInt(id)
    }
    catch (e) {
        return res.status(422).send({message: "Id should be number"})
    }

    let room = repositories.rooms.get(id)
    if (!room) {
        return res.status(404).send({message: "Room not found"})
    }

    return res.status(200).send(
        {
            message: {
                state: room.state,
                last_activity: room.last_activity,
                had_connection: room.had_connection,
            }
        }
    )
}

module.exports = {
    roomCreator: roomCreator,
    roomDeleter: roomDeleter,
    roomInformer: roomInformer
}
