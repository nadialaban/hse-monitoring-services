<template>
    <div class="container">
        <div class="content-container" :style="`width: ${mobile ? 80 : 60}%`">
            <h4 class="text-center">Подключиться к звонку</h4>
            <div class="video-container" :style="`margin-bottom: 10px; ${mobile ? video_height : ''}`">
                <img class="avatar" :src="images.avatar" style="top: 25%;" v-if="!camera_on">
                <video id="preview" ref="preview" class="display-video" playsinline autoplay muted
                       @loadedmetadata="localLoadMetaData"></video>
                <error-block :errors="errors"/>
                <div class="media-preview-control">
                    <controllers :white_controls="true"/>
                </div>
            </div>
            <div class="row" style="margin: auto; padding-bottom: 20px;">
                <button class="btn btn-default col-4" style="margin-right: 5px" @click="testMic">
                    {{ isListening ? 'Остановить проверку' : 'Проверить микрофон' }}
                </button>
                <div class="col" style="background-color: #f1f1f1; border-radius: 0.5rem; width: 100%;">
                    <div :style="mic_test"></div>
                </div>
            </div>
            <div style="margin: auto; width: 60%;">
                <button class="btn btn-block btn-primary btn-lg" @click="select()"
                        :disabled="!!errors.length">Подключиться
                </button>
            </div>
        </div>
    </div>
</template>

<script>
import ErrorBlock from "./parts/ErrorBlock.vue";
import Controllers from "./parts/Controllers.vue";

export default {
    name: "CallSettings",
    components: {Controllers, ErrorBlock},
    props: [],
    data() {
        return {
            stream: undefined,
            preview: undefined,
            isListening: false,
            decibels: 0,
            errors: [],
            audio: undefined,
            video: undefined,
            camera_on: true,
            mic_on: true
        }
    },
    computed: {
        mic_test() {
            return `background: #24a8b4;
                    width: ${this.decibels / 2}%;
                    height: 100%;
                    border-radius: 0.5rem;
                    bottom: 0;
                    left: 0;
                    display: inline-flex;
                    transition: width 0.15s;`
        },
        video_height() {
            return `height: ${window.innerHeight * 0.7}px;`
        }
    },
    mounted() {
        Event.listen('error', err => {
            if (!this.errors.includes(err)) this.errors.push(err)
        })
        Event.listen('set-decibels', d => this.decibels = d)
        Event.listen('change-media', data => this.changeMedia(data))
        Event.listen('change-mic-mode', mode => {
            this.mic_on = mode
            if (!mode) {
                this.decibels = 0
                this.isListening = false;
                Event.fire('stop-testing')
            }
        })
        Event.listen('change-camera-mode', mode => this.changeCameraMode(mode))
    },
    methods: {
        localLoadMetaData: function () {
            console.log(`Local video videoWidth: ${this.preview.videoWidth}px,  videoHeight: ${this.preview.videoHeight}px`);
        },
        changeMedia: async function (data) {
            if (!this.preview) this.preview = this.$refs.preview

            if (!data.audio && !data.video) return
            try {
                if (data.video) {
                    this.video = data.video
                }
                if (data.audio) {
                    this.audio = data.audio
                }
                const constraints = {
                    video: {
                        width: {ideal: 1280},
                        height: {ideal: 720},
                        deviceId: {exact: this.video}
                    },
                    audio: {
                        deviceId: {exact: this.audio}
                    }
                }

                if (this.stream) {
                    this.stream.getAudioTracks().forEach((track) => track.stop())
                }

                this.stream = await navigator.mediaDevices.getUserMedia(constraints);

                console.log('Received local stream');
                this.preview.srcObject = this.stream;
                this.stream.getAudioTracks()[0].enabled = this.mic_on

                if (data.audio) {
                    if (this.isListening) {
                        this.isListening = false
                        await this.testMic()
                    }
                }
            } catch (e) {
                console.log(e)
                alert(`getUserMedia() e: ${e.name}`);
            }
        },
        select: function () {
            this.stream.getTracks().forEach((track) => track.stop())
            Event.fire('start-call', {
                audioInput: this.audio,
                videoInput: this.video,
                mic_on: this.mic_on,
                camera_on: this.camera_on
            })
        },
        changeCameraMode: function (mode) {
            this.camera_on = mode
            this.stream.getVideoTracks()[0].enabled = this.camera_on
        },
        testMic: async function () {
            if (!this.isListening) {
                this.mic_on = true
                this.stream.getAudioTracks()[0].enabled = this.mic_on
                console.log('tracks', this.stream.getAudioTracks())
                Event.fire('mic-mode-on')

                this.isListening = true

                let audioCtx = new (window.AudioContext || window.webkitAudioContext)();

                let distortion = audioCtx.createWaveShaper();
                let gainNode = audioCtx.createGain();
                let biquadFilter = audioCtx.createBiquadFilter();
                let analyser = audioCtx.createAnalyser();
                analyser.minDecibels = -90;
                analyser.maxDecibels = -10;

                analyser.fftSize = 256;

                try {
                    let source = audioCtx.createMediaStreamSource(this.stream);
                    console.log('source', source)
                    source.connect(distortion);
                    distortion.connect(biquadFilter);
                    biquadFilter.connect(gainNode);
                    gainNode.connect(analyser);
                    analyser.connect(audioCtx.destination);

                    let stop = false

                    requestAnimationFrame(function log() {
                        Event.listen('stop-testing', () => stop = true)
                        if (stop) return

                        let bufferLength = analyser.frequencyBinCount;
                        let dataArray = new Uint8Array(bufferLength);
                        analyser.getByteFrequencyData(dataArray);
                        const level = Math.max.apply(null, dataArray);
                        Event.fire('set-decibels', level, true)
                        requestAnimationFrame(log);
                    });
                } catch (err) {
                    console.log('The following gUM error occured: ' + err);
                }
            } else {
                this.decibels = 0
                this.isListening = false;
                this.stream.getAudioTracks()[0].enabled = false
                Event.fire('stop-testing')
            }

        }
    }
}
</script>

<style scoped>
.media-preview-control {
    position: absolute;
    width: 140px;
    height: 50px;
    bottom: 15px;
    border-radius: 0.5rem;
    background-color: rgba(36, 36, 36, 0.8);
}
</style>
