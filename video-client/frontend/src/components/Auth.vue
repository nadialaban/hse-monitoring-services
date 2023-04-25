<template>
<div>
    <error-block :errors="errors"/>
    <div class="center-content container">
        <div class="row">
            <div class="col-6 offset-3">
                <h5>Пожалуйста, введите ключ:</h5>
                <input type="text" class="form-control form-control-sm"
                       :class="this.errors.length? 'is-invalid': ''" placeholder="Введите ключ..." v-model="key">
                <button class="btn btn-primary btn-sm" @click="make_auth()">Подключиться</button>
            </div>
        </div>
    </div>
</div>
</template>

<script>
import ErrorBlock from "./parts/ErrorBlock.vue";

export default {
    name: "Auth",
    components: {ErrorBlock},
    data() {
        return {
            key: undefined,
            errors: []
        }
    },
    created() {
        Event.listen('auth-failed', () => {
            this.errors = ['Неверный ключ. Пожалуйста, проверьте правильность введенных данных.']
        })
    },
    methods: {
        make_auth: function () {
            Event.fire('emit-message', {
                type: 'AUTH',
                params: {
                    access_key: this.key,
                    user_agent: window.navigator.userAgent
                }
            })
        }
    }
}
</script>

<style scoped>
</style>
