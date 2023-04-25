<template>
    <div>
        <h3 style="text-align: center; margin-bottom: 15px;">Звонок завершен</h3>

        <p style="text-align: center"><img :src="images.ok" /></p>

        <p style="text-align: center">
            <small>Вы можете закрыть вкладку.</small>
        </p>
    </div>
</template>

<script>
export default {
    name: "ActionDone",
    methods: {
        close: function () {
            window.parent.postMessage('close-modal-success', '*');
        }
    },
    mounted() {
        setTimeout(this.close, 1000);
    }
}
</script>

<style scoped>

</style>
