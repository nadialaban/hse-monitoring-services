<template>
    <card class="col-lg-3 col-md-4" :class="is_expired ? 'text-muted' : ''"
          :image="is_expired ? images.expired_examination : images.examination">
        <strong class="card-title">
            {{ examination.title }}
        </strong>
        <small> {{ examination.doctor_description }} </small><br>
        <br>
        <small><b>Срок действия: </b>{{ examination.expiration_days }} дней</small><br>
        <div v-if="!examination.is_template">
            <small v-if="examination.deadline_date">
                <b>Крайняя дата сдачи: </b>{{ format_date(examination.deadline_date) }}<br>
            </small>
            <small v-if="examination.attach_date">
                <b>Дата назначения: </b>{{ format_date(examination.attach_date) }}<br>
            </small>
            <small v-if="examination.upload_date">
                <b>Дата загрузки: </b>{{ format_date(examination.upload_date) }}<br>
            </small>
        </div>

        <div v-if="!examination.is_template">
            <div v-if="examination.contract_id == current_contract_id && !is_expired">
                <a href="#" @click="edit_examination()">Редактировать</a>
                <a href="#" @click="delete_examination()">Отменить</a>
            </div>
            <div v-else>
                <small>Добавлено в другом контракте.</small>
            </div>

            <small v-if="!empty(examination.template_id)" class="text-muted">ID шаблона: {{
                    examination.template_id
                }}</small>
        </div>
        <div v-else>
            <a href="#" @click="attach_examination()">Назначить</a>
            <a href="#" v-if="is_admin" @click="edit_examination()">Редактировать</a><br>
            <a href="#" v-if="is_admin" @click="delete_examination()">Удалить</a>
            <small class="text-muted" v-else>ID: {{ examination.id }}</small>
        </div>
    </card>
</template>

<script>
import Card from "../../common/Card";
import * as moment from "moment/moment";

export default {
    name: "ExaminationCard",
    components: {Card},
    props: {
        examination: {required: true}
    },
    computed: {
        is_expired() {
            if (this.examination.is_template) return false
            return moment(this.examination.deadline_date, 'YYYY-MM-DD') < moment()
        }
    },
    methods: {
        format_date: function (date) {
            let d = date.split('-')
            return `${d[2]}.${d[1]}.${d[0]}`
        },
        attach_examination: function () {
            Event.fire('attach-examination-from-card', this.examination)
        },
        edit_examination: function () {
            Event.fire('edit-examination', this.examination)
        },
        delete_examination: function () {
            this.$confirm({
                message: `Вы уверены, что хотите удалить обследование?`,
                button: {
                    no: 'Нет',
                    yes: 'Да, удалить'
                },
                callback: confirm => {
                    if (confirm) {
                        this.axios.post(this.url('/api/settings/delete_examination'), this.examination)
                            .then((response) => Event.fire('examination-deleted', response.data.deleted_id));
                    }
                }
            })
        },
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

small {
    font-size: 90%;
}

.card a {
    font-size: 90% !important;
}
</style>
