<template>
    <div v-if="message">
        <h5 v-if="!message.id">Создание сообщения</h5>
        <h5 v-if="message.id">Настройка сообщения "{{ message.title }}" </h5>

        <card title="Описание сообщения">
            <form-group48 title="Название">
                <input class="form-control form-control-sm" v-model="message.title"
                       :class="this.validated && !message.title ? 'is-invalid' : ''"/>
            </form-group48>

            <form-group48 title="Текст">
                <textarea class="form-control form-control-sm" rows="15" v-model="message.text"></textarea>
            </form-group48>

            <form-group48 title="Категория">
                <input class="form-control form-control-sm" v-model="message.category"/>
            </form-group48>

            <!-- Админка -->
            <div v-if="is_admin">
                <form-group48 v-if="is_admin" title="Показывать сообщение клиникам">
                    <multiselect v-model="message.include_clinics" :options="clinics" :multiple="true"
                                 :close-on-select="false" :clear-on-select="false" :preserve-search="true"
                                 label="name" track-by="name" placeholder="Введите название клиники..."
                                 select-label="Выбрать" selected-label="Выбрано" deselect-label="Убрать"></multiselect>
                </form-group48>

                <form-group48 v-if="is_admin" title="Скрыть сообщение от клиник">
                    <multiselect v-model="message.exclude_clinics" :options="clinics" :multiple="true"
                                 :close-on-select="false" :clear-on-select="false" :preserve-search="true"
                                 label="name" track-by="name" placeholder="Введите название клиники..."
                                 select-label="Выбрать" selected-label="Выбрано" deselect-label="Убрать"></multiselect>
                </form-group48>

                <form-group48 title="ID врачей, которые могут редактировать сообщение" description="через запятую">
                    <input class="form-control form-control-sm" v-model="message.editors"/>
                </form-group48>
            </div>
        </card>

        <card title="Файлы">
            <form-group48 title="Закрепить в материалах" description="Будут закреплены только файлы с описанием">
                <input type="checkbox" class="monitoring-input" v-model="message.pin_files"/>
            </form-group48>
            <form-group48 title="Название">
                <input type="file" class="monitoring-input" multiple v-bind:ref="'file'" @change="submit_file"/>
            </form-group48>
            <br>
            <div class="alert alert-primary" role="alert" v-if="file_states.length">
                <ul>
                    <li v-for="state in file_states"><p v-html="state"/></li>
                </ul>
            </div>

            <!-- Файлы -->
            <div class="row">
                <div v-for="(file, i) in message.attached_files" class="col-6">
                    <div class="row-fluid">
                        <img :src="images.file" height="20"/>
                        <a href="#" @click="get_file(file, 'download')">{{ file.name }} (скачать)</a>
                        <a class="btn btn-default btn-sm" @click="remove_file(i)">Удалить</a>
                    </div>
                    <input class="form-control form-control-sm" v-model="file.title" placeholder="Введите описание"
                           v-if="message.pin_files"/>
                </div>
            </div>

            <div v-for="(file, i) in message.attached_files">
                <more-info-block :title="`Просмотр ${file.name}`" :id="`file_${file.id}`"
                                 v-if="file.type.includes('image')">
                    <img :src="`data:${file.type};base64,${file.base64}`"
                         :style="`max-width: ${img_width}px; max-height: ${img_height}px;`"/>
                </more-info-block>
            </div>
        </card>
        <button class="btn btn-danger" @click="go_back()">Назад</button>
        <button class="btn btn-success" @click="save()">Сохранить</button>

        <error-block :errors="errors"/>
    </div>
</template>

<script>
import ErrorBlock from "./parts/ErrorBlock";
import FormGroup48 from "./parts/FormGroup-4-8";
import Card from "./parts/Card";
import MoreInfoBlock from "./parts/MoreInfoBlock";
import Loading from "./parts/Loading";

import downloadjs from "downloadjs";
import Multiselect from 'vue-multiselect'

export default {
    name: "MessageEditor",
    props: ['clinics'],
    components: {Loading, MoreInfoBlock, Card, FormGroup48, ErrorBlock, Multiselect},
    data() {
        return {
            message: undefined,
            validated: false,
            errors: [],
            file_states: []
        }
    },
    computed: {
        img_width() {
            return Math.floor(window.innerWidth * 0.4)
        },
        img_height() {
            return Math.floor(window.innerHeight * 0.5)
        }
    },
    methods: {
        go_back: function () {
            this.$confirm({
                message: `Вы уверены? Внесенные изменения будут утеряны!`,
                button: {
                    no: 'Нет',
                    yes: 'Да'
                },
                callback: confirm => {
                    if (confirm) {
                        let old = JSON.parse(this.backup)
                        this.copy(this.message, old)
                        MyEvent.fire('back-to-dashboard');

                        this.message = undefined
                        this.file_states = []
                        this.errors = []
                    }
                }
            })
        },

        // файлы
        get_file: function (file, action) {
            if (action == 'download')
                downloadjs(`data:${file.type};base64,${file.base64}`, file.name, file.type);
            this.$forceUpdate()
        },
        remove_file: function (i) {
            this.message.attached_files.splice(i, 1)
        },
        submit_file: function (event) {
            let files = Array.from(event.target.files)

            if (files) {
                this.file_states = []
                files.forEach((file, i) => {
                    if (file.size > 50 * 1024 * 1024) {
                        this.file_states.push('<strong>' + file.name + ':</strong> Размер файла не должен превышать 50 МБ.')
                    } else {
                        let filename = file.name;
                        let type = file.type;

                        if (!type) {
                            type = 'text/plain'
                        }

                        this.file_states.push('<strong>' + file.name + ':</strong> Готовим файл к загрузке...');

                        this.toBase64(file).then((base64) => {
                            this.message.attached_files.push({
                                name: filename,
                                type: type,
                                base64: base64
                            })
                            this.file_states[i] = '<strong>' + file.name + ':</strong> Файл успешно загружен!';
                            this.$forceUpdate();
                        })
                    }
                })
            }
        },

        // Сохранение
        check: function () {
            this.errors = [];
            if (this.empty(this.message.title)) {
                this.errors.push('Укажите название сообщения')
            }

            if (this.empty(this.message.text) && (!this.message.attached_files || !this.message.attached_files.length)) {
                this.errors.push('Добавьте текст или файл')
            }

            if (this.message.editors.split(',').filter(id => isNaN(parseInt(id))).length && this.message.editors != '') {
                this.errors.push('Проверьте ID врачей')
            }

            return !this.errors.length;
        },
        save: function () {
            this.validated = true
            if (this.check()) {
                this.message.editors = this.message.editors != '' ?
                    this.message.editors.split(',').map(id => parseInt(id)) : []

                this.axios.post(this.url('/api/save_message'), this.message)
                    .then(this.process_save_answer)
                    .catch(this.process_save_error);
            }
        },
        process_save_answer: function (response) {
            let is_new = this.empty(this.message.id)
            this.message.id = response.data.id

            if (is_new) {
                MyEvent.fire('message-created', this.message)
            } else {
                MyEvent.fire('message-edited', this.message)
            }

            this.message = undefined
            this.file_states = []
            this.validated = false
        },
        process_save_error: function (response) {
            this.errors.push('Ошибка сохранения');
        },

    },
    created() {
    },
    mounted() {
        MyEvent.listen('create-message-editor', () => {
            this.message = {}
            this.backup = JSON.stringify(this.message)
        });

        MyEvent.listen('navigate-to-create-message-page', () => {
            this.message = {
                attached_files: [],
                editors: '',
                include_clinics: [],
                exclude_clinics: []
            }

            if (!this.is_admin)
                this.message.include_clinics = [this.clinics.filter(c => c.id == this.clinic_id)[0]]

            this.backup = JSON.stringify(this.message)
        });

        MyEvent.listen('navigate-to-edit-message-page', message => {
            this.message = message

            if (this.is_admin) {
                this.message.editors = this.message.editors ? this.message.editors.toString() : ''
                this.message.include_clinics = message.include_clinics ?
                    this.clinics.filter(c => this.message.include_clinics.includes(c.id)) : []
                this.message.exclude_clinics = message.exclude_clinics ?
                    this.clinics.filter(c => this.message.exclude_clinics.includes(c.id)) : []
            }

            this.backup = JSON.stringify(message)
            this.$forceUpdate()
        });
    }
}
</script>

<style scoped>
img {
    object-fit: contain;
    object-position: left top;
}
</style>

<style src="vue-multiselect/dist/vue-multiselect.min.css"></style>
