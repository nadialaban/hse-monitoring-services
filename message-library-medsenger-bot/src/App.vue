<template>
    <div style="padding-bottom: 15px;">
        <vue-confirm-dialog/>
        <loading v-if="state == 'loading'"/>
        <div v-else>
            <dashboard-header :patient="patient" v-if="patient"/>
            <div class="container">
                <dashboard :clinics="clinics" :data="{'messages': messages, 'sent_messages': patient.sent_messages}"
                           v-show="state == 'dashboard'"/>
                <message-editor :clinics="clinics" v-show="state == 'message-editor'"/>
            </div>
        </div>
    </div>
</template>

<script>
import Dashboard from "./components/Dashboard";
import Loading from "./components/parts/Loading";
import MessageEditor from "./components/MessageEditor";
import DashboardHeader from "./components/parts/DashboardHeader";

export default {
    name: 'app',
    components: {DashboardHeader, MessageEditor, Loading, Dashboard},
    data() {
        return {
            state: "loading",
            patient: undefined,
            message: {},
            messages: [],
            clinics: []
        }
    },
    created() {
        console.log("running created");

        // navigation
        MyEvent.listen('navigate-to-create-message-page', () => this.state = 'message-editor');
        MyEvent.listen('back-to-dashboard', () => this.state = 'dashboard');

        // message managing
        MyEvent.listen('message-created', (data) => {
            this.state = 'dashboard'
            this.messages.push(data)
            MyEvent.fire('update-messages', this.messages);
        });
        MyEvent.listen('message-edited', (data) => {
            let index = this.messages.findIndex(m => m.id == data.id)
            if (index != null) {
                this.messages[index] = data
                this.$forceUpdate()
            }
            this.state = 'dashboard'
            MyEvent.fire('update-messages', this.messages);
        });
        MyEvent.listen('edit-message', (message) => {
            this.state = 'message-editor'
            this.axios.get(this.url('/api/get_message/' + message.id)).then(response => {
                MyEvent.fire('navigate-to-edit-message-page', response.data);
            })
        });

        MyEvent.listen('remove-message', (id) => {
            this.messages = this.messages.filter(m => m.id != id)
            MyEvent.fire('update-messages', this.messages);
        })

        this.load()
    },
    mounted() {
        this.load()
    },
    methods: {
        load: function () {
            if (this.window_mode == 'done') {
                this.state = 'done'
            }

            if (this.window_mode == 'settings') {
                this.axios.get(this.url('/api/get_patient')).then((response) => {
                    this.patient = response.data
                    this.axios.get(this.url('/api/get_available_messages')).then(this.process_load_answer);
                })
            }
        },
        process_load_answer: function (response) {
            if (this.window_mode == 'settings') {
                this.messages = response.data;
                this.state = 'dashboard';
            }

            if (this.is_admin) {
                this.axios.get(this.url('/api/get_clinics_info')).then(response => this.clinics = response.data)
            }
        },
        process_load_error: function (response) {
            this.state = 'load-error'
        }
    }
}
</script>

<style>
#app {
    font-family: 'Avenir', Helvetica, Arial, sans-serif;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
    text-align: center;
    color: #2c3e50;
    margin-top: 60px;
}

.container {
    max-width: 95%;
}

h1, h2 {
    font-weight: normal;
}

a {
    color: #006c88;
    font-weight: bold;
}


body {
    background-color: #fcfcfc;
    font-family: Roboto;
}

@media screen and (max-width: 900px) {
    .slim-container {
        max-width: 100% !important;
        padding-left: 10px;
        padding-right: 10px;
    }
}

.col, .col-1, .col-10, .col-11, .col-12, .col-2, .col-3, .col-4, .col-5, .col-6, .col-7, .col-8, .col-9, .col-auto, .col-lg, .col-lg-1, .col-lg-10, .col-lg-11, .col-lg-12, .col-lg-2, .col-lg-3, .col-lg-4, .col-lg-5, .col-lg-6, .col-lg-7, .col-lg-8, .col-lg-9, .col-lg-auto, .col-md, .col-md-1, .col-md-10, .col-md-11, .col-md-12, .col-md-2, .col-md-3, .col-md-4, .col-md-5, .col-md-6, .col-md-7, .col-md-8, .col-md-9, .col-md-auto, .col-sm, .col-sm-1, .col-sm-10, .col-sm-11, .col-sm-12, .col-sm-2, .col-sm-3, .col-sm-4, .col-sm-5, .col-sm-6, .col-sm-7, .col-sm-8, .col-sm-9, .col-sm-auto, .col-xl, .col-xl-1, .col-xl-10, .col-xl-11, .col-xl-12, .col-xl-2, .col-xl-3, .col-xl-4, .col-xl-5, .col-xl-6, .col-xl-7, .col-xl-8, .col-xl-9, .col-xl-auto {
    padding-right: 5px;
    padding-left: 5px;
}

.row {
    margin: 5px -5px;
}


.card {

    border-color: rgba(0, 108, 136, 0.5);
}

.btn-primary, .btn-primary:active, .btn-primary:hover, .btn-primary:focus {
    border-color: #006c88;
    background-color: #006c88;
}

.btn-success, .btn-success:active, .btn-success:hover, .btn-success:focus {
    border-color: #24a8b4;
    background-color: #24a8b4;
}

.btn-danger, .btn-danger:active, .btn-danger:hover, .btn-danger:focus {
    border-color: #ff5763;
    background-color: #ff5763;
}

h5, h4, h3 {
    color: #006c88;
    margin-bottom: 15px;
    margin-top: 15px;
}

strong {
    font-weight: 500;
}

input[type=checkbox] {
    /* Double-sized Checkboxes */
    -ms-transform: scale(1.2); /* IE */
    -moz-transform: scale(1.2); /* FF */
    -webkit-transform: scale(1.2); /* Safari and Chrome */
    -o-transform: scale(1.2); /* Opera */
    transform: scale(1.2);
    margin: 10px;
}
</style>

