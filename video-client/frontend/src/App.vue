<template>
    <div id="app">
        <loading v-if="state === 'loading'"/>
        <call-settings v-if="state === 'settings'"/>
        <auth v-if="state === 'auth'"/>
        <call v-show="state === 'call'" :data="data"/>
        <load-error v-if="state === 'error'" :error="data.error" :description="data.description"/>
        <action-done v-if="state === 'done'"/>
    </div>
</template>

<script>
import Loading from "./components/parts/Loading.vue";
import Auth from "./components/Auth.vue";
import SocketioService from './services/socketio.service.js';
import CallSettings from "./components/CallSettings.vue";
import Call from "./components/Call.vue";
import LoadError from "./components/LoadError.vue";
import ActionDone from "./components/ActionDone.vue";

export default {
    name: 'app',
    components: {ActionDone, LoadError, Call, CallSettings, Auth, Loading},
    data() {
        return {
            state: 'loading',
            data: {
                room: undefined,
                role: undefined,
                rtc_config: undefined
            }
        }
    },
    created() {
        console.log(process.env)
        SocketioService.setupSocketConnection(process.env.VUE_APP_SERVER_URL);
        this.state = 'settings'

        Event.listen('emit-message', (data) => {
            SocketioService.message(data.type, data.params)
        })
        Event.listen('start-call', (data) => {
            if (!this.access_key) {
                this.state = 'auth'
            } else {
                SocketioService.message('AUTH', {access_key: this.access_key, user_agent: window.navigator.userAgent})
            }
        })
        Event.listen('end-call', () => {
            SocketioService.disconnect();
            this.state = 'done'
        })

        SocketioService.socket.on('message', (message) => {
            console.log('Message from server: ', message)
            message = JSON.parse(message)

            if (message.type === "AUTH_FAILED") {
                if (window.ACCESS_KEY) {
                    this.data.error = 'Ошибка подключения'
                    this.data.description = ''
                    this.state = 'error'
                } else {
                    Event.fire('auth-failed')
                }
            }

            if (message.type === "ROOM_CLOSED") {
                this.data.error = 'Конференция завершена'
                this.data.description = ''
                this.state = 'error'
            }

            if (message.type === "AUTH_SUCCESS") {
                Event.fire('auth-success')
                this.data.role = message.params.role
                this.data.room = message.params.room
                this.state = 'call'
            }

            if (message.type === "ICE") {
                Event.fire('on-ice-candidate', message.params)
            }

            if (message.type === "SDP") {
                if (message.params.type === "answer") {
                    Event.fire('on-remote-answer', message.params)
                } else {
                    Event.fire('on-remote-offer', message.params)
                }
            }

            if (message.type === "INTERLOCUTOR_CONNECTED") {
                console.log("data is", this.data)
                Event.fire('prepare-for-call', this.data.room.rtc_config)
            }

            if (["MIC_ENABLED", "MIC_DISABLED", "CAMERA_ENABLED", "CAMERA_DISABLED"].includes(message.type)) {
                Event.fire('change-interlocutor-settings', message.type)
            }

            if (message.type === "INTERLOCUTOR_DISCONNECTED" || message.type === "BREAK_BY_NEW_CONNECTION") {
                Event.fire('hangup')
            }

        })
    },
    beforeUnmount() {
        SocketioService.disconnect();
    },
    methods: {}
}
</script>

<style>
.content-container {
    justify-content: center;
    align-items: center;
    position: absolute;
    left: 50%;
    top: 50%;
    transform: translate(-50%, -50%);
}

.video-container {
    border-radius: 20px;
    background-color: black;
    justify-content: center;
    display: -ms-flexbox;
    display: flex;
    position: relative;
}

.display-video {
    width: 100%;
    height: 100%;
    margin: 0 auto;
    border-radius: 20px;
    background-color: rgba(0, 0, 0, 0.9);
}

video {
    object-fit: contain;
    height: 100%;
    width: 100%;
}

.avatar {
    position: absolute;
    height: 50%;
}
</style>
