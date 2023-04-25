<template>
    <div>
        <div>
            <h3>Библиотека сообщений</h3>

            <!-- фильтрация -->
            <div class="row" style="margin-bottom: 5px;">
                <div class="col" v-if="is_admin">
                    <select class="form-control form-control-sm" v-model="current_clinic" @change="filter_messages()">
                        <option :value="undefined" disabled>Выбор клиники</option>
                        <option v-for="clinic in clinics" :value="clinic.id">{{
                                clinic.name
                            }}
                        </option>
                    </select>
                </div>

                <div class="col">
                    <select class="form-control form-control-sm" v-model="current_category" @change="filter_messages()">
                        <option :value="undefined" disabled>Выбор категории</option>
                        <option v-for="category in Object.keys(message_groups)" :value="category">{{
                                category
                            }}
                        </option>
                    </select>
                </div>
                <div class="col">
                    <input type="text" v-model="search_query" class="form-control form-control-sm"
                           placeholder="Поиск по сообщениям..." @change="filter_messages()">
                </div>
                <div class="d-grid col-1 mx-auto">
                    <button class="btn btn-primary btn-sm" @click="create_message()">Создать</button>
                </div>
            </div>

            <br>

            <!-- карточки -->
            <div class="row d-flex" v-for="message in filtered_messages" v-if="filtered_messages.length">
                <div class="col-1">
                    <button class="btn btn-primary btn-sm w-100" style="height: 52px" @click="send_now(message)">
                        Отправить
                    </button>
                </div>
                <div class="col">
                    <div class="accordion" :id="`accordion_${message.id}`">
                        <accordion-item :title="message.title" :image="images.message"
                                        :sent="sent_messages && sent_messages.includes(message.id)"
                                        :parent="`#accordion_${message.id}`"
                                        :key="message.id" :object_id="message.id">
                            <p class="card-text" v-html="message.text.replace('\n','<br>')"/>

                            <!-- Файлы -->
                            <div class="row">
                                <div v-for="file in message.attached_files" class="col-4">
                                    <div class="row-fluid">
                                        <img :src="images.file" height="20"/>
                                        <a href="#" @click="get_file(file.id, 'download')">{{ file.name }} (скачать)</a>
                                    </div>
                                </div>
                            </div>

                            <div v-for="file in message.attached_files">
                                <more-info-block :title="`Просмотр ${file.name}`" :id="`file_${file.id}`"
                                                 v-if="file.type.includes('image')">
                                    <loading v-if="!files_to_show[file.id]"/>
                                    <img :src="`data:${file.type};base64,${files_to_show[file.id].base64}`"
                                         :style="`max-width: ${img_width}px; max-height: ${img_height}px;`" v-else/>
                                </more-info-block>
                            </div>

                            <div v-if="message.pin_files">
                                <small><i>
                                    Закрепляет файлы
                                    <ul>
                                        <li v-for="file in message.attached_files" v-if="file.title">
                                            {{ file.title }} ({{ file.name }})
                                        </li>
                                    </ul>

                                </i></small>
                            </div>

                            <!-- Действия -->
                            <div style="margin-top: 15px">
                                <a href="#" @click="edit_message(message)"
                                   v-if="is_admin || message.editors.includes(doctor_id)">Редактировать</a>
                                <a href="#" @click="delete_message(message)" v-if="is_admin">Удалить</a>
                            </div>

                        </accordion-item>
                    </div>
                </div>
            </div>

            <div v-else>
                <p style="text-align: center"><img :src="images.nothing_found"/></p>

                <p style="text-align: center">
                    <small>Ничего не найдено.</small>
                </p>
            </div>
        </div>
    </div>
</template>

<script>
import Card from "./parts/Card";
import MoreInfoBlock from "./parts/MoreInfoBlock";
import Loading from "./parts/Loading";
import AccordionItem from "./parts/AccordionItem";

import downloadjs from "downloadjs";

export default {
    name: "Dashboard",
    components: {AccordionItem, Loading, MoreInfoBlock, Card},
    props: {
        data: {
            required: true
        },
        clinics: {
            required: true
        }
    },
    data() {
        return {
            search_query: '',
            files_to_show: {},
            messages: [],
            sent_messages: [],
            filtered_messages: [],
            current_category: undefined,
            current_clinic: undefined
        }
    },
    computed: {
        message_groups() {
            return this.group_by(this.messages, 'category')
        },
        img_width() {
            return Math.floor(window.innerWidth * 0.4)
        },
        img_height() {
            return Math.floor(window.innerHeight * 0.5)
        },
    },
    methods: {
        get_file: function (file_id, action) {
            this.axios.get(this.url('/api/get_file/' + file_id)).then(response => {
                let file = response.data
                if (action == 'download')
                    downloadjs(`data:${file.type};base64,${response.data.base64}`, file.name, file.type);
                else if (action == 'show')
                    this.files_to_show[file.id] = file
                this.$forceUpdate()
            }).catch(() => MyEvent.fire('load-error'));
        },
        // messages
        filter_messages: function () {
            this.filtered_messages = []
            if (!this.current_category)
                this.filtered_messages = this.messages.filter(m =>
                    m.title.toLowerCase().includes(this.search_query.toLowerCase()) ||
                    m.text.toLowerCase().includes(this.search_query.toLowerCase()))
            else
                this.filtered_messages = this.message_groups[this.current_category].filter(m =>
                    m.title.toLowerCase().includes(this.search_query.toLowerCase()) ||
                    m.text.toLowerCase().includes(this.search_query.toLowerCase()))

            if (this.current_clinic)
                this.filtered_messages = messages.filter(m => !m.include_clinics && !m.exclude_clinics ||
                    m.include_clinics && m.include_clinics.includes(this.current_clinic) ||
                    m.exclude_clinics && m.exclude_clinics.includes(this.current_clinic))

            this.filtered_messages = this.filtered_messages.sort((a, b) => ((a.id < b.id) ? -1 : ((a.id > b.id) ? 1 : 0)))
        },
        create_message: function () {
            MyEvent.fire('navigate-to-create-message-page')
        },
        edit_message: function (message) {
            MyEvent.fire('edit-message', message)
        },
        delete_message: function (message) {
            this.$confirm(
                {
                    message: `Вы уверены, что хотите удалить сообщение ` + message.title + `?`,
                    button: {
                        no: 'Нет',
                        yes: 'Да, удалить'
                    },
                    callback: confirm => {
                        if (confirm) {
                            this.axios.post(this.url('/api/delete_message'), message)
                                .then(this.process_delete_message_answer);
                        }
                    }
                }
            )
        },
        process_delete_message_answer: function (response) {
            if (response.data.deleted_id) {
                MyEvent.fire('remove-message', response.data.deleted_id)
            }
        },
        send_now: function (message) {
            let alert = () => {
                this.sent_messages.push(message.id)
                this.$alert("Сообщение отправлено!");
            }

            this.$confirm(
                {
                    message: `Отправить сообщение ` + message.title + ` пациенту прямо сейчас?`,
                    button: {
                        no: 'Нет',
                        yes: 'Да'
                    },
                    callback: confirm => {
                        if (confirm) {
                            this.axios.get(this.url('/api/send_message/' + message.id)).then(alert);
                        }
                    }
                }
            )
        },

    },
    created() {
        this.messages = this.data.messages
        this.filtered_messages = this.data.messages
        this.filtered_messages = this.filtered_messages.sort((a, b) => ((a.id < b.id) ? -1 : ((a.id > b.id) ? 1 : 0)))
        this.sent_messages = this.data.sent_messages
    },
    mounted() {
        this.messages = this.data.messages
        MyEvent.listen('update-messages', (messages) => {
            this.messages = messages
            this.filter_messages()
            this.$forceUpdate()
        });

        MyEvent.listen('open-more-info', (id) => {
            if (id.includes('file')) {
                let file_id = parseInt(id.split('_')[1])
                if (!this.files_to_show[id]) {
                    this.get_file(file_id, 'show')
                }
            }
        })

    }
}
</script>

<style scoped>
p {
    margin-top: 5px;
    margin-bottom: 5px;
}

h5 {
    margin-bottom: 10px;
    margin-top: 10px;
    font-size: 1.15rem;
}

.sidebar {
    margin: -5px 10px -5px -5%;
    background-color: #24a8b4;
    color: #fcfcfc;
}

small {
    font-size: 90%;
}

img {
    object-fit: contain;
    object-position: left top;
}
</style>
