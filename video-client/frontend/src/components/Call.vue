<template>
    <div>
        <div class="videoContainer remoteVideoContainer" :style="`height: ${rv_height}px;`">
            <video id="remoteVideo" ref="remoteVideo" playsinline autoplay
                   @loadedmetadata="remoteLoadMetaData"
                   @resize="remoteVideoResize" v-show="interlocutor_settings.video_mode"></video>
            <img :src="images.avatar" class="content-container" :style="mobile ? 'width: 60%; height: auto;' : ''"
                 v-if="connected && !interlocutor_settings.video_mode">
            <h5 class="content-container" style="color: #fcfcfc" v-if="!connected">Ожидаем подключения
                {{ data.role === 'DOCTOR' ? 'пациента' : 'врача' }}</h5>
            <div class="userLabel" v-if="connected">
                <img :src="interlocutor_settings.audio_mode ? images.white_mic : images.white_mic_off"
                     style="height: 20px; margin-left: 5px;">
                <span style="color: #fcfcfc; margin-left: 10px; vertical-align: middle">{{
                        data.role === 'DOCTOR' ? 'Пациент' : 'Врач'
                    }}</span>
            </div>
            <div class="videoContainer localVideoContainer">
                <video id="localVideo" ref="localVideo" class="display-video" playsinline autoplay muted
                       @loadedmetadata="localLoadMetaData"></video>
                <img :src="images.avatar" class="content-container avatar" v-if="!camera_on">
            </div>
        </div>
        <div class="settings">
            <controllers/>
            <div style="bottom: 5px; right: 10px; position: absolute">
                <button class="btn btn-danger" style="height: 40px;" @click="hangup">Завершить</button>
            </div>
        </div>
    </div>
</template>

<script>

import Controllers from "./parts/Controllers.vue";

export default {
    name: "Call",
    components: {Controllers},
    props: ['data'],
    data() {
        return {
            connected: false,
            started: false,

            localVideo: undefined,
            remoteVideo: undefined,

            startTime: undefined,
            localStream: undefined,
            peerConnection: undefined,
            incoming_ice_queue: [],
            outcoming_ice_queue: [],
            description_set: false,
            offerOptions: {
                offerToReceiveAudio: true,
                offerToReceiveVideo: true
            },

            audioSource: undefined,
            videoSource: undefined,

            mic_on: true,
            camera_on: true,
            interlocutor_settings: {
                video_mode: true,
                audio_mode: true
            }
        }
    },
    computed: {
        rv_height() {
            return window.innerHeight - 50
        }
    },
    created() {
        Event.listen('start-call', (data) => {
            this.audioSource = data.audioInput
            this.videoSource = data.videoInput
            this.camera_on = data.camera_on
            this.mic_on = data.mic_on
            this.started = true
        })

        Event.listen('change-media', (data) => {
            if (this.started) this.changeMedia(data)
        })
        Event.listen('change-mic-mode', (mode) => {
            if (this.started) this.changeMicMode(mode)
        })
        Event.listen('change-camera-mode', (mode) => {
            if (this.started) this.changeCameraMode(mode)
        })

        Event.listen('auth-success', () => {
            this.prepareForStream()
        })
        Event.listen('on-ice-candidate', (params) => {
            if (this.description_set) {
                this.onIceCandidate(params)
            } else {
                this.incoming_ice_queue.push(params)
            }
        })
        Event.listen('on-remote-answer', (params) => {
            this.onRemoteAnswer(params)
        })
        Event.listen('on-remote-offer', (params) => {
            this.onRemoteOffer(params)
        })
        Event.listen('prepare-for-call', (rtc_config) => {
            this.prepareForCall(rtc_config)
        })
        Event.listen('change-interlocutor-settings', action => {
            if (action === "MIC_ENABLED") this.interlocutor_settings.audio_mode = true
            else if (action === "MIC_DISABLED") this.interlocutor_settings.audio_mode = false
            else if (action === "CAMERA_ENABLED") this.interlocutor_settings.video_mode = true
            else if (action === "CAMERA_DISABLED") this.interlocutor_settings.video_mode = false
        })
        Event.listen('hangup', () => {
            this.disconnect()
        })

    },
    methods: {
        localLoadMetaData: function () {
            console.log(`Local video videoWidth: ${this.localVideo.videoWidth}px,  videoHeight: ${this.localVideo.videoHeight}px`);
        },
        remoteLoadMetaData: function () {
            console.log(`Remote video videoWidth: ${this.remoteVideo.videoWidth}px,  videoHeight: ${this.remoteVideo.videoHeight}px`);
        },
        remoteVideoResize: function () {
            console.log(`Remote video size changed to ${this.remoteVideo.videoWidth}x${this.remoteVideo.videoHeight} - Time since pageload ${performance.now().toFixed(0)}ms`);
            // We'll use the first onsize callback as an indication that video has started
            // playing out.
            if (this.startTime) {
                const elapsedTime = window.performance.now() - this.startTime;
                console.log('Setup time: ' + elapsedTime.toFixed(3) + 'ms');
                this.startTime = null;
            }
        },
        prepareForStream: async function () {
            console.log("preparing for stream")
            this.localVideo = this.$refs.localVideo
            this.remoteVideo = this.$refs.remoteVideo

            try {
                const constraints = {
                    audio: {deviceId: this.audioSource ? {exact: this.audioSource} : undefined},
                    video: {
                        width: {ideal: 1280},
                        height: {ideal: 720},
                        deviceId: this.videoSource ? {exact: this.videoSource} : undefined
                    }
                };

                const stream = await navigator.mediaDevices.getUserMedia(constraints);
                console.log('Received local stream');
                this.localVideo.srcObject = stream;
                this.localStream = stream;
            } catch (e) {
                console.log(e)
                alert(`getUserMedia() e: ${e.name}`);
            }
        },
        prepareForCall: async function (rtc_config) {
            console.log("Running prepareForCall with params:", rtc_config)
            // ждем пока выберут камеру и микрофон
            if (!this.localStream) {
                setTimeout(() => this.prepareForCall(rtc_config), 50);
                return;
            }
            console.log('Starting call');

            const videoTracks = this.localStream.getVideoTracks();
            const audioTracks = this.localStream.getAudioTracks();

            Event.fire('emit-message', {
                type: this.camera_on ? 'CAMERA_ENABLED' : 'CAMERA_DISABLED',
                params: {}
            })

            Event.fire('emit-message', {
                type: this.mic_on ? 'MIC_ENABLED' : 'MIC_DISABLED',
                params: {}
            })

            if (videoTracks.length > 0) {
                console.log(`Using video device: ${videoTracks[0].label}`);
            }
            if (audioTracks.length > 0) {
                console.log(`Using audio device: ${audioTracks[0].label}`);
            }
            const configuration = rtc_config;
            console.log('RTCPeerConnection configuration:', configuration);

            this.peer_connection = new RTCPeerConnection(configuration);
            this.peer_connection.onicecandidate = e => {
                try {
                    var type = e.candidate.candidate.split(" ")[7];
                    if (!configuration && type !== "relay") {
                        console.log("ICE  -  Created " + type + " candidate ignored: TURN only mode.", e.candidate);
                        return;
                    }
                } catch (e) {
                    console.log("error filtering relay candidates", e)
                }

                console.log("got ice", e)

                let packet = {
                    candidate: null
                }

                if (e.candidate) {
                    packet.candidate = e.candidate.candidate;
                    packet.sdpMid = e.candidate.sdpMid;
                    packet.sdpMLineIndex = e.candidate.sdpMLineIndex;
                }

                if (this.description_set) {
                    Event.fire('emit-message', {
                        type: 'ICE',
                        params: packet
                    })
                } else {
                    console.log("pushing candidate ice to queue")
                    this.outcoming_ice_queue.push({
                        type: 'ICE',
                        params: packet
                    })
                }
            }
            this.peer_connection.oniceconnectionstatechange = e => this.onIceStateChange(this.peer_connection);
            this.peer_connection.ontrack = this.gotRemoteStream

            this.onIceStateChange(this.peer_connection)

            this.localStream.getTracks().forEach(track => {
                this.peer_connection.addTrack(track, this.localStream)
                console.log('Added track to peer connection', track);
            });

            if (this.data.room.mode !== "P2P" || this.data.role === "DOCTOR") {
                await this.createOffer()
            }
        },
        createOffer: async function () {
            try {
                console.log('createOffer start');
                const offer = await this.peer_connection.createOffer(this.offerOptions);

                console.log('setLocalDescription start');

                try {
                    Event.fire('emit-message', {
                        type: 'SDP',
                        params: offer
                    })
                    await this.peer_connection.setLocalDescription(offer);
                    console.log(`setLocalDescription complete`, offer.sdp);
                } catch (e) {
                    console.log(`setLocalDescription error`, e);
                }
            } catch (e) {
                console.log(`Failed to set session description: ${e.toString()}`);
            }
        },
        onRemoteOffer: async function (offer) {
            console.log("got remote offer")
            try {
                await this.peer_connection.setRemoteDescription(offer);
                console.log(`setRemoteDescription complete`, offer.sdp);

                console.log('interlocutor_peer_connection createAnswer start');
                try {
                    const answer = await this.peer_connection.createAnswer();
                    console.log("answer is ", answer.sdp)
                    Event.fire('emit-message', {
                        type: 'SDP',
                        params: answer
                    })
                    await this.peer_connection.setLocalDescription(answer)
                } catch (e) {
                    console.log(`Failed to create session offerription: ${e.toString()}`);
                }

            } catch (e) {
                console.log(`Failed to set remote offerription: ${e.toString()}`);
            }
        },
        onRemoteAnswer: async function (answer) {
            console.log("got remote answer")
            try {
                await this.peer_connection.setRemoteDescription(answer);
                this.description_set = true
                this.outcoming_ice_queue.forEach((message) => {
                    Event.fire('emit-message', message)
                })
                this.outcoming_ice_queue = []
                this.incoming_ice_queue.forEach(event => this.onIceCandidate(event))
                this.incoming_ice_queue = []
                console.log("set remote description success")
            } catch (e) {
                console.log(`Failed to set remote description: ${e.toString()}`);
            }
        },
        gotRemoteStream: function (e) {
            try {
                console.log(e)
                if (this.remoteVideo.srcObject !== e.streams[0]) {
                    this.remoteVideo.srcObject = e.streams[0];
                    this.connected = true
                    console.log('received remote stream');
                }
            } catch (error) {
                console.log("add stream error", error)
            }
        },
        onIceCandidate: async function (event) {
            try {
                console.log(event)
                if (event.candidate) {
                    await this.peer_connection.addIceCandidate(event);
                    console.log(`addIceCandidate success`, event);
                } else {
                    await this.peer_connection.addIceCandidate(null);
                    console.log(`addIceCandidate success`, null);
                }

            } catch (e) {
                console.log(`failed to add ICE Candidate: ${e.toString()}`);
            }
        },
        onIceStateChange: function (pc) {
            if (pc) {
                Event.fire('emit-message', {
                    type: 'ICE_STATE',
                    params: {
                        state: pc.iceConnectionState
                    }
                })
            }
        },

        changeMedia: async function (data) {
            if (!data.audio && !data.video) return
            try {
                const constraints = {}
                if (data.video)
                    this.videoSource = data.video
                if (data.audio)
                    this.audioSource = data.audio

                constraints.video = {
                    width: {ideal: 1280},
                    height: {ideal: 720},
                    deviceId: {exact: this.videoSource}
                }
                constraints.audio = {exact: this.audioSource}

                const stream = await navigator.mediaDevices.getUserMedia(constraints);
                console.log('Received local stream');

                this.localVideo.srcObject = stream;
                this.localStream = stream;

                let audioTrack = this.localStream.getAudioTracks()[0];
                let videoTrack = this.localStream.getVideoTracks()[0];

                audioTrack.enabled = this.mic_on
                videoTrack.enabled = this.camera_on

                if (this.peer_connection) {
                    const audioSender = this.peer_connection.getSenders().find(e => e.track.kind === 'audio');
                    await audioSender.replaceTrack(audioTrack);

                    const videoSender = this.peer_connection.getSenders().find(e => e.track.kind === 'video');
                    await videoSender.replaceTrack(videoTrack);
                }

            } catch (e) {
                console.log(e)
                alert(`getUserMedia() e: ${e.name}`);
            }
        },
        changeMicMode: function (mode) {
            this.mic_on = mode
            this.localStream.getAudioTracks()[0].enabled = this.mic_on
            Event.fire('emit-message', {
                type: this.mic_on ? 'MIC_ENABLED' : 'MIC_DISABLED',
                params: {}
            })
        },
        changeCameraMode: function (mode) {
            this.camera_on = mode
            this.localStream.getVideoTracks()[0].enabled = this.camera_on
            Event.fire('emit-message', {
                type: this.camera_on ? 'CAMERA_ENABLED' : 'CAMERA_DISABLED',
                params: {}
            })
        },
        disconnect: async function () {
            if (this.peer_connection) {
                console.log("Closing connection")
                this.connected = false
                this.peer_connection.close();
                this.peer_connection = null;
                this.interlocutor_settings.video_mode = true
                this.interlocutor_settings.audio_mode = true
            }
        },
        hangup: async function () {
            if (this.localStream) {
                console.log("Stopping stream")
                this.localStream.getTracks().forEach(track => track.stop());
                this.localStream = null;
                Event.fire('end-call')
            }
        }
    }
}
</script>

<style scoped>
.remoteVideoContainer {
    position: absolute;
    top: 0;
    bottom: 0;
    width: 100%;
    overflow: hidden;
}

.localVideoContainer {
    border-radius: 20px;
    box-shadow: 0 0 15px 3px rgba(36, 36, 36, 0.8);
    position: absolute;
    right: 10px;
    bottom: 15px;
    height: 25%;
    width: 25%;
}

.videoContainer {
    background-color: black;
}

.remoteVideoContainer video {
    width: 100%;
    height: 100%;
}

.videoContainer .userLabel {
    background-color: rgba(36, 36, 36, 0.8);
    position: absolute;
    bottom: 15px;
    left: 10px;
    width: 120px;
    height: 30px;
    border-radius: 5px;
    color: #fcfcfc;
}


#remoteVideo {
    background-color: black;
}


.settings {
    position: fixed;
    left: 0;
    bottom: 0;
    height: 50px;
    width: 100%;
    background-color: rgba(252, 252, 252);
}
</style>
