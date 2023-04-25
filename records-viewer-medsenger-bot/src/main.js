import Vue from 'vue'
import App from './App.vue'
import vmodal from 'vue-js-modal'
import VueConfirmDialog from 'vue-confirm-dialog'

window.Event = new class {
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
        group_by: function (data, field) {
            if (!data)
                return []

            return data.reduce((groups, item) => {
                const group = (groups[item[field] ? item[field] : 'Общее'] || []);
                group.push(item);
                groups[item[field] ? item[field] : 'Общее'] = group;
                return groups;
            }, {});
        },
        load_data: function (categories, dates, options = null) {
            let data = {
                categories: categories,
                dates: dates, // [start, end]
                options: options
            }
            this.axios.post(this.url('/api/get_records'), data).then(response => {
                Event.fire('loaded', response.data)
            });
        },
        binary_search: function (arr, value, l, r) {
            let mid = Math.floor((r - l) / 2) + l

            if (arr[mid] == value)
                return mid;
            if (r - l == 0)
                return r + (arr[r] < value ? 1 : 0);
            if (arr[mid] < value) {
                l = (mid + 1) > r ? r : (mid + 1)
                return this.binary_search(arr, value, l, r);
            }
            r = (mid - 1) < l ? l : (mid - 1)
            return this.binary_search(arr, value, l, r);
        },
        add_days: function (date, days) {
            let new_date = new Date(date.valueOf());
            new_date.setDate(new_date.getDate() + days);
            return new_date;
        },
        start_of_day: function (date) {
            date.setHours(0, 0, 0, 0)
            return date
        },
        middle_of_day: function (date) {
            date.setHours(12, 0, 0, 0)
            return date
        },
        end_of_day: function (date) {
            date.setHours(23, 59, 59, 999)
            return date
        },
        dates_difference: function (date1, date2) {
            const diffTime = Math.abs(date2 - date1);
            return Math.ceil(diffTime / this.day)
        },
        range_arr: function (size, startAt = 0) {
            return [...Array(size).keys()].map(i => i + startAt);
        }
    },
    computed: {
        mobile() {
            return window.innerWidth < window.innerHeight
        },
        day() {
            return 24 * 36e5
        },
        offset() {
            return -1 * new Date().getTimezoneOffset() * 60
        }
    },
    data() {
        return {
            images: {
                logo: 'https://common.medsenger.ru/images/logo.png',
                ok: 'https://common.medsenger.ru/images/icons8-ok-128.png',
                error: 'https://common.medsenger.ru/images/icons8-delete-128.png',
                nothing_found: 'https://common.medsenger.ru/images/icons8-nothing-found-100.png',
                warning: 'https://common.medsenger.ru/images/icons8-error-18.png',
                report: 'https://common.medsenger.ru/images/icons8-search-property-96.png',
                graph: 'https://common.medsenger.ru/images/icons8-graph-96.png',
                heatmap: 'https://common.medsenger.ru/images/icons8-heat-map-96.png',
                file: 'https://common.medsenger.ru/images/icons8-open-document-48.png'
            },
            axios: require('axios'),
            category_list: undefined,
            window_mode: window.MODE,
            object_id: window.OBJECT_ID,
            source: window.SOURCE
        }
    }
})

window.onresize = function () {
    Event.fire('window-resized')
}

Vue.use(vmodal, {componentName: 'Modal'})
Vue.use(VueConfirmDialog)
Vue.component('vue-confirm-dialog', VueConfirmDialog.default)

new Vue({
    render: h => h(App),
}).$mount('#app')
