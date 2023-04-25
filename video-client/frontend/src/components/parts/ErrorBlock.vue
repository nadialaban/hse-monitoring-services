<template>
    <div class="alert" role="alert" v-if="errors.length || !isChrome">
        <ul>
            <li v-if="!isChrome">
                Для участия в мероприятии рекомендуется использовать последнюю версию браузера
                <a href="https://www.google.com/chrome/" target="_blank" style="color: #24a8b4">Google Chrome</a>.</li>
            <li v-for="error in errors"><span v-html="error"/></li>
        </ul>
    </div>

</template>

<script>
export default {
    name: "ErrorBlock",
    props: ['errors'],
    computed: {
        isChrome() {
            return /Chrome/.test(navigator.userAgent) && /Google Inc/.test(navigator.vendor) && !/OPR/.test(navigator.userAgent)
        }
    }
}
</script>

<style scoped>
    ul {
        margin: 0;
    }
    .alert {
        position: absolute;
        font-size: small;
        top: 15px;
        width: 90%;
        color: #fcfcfc;
        border-radius: 0.5rem;
        background-color: rgba(36, 36, 36, 0.8);
    }
</style>
