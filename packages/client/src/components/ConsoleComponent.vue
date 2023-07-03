<template>
    <div class="card">
        <div class="card-body">
            <p>{{ consoleId }}</p>
        </div>
    </div>
</template>

<script setup>
const props = defineProps({
    consoleId: String
})
</script>