import { io } from 'socket.io-client';
import * as uuid from "uuid";

class SocketioService {
    socket;
    constructor() {
    }

    setupSocketConnection(url) {
        this.socket = io('/');
    }

    message (type, params) {
        console.log('Message to server: ', type, params)
        this.socket.emit('message', JSON.stringify({type: type, params: params, id: uuid.v4(), timestamp: Date.now()}))
    }

    disconnect() {
        if (this.socket) this.socket.disconnect()
    }
}

export default new SocketioService();
