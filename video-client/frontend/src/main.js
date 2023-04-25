import Vue from 'vue'
import App from './App.vue'

window.Event = new class {
    constructor() {
        this.vue = new Vue();
    }

    fire(event, data = null, silent = false) {
        if (!silent) {
            if (!data && data !== 0) {
                console.log('sending event', event);
            } else {
                console.log('sending event', event, 'with data', data);
            }
        }

        this.vue.$emit(event, data);
    }

    listen(event, callback) {
        this.vue.$on(event, callback);
    }
};

Vue.mixin({
    methods: {},
    computed: {
        mobile() {
            return window.innerWidth < window.innerHeight
        }
    },
    data() {
        return {
            access_key: window.ACCESS_KEY,
            images: {
                error: 'https://common.medsenger.ru/images/icons8-delete-128.png',
                mic: '/static/images/icons8-mic-50.png',
                white_mic: '/static/images/icons8-white-mic-50.png',
                mic_off: '/static/images/icons8-mic-off-50.png',
                white_mic_off: '/static/images/icons8-white-mic-off-50.png',
                camera: '/static/images/icons8-video-call-50.png',
                camera_off: '/static/images/icons8-no-video-50.png',
                white_camera: '/static/images/icons8-white-video-call-50.png',
                options: '/static/images/icons8-chevron-up-16.png',
                white_camera_off: '/static/images/icons8-white-no-video-50.png',
                white_options: '/static/images/icons8-white-chevron-up-16.png',
                ok: 'https://common.medsenger.ru/images/icons8-ok-128.png',
                avatar: '/static/images/user.png'
            }
        }
    }
})

new Vue({
    el: '#app',
    render: h => h(App)
})
