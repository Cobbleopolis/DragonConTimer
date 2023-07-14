<template>
  <main class="container">
    <h1>Hello, world!</h1>
    <br>
    <template v-if="stationListReq.loading">
        <LoadingAnimation />
    </template>
    <template v-else-if="stationListReq.result">
        <StationComponent :station-id="station._id" v-for="station of stationListReq.result.station" :key="station._id" />
    </template>
  </main>
</template>

<script>
import { useQuery } from '@vue/apollo-composable'
import gql from 'graphql-tag'

export default {
    data() {
        const stationListReq = useQuery(gql `
        query Query {
            station {
                _id
                consoleOptions
                status
            }
        }`)
        return {
            stationListReq
        }
    },
    components: { StationComponent }
}
</script>

<script setup>
import LoadingAnimation from '../components/LoadingAnimation.vue'
import StationComponent from '../components/StationComponent.vue'
</script>