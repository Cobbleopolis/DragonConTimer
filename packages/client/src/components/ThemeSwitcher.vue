<template>
    <ul class="dropdown-menu dropdown-menu-end m-0" aria-labelledby="themeSwitcher">
        <li v-for="theme of themes" :key="theme">
            <button class="dropdown-item d-flex align-items-center" type="button" @click="select(theme)">
                {{ getDisplayName(theme) }}
            </button>
        </li>
    </ul>
</template>

<script>
export default {
    setup() {

    },
    data() {
        return {
            themes: this.$themes.getnames()
        }
    },
    methods: {
        select(theme) {
            console.log(theme)
            this.$themes.select(theme)
        },
        getDisplayName(theme) {
            return theme.toUpperCase()
        }
    }
}
</script>