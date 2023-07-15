<template>
  <main class="container pt-2">
    <template v-if="stationListReq.loading">
        <div class="d-flex justify-content-center">
            <LoadingAnimation />
        </div>
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