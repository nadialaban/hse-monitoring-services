<template>
    <div style="background-color: white;" v-if="patient">
        <div class="container">
            <div class="row">
                <div class="col-12">
                    <p><strong>Отчет по мониторингу пациента</strong> {{ patient.name }} ({{ patient.birthday }})
                    <span class="float-right">
                        <a class="btn btn-sm btn-danger" v-if="!object_id && state != 'dashboard'"
                           @click="go_back()" href="#">Вернуться к началу</a>
                    </span>
                    </p>
                </div>
            </div>
        </div>
    </div>
</template>

<script>
export default {
    name: "DashboardHeader",
    props: ['patient', 'state'],
    methods: {
        go_back: function () {
            Event.fire('back-to-dashboard')
        }
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
}
</style>
