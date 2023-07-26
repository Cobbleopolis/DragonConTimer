<template>
    <div class="card mb-2">
        <div class="card-header">
            <span v-if="consoleReq.loading">Loading...</span>
            <span v-else>
                {{ console.name }}
            </span>
        </div>
        <template v-if="consoleReq.loading">
            <div class="card-body">
                <LoadingAnimation />
            </div>
        </template>
            <template v-else>
                <p>{{ consoleId }}</p>
            </template>
    </div>
</template>

<script setup>
import LoadingAnimation from './LoadingAnimation.vue'
import { computed } from 'vue'
import { useQuery } from '@vue/apollo-composable'
import gql from 'graphql-tag'

const props = defineProps({
    consoleId: String
})

const consoleReq = useQuery(gql `
query ConsoleById($consoleId: MongoID!) {
    consoleById(_id: $consoleId) {
        checkoutWarning
        games {
            name
            count
        }
        name
    }
}`, props)

// consoleReq.onResult(res => this.console = res.data['consoleById'])

const console = computed(() => consoleReq.result.value?.consoleById ?? {})
</script>