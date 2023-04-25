<template>
    <div>
        <div style="margin-top: 15px;" class="alert alert-info" role="alert">
            Напоминания о загрузке обследования приходят заблаговременно.
        </div>
        <div v-if="examinations.length">
            <div v-if="!mobile">
                <div class="row font-weight-bold" style="padding: 0 1.25rem;">
                    <span class="col-4">Обследование:</span>
                    <span class="col-2">Пройти с:</span>
                    <span class="col-2">Загрузить до:</span>
                </div>

                <div v-for="examination in examinations">
                    <card :class="examination.active ? '' : 'text-muted'"
                          :image="examination.active ? images.examination : images.expired_examination">
                        <div class="row">
                            <span class="col-4">
                                <b :style="examination.active ? 'color: #006c88' : ''">{{ examination.title }}</b><br>
                                {{ examination.patient_description }}
                            </span>
                            <span class="col-2">{{ format_date(examination.notification_date) }}</span>
                            <span class="col-2">{{ format_date(examination.deadline_date) }}</span>
                            <div class="col">
                                <button class="btn btn-sm btn-primary" v-if="examination.active"
                                        @click="load_examination(examination)">
                                    Загрузить
                                </button>
                                <span v-else>Загрузка сейчас недоступна</span>
                                <br>
                                <div v-if="examination.upload_date">
                                    <img :src="images.file" height="20"/>
                                    <a href="#" @click="get_files(examination)">Скачать файлы</a>
                                </div>
                            </div>
                        </div>
                    </card>
                </div>
            </div>

            <div v-else>
                <div v-for="examination in examinations">
                    <card :class="examination.active ? '' : 'text-muted'"
                          :image="examination.active ? images.examination : images.expired_examination">
                        <span style="color: #006c88">{{ examination.title }}</span><br>
                        {{ examination.patient_description }}<br>
                        <span><b>Пройти с: </b>{{ format_date(examination.notification_date) }}</span><br>
                        <span><b>Загрузить до: </b>{{ format_date(examination.deadline_date) }}</span>
                        <button class="btn btn-sm btn-primary" v-if="examination.active"
                                @click="load_examination(examination)">
                            Загрузить
                        </button>
                        <span v-else><br>Загрузка сейчас недоступна</span>
                        <br>
                        <div v-if="examination.upload_date">
                            <img :src="images.file" height="20"/>
                            <a href="#" @click="get_files(examination)">Скачать файлы</a>
                        </div>
                    </card>
                </div>
            </div>
        </div>
    </div>
</template>

<script>
import Card from "../common/Card";
import downloadjs from "downloadjs";

export default {
    name: "ExaminationsList",
    components: {Card},
    props: {
        data: {required: true}
    },
    data() {
        return {
            flags: {
                lock_btn: false
            },
            examinations: [],
            errors: []
        }
    },
    methods: {
        format_date: function (date) {
            let d = date.split('-')
            return `${d[2]}.${d[1]}.${d[0]}`
        },
        load_examination: function (examination) {
            if (examination.record_id && !examination.files) {
                this.axios.get(this.url('/api/examination/' + examination.id))
                    .then((response) => {
                        examination.files = response.data.files
                        Event.fire('navigate-to-load-examination-page', examination)
                    });
            } else {
                Event.fire('navigate-to-load-examination-page', examination)
            }
        },
        get_files: function (examination) {
            this.axios.get(this.url('/api/settings/get_examination_files/' + examination.id))
                .then((response) => {
                    response.data.forEach((file) => {
                        downloadjs(`data:${file.type};base64,${file.base64}`, file.name, file.type);
                    })
                })
        }
    },
    created() {
        let today = new Date()
        today.setHours(0, 0, 0)
        console.log(this.data)

        this.examinations = this.data.examinations.map((examination) => {
            examination.date = new Date(examination.notification_date)
            examination.active = examination.date <= today && new Date(examination.deadline_date) > today
            return examination
        })
        this.examinations.sort((a, b) => {
            return a.date < b.date ? -1 : a.date > b.date ? 1 : 0
        })

        Event.listen('examination-loaded', (examination) => {
            let ex = this.examinations.filter((e) => e.id == examination.id)[0]
            ex.upload_date = examination.upload_date
        })
    }
}
</script>

<style scoped>
.card-body {
    padding: 10px !important;
}
</style>
