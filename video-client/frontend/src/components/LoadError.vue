<template>
    <div>
        <h3 style="text-align: center; margin-bottom: 15px;">{{ error }}</h3>

        <p style="text-align: center"><img :src="images.error" /></p>

        <p style="text-align: center">
            <small>{{ description }}</small>
        </p>

        <p style="text-align: center">
            <small>Вы можете закрыть вкладку.</small>
        </p>
    </div>
</template>

<script>
export default {
    name: "LoadError",
    props: ['error', 'description'],
    methods: {
        close: function () {
            window.parent.postMessage('close-modal', '*');
        }
    },
    mounted() {
    }
}
</script>

<style scoped>

</style>
