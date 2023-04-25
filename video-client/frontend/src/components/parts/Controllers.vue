<template>
    <div>
        <div class="control">
            <button class="btn shadow-none control-btn"
                    @click="changeMicMode">
                <img :src="mic_on ? icons.mic : icons.mic_off">
            </button>
        </div>
        <div class="opt-control">
            <button class="btn shadow-none opt-control-btn"
                    @click="showMediaList('mic')">
                <img :src="icons.options">
            </button>
            <div class="media-list" v-show="show_mic_list">
                <button class="btn btn-block shadow-none media-list-btn"
                        v-for="mic in audio_inputs" @click="changeMic(mic.id)">
                    {{ audio === mic.id ? '&check;  ' : '' }} {{ mic.name }}
                </button>
            </div>
        </div>
        <div class="control">
            <button class="btn shadow-none control-btn"
                    @click="changeCameraMode">
                <img :src="camera_on ? icons.camera : icons.camera_off">
            </button>
        </div>
        <div class="opt-control">
            <button class="btn shadow-none opt-control-btn"
                    @click="showMediaList('camera')">
                <img :src="icons.options">
            </button>
            <div class="media-list" v-show="show_camera_list">
                <button class="btn btn-block shadow-none media-list-btn"
                        v-for="camera in video_inputs" @click="changeCamera(camera.id)">
                    {{ video === camera.id ? '&check;  ' : '' }}{{ camera.name }}
                </button>
            </div>
        </div>

    </div>
</template>

<script>
export default {
    name: "Controllers",
    props: ['white_controls', 'selected'],
    data() {
        return {
            show_mic_list: false,
            show_camera_list: false,
            audio_inputs: [],
            video_inputs: [],
            mic_on: true,
            camera_on: true,
            audio: undefined,
            video: undefined,
        }
    },
    computed: {
        icons() {
            return {
                mic: this.white_controls ? this.images.white_mic : this.images.mic,
                mic_off: this.white_controls ? this.images.white_mic_off : this.images.mic_off,
                camera: this.white_controls ? this.images.white_camera : this.images.camera,
                camera_off: this.white_controls ? this.images.white_camera_off : this.images.camera_off,
                options: this.white_controls ? this.images.white_options : this.images.options
            }
        }
    },
    created() {
        let constraints = {"audio": true, "video": true}

        Event.listen('start-call', (data) => {
            this.audio = data.audioInput
            this.video = data.videoInput
            this.camera_on = data.camera_on
            this.mic_on = data.mic_on
        })


        navigator.mediaDevices.getUserMedia(constraints).then((stream) => {
            stream.getTracks().forEach((track) => track.stop())
            navigator.mediaDevices.enumerateDevices().then(this.gotDevices)
        })

        Event.listen('mic-mode-on', () => this.mic_on = true)
    },
    methods: {
        showMediaList: function (type) {
            if (type === 'mic' && this.show_mic_list) {
                this.show_mic_list = false
            } else if (type === 'camera' && this.show_camera_list) {
                this.show_camera_list = false
            } else {
                if (type === 'mic') {
                    this.show_camera_list = false
                    this.show_mic_list = true
                } else if (type === 'camera') {
                    this.show_mic_list = false
                    this.show_camera_list = true
                }
                let constraints = {"audio": type === 'mic', 'video': type === 'camera'}

                navigator.mediaDevices.getUserMedia(constraints).then((stream) => {
                    stream.getTracks().forEach((track) => track.stop())
                    navigator.mediaDevices.enumerateDevices().then(this.gotDevices)
                })
            }
        },
        gotDevices: function (deviceInfos) {
            this.video_inputs = []
            this.audio_inputs = []
            window.deviceInfos = deviceInfos; // make available to console
            console.log('Available input and output devices:', deviceInfos);
            for (const deviceInfo of deviceInfos) {
                let device = {
                    id: deviceInfo.deviceId
                }
                if (deviceInfo.kind === 'audioinput') {
                    device.name = deviceInfo.label || `Microphone ${this.audio_inputs.length + 1}`;
                    this.audio_inputs.push(device)
                } else if (deviceInfo.kind === 'videoinput') {
                    device.name = deviceInfo.label || `Camera ${this.video_inputs.length + 1}`;
                    this.video_inputs.push(device)
                }
            }
            if (!this.audio_inputs.length) {
                Event.fire('error', 'Не обнаружены микрофоны')
            } else if (!this.audio) {
                this.audio = this.audio_inputs[0].id
                Event.fire('change-media', {audio: this.audio})
            }

            if (!this.video_inputs.length) {
                Event.fire('error', 'Не обнаружены камеры')
            } else if (!this.video) {
                this.video = this.video_inputs[0].id
                Event.fire('change-media', {video: this.video})
            }
        },
        changeCamera: function (id) {
            this.video = id
            this.show_camera_list = false
            Event.fire('change-media', {video: this.video})
        },
        changeMic: function (id) {
            this.audio = id
            this.show_mic_list = false
            Event.fire('change-media', {audio: this.audio})
        },
        changeMicMode: function () {
            this.mic_on = !this.mic_on
            Event.fire('change-mic-mode', this.mic_on)
        },
        changeCameraMode: function () {
            this.camera_on = !this.camera_on
            Event.fire('change-camera-mode', this.camera_on)
        }
    }
}
</script>

<style scoped>
.control {
    width: 46px;
    height: 46px;
    display: inline-block;
}

.control-btn {
    height: 100%;
    position: absolute;
}

.control-btn img {
    height: 30px;
}

.opt-control {
    width: 10px;
    height: 46px;
    display: inline-block;
}

.opt-control-btn {
    height: 100%;
    position: absolute;
    padding: 0;
    margin-top: -13px;
}

.opt-control-btn img {
    width: 10px;
}

.media-list {
    position: absolute;
    bottom: 50px;
    border-radius: 0.5rem;
    background-color: rgba(36, 36, 36, 0.8);
    padding: 5px 0;
}

.media-list-btn {
    white-space: nowrap;
    color: #fcfcfc;
    font-size: x-small;
    display: block;
    min-width: max-content;
    text-align: left;
    padding: 0 10px;
}

.media-list-btn:hover, .media-list-btn:active, .media-list-btn:focus {
    background-color: rgba(252, 252, 252, 0.2);
    color: #fcfcfc;
}
</style>