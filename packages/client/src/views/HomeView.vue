<template>
  <main class="container pt-2">
    <template v-if="stationListReq.loading">
        <div class="d-flex justify-content-center">
            <LoadingAnimation />
        </div>
    </template>
    <template v-else-if="stationListReq.result">
        <StationComponent :station-id="station._id" v-for="station of stations" :key="station._id" />
    </template>
  </main>
</template>

<script>
import { computed } from 'vue'
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

        stationListReq.subscribeToMore({
            document: gql`
            subscription StationCreate {
                stationCreate {
                    _id
                    consoleOptions
                    status
                }
            }`,
            updateQuery: (previousResult, { subscriptionData }) => {
                const tmp = structuredClone(previousResult)
                tmp.station = [...tmp.station, subscriptionData.data.stationCreate]
                return tmp
            }
        })

        stationListReq.subscribeToMore({
            document: gql`
            subscription StationRemove {
                stationRemove {
                    _id
                }
            }`,
            updateQuery: (previousResult, {subscriptionData}) => {
                if (subscriptionData.data.stationRemove) {
                    const tmp = structuredClone(previousResult)
                    let indexToRemove = -1
                    for(let i = 0; i < stations.value.length; i++) {
                        if (stations.value[i]._id === subscriptionData.data?.stationRemove._id) {
                            indexToRemove = i
                            break
                        }
                    }
                    if (indexToRemove !== -1) {
                        tmp.station.splice(indexToRemove, 1)
                    }
                    return tmp
                }
            }
        })

        const stations = computed(() => stationListReq.result.value?.station ?? [])
        return {
            stationListReq,
            stations
        }
    },
    components: { StationComponent }
}
</script>

<script setup>
import LoadingAnimation from '../components/LoadingAnimation.vue'
import StationComponent from '../components/StationComponent.vue'
</script>