<template>
  <main class="container">
    <h1>Hello, world!</h1>
    <button class="btn btn-primary" @click="consoleReq.refetch">Refetch</button>
    <br>
    <template v-if="consoleReq.loading">
        <LoadingAnimation />
    </template>
    <template v-else-if="consoleReq.result">
        <ConsoleComponent :console-id="console._id" v-for="console of consoleReq.result.console" :key="console._id" />
    </template>
  </main>
</template>

<script>
import { useQuery } from '@vue/apollo-composable'
import gql from 'graphql-tag'

export default {
    data() {
        const consoleReq = useQuery(gql`query Query {console {_id}}`)
        // const consoles = computed(() => res.value?.console ?? [])

        // onResult(result => console.log(result))

        return {
            consoleReq
        }
    },
    
}
</script>

<script setup>
import LoadingAnimation from '../components/LoadingAnimation.vue'
import ConsoleComponent from '../components/ConsoleComponent.vue'
</script>