// The Vue build version to load with the `import` command
// (runtime-only or standalone) has been set in webpack.base.conf with an alias.
import Vue from 'vue'
import App from './App'
import vmodal from 'vue-js-modal'
import axios from "axios";
import VueConfirmDialog from 'vue-confirm-dialog'
import VueSimpleAlert from "vue-simple-alert";
import {BootstrapVue, IconsPlugin} from 'bootstrap-vue'

// Import Bootstrap an BootstrapVue CSS files (order is important)
import 'bootstrap/dist/css/bootstrap.css'
import 'bootstrap-vue/dist/bootstrap-vue.css'

window.MyEvent = new class {
    constructor() {
        this.vue = new Vue();
    }

    fire(event, data = null) {
        if (!data) {
            console.log('sending event', event);
        } else {
            console.log('sending event', event, 'with data', data);
        }

        this.vue.$emit(event, data);
    }

    listen(event, callback) {
        this.vue.$on(event, callback);
    }
};

Vue.mixin({
    methods: {
        url: function (action) {
            let api_host = window.API_HOST;
            let agent_token = window.AGENT_TOKEN;
            let contract_id = window.CONTRACT_ID;
            let agent_id = window.AGENT_ID;

            return api_host + '/api/client/agents/' + agent_id + '/?action=' + action + '&contract_id=' + contract_id + '&agent_token=' + agent_token
        },
        empty: function (e) {
            return !e && e !== 0
        },
        copy: function (to, from) {
            Object.keys(from).forEach(k => {
                to[k] = from[k]
            })
        },
        group_by: function (categories, field) {
            return categories.reduce((groups, item) => {
                const group = (groups[item[field] ? item[field] : 'Общее'] || []);
                group.push(item);
                groups[item[field] ? item[field] : 'Общее'] = group;
                return groups;
            }, {});
        },
        isJsonString: function (str) {
            if (!str)
                return true;
            try {
                JSON.parse(str);
            } catch (e) {
                return false;
            }
            return true;
        },
        toBase64: function (file) {
            return new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.readAsDataURL(file);
                reader.onloadend = () => resolve(reader.result.split(';base64,')[1]);
                reader.onerror = error => reject(error);
            })
        }
    },
    computed: {
        mobile() {
            return window.innerWidth < window.innerHeight
        }
    },
    data() {
        return {
            images: {
                ok: window.LOCAL_HOST + '/static/icons/icons8-ok-128.png',
                error: window.LOCAL_HOST + '/static/icons/icons8-delete-128.png',
                nothing_found: window.LOCAL_HOST + '/static/icons/icons8-nothing-found-100.png',
                file: window.LOCAL_HOST + '/static/icons/icons8-open-document-48.png',
                message: window.LOCAL_HOST + '/static/icons/icons8-communication-96.png'
            },
            axios: require('axios'),
            category_list: undefined,
            is_admin: window.IS_ADMIN,
            window_mode: window.MODE,
            doctor_id: window.DOCTOR_ID,
            clinic_id: window.CLINIC_ID
        }
    }
})

Vue.use(vmodal, {componentName: 'Modal'})
Vue.use(VueSimpleAlert);
Vue.use(VueConfirmDialog)

// Make BootstrapVue available throughout your project
Vue.use(BootstrapVue)
// Optionally install the BootstrapVue icon components plugin
Vue.use(IconsPlugin)

Vue.component('vue-confirm-dialog', VueConfirmDialog.default)

new Vue({
    render: h => h(App),
}).$mount('#app')

