<template>
    <main class="container pt-2">
        <div class="offcanvas offcanvas-start" tabindex="-1" id="offcanvasFilters" aria-labelledby="offcanvasFiltersLabel">
            <div class="offcanvas-header">
                <h5 class="offcanvas-title" id="offcanvasFiltersLabel">Filters</h5>
                <button type="button" class="btn-close" data-bs-dismiss="offcanvas" aria-label="Close"></button>
            </div>
            <div class="offcanvas-body">
                <div>
                    Some text as placeholder. In real life you can have the elements you have chosen. Like, text, images,
                    lists, etc.
                </div>
                <div class="dropdown mt-3">
                    <button class="btn btn-secondary dropdown-toggle" type="button" data-bs-toggle="dropdown">
                        Dropdown button
                    </button>
                    <ul class="dropdown-menu">
                        <li><a class="dropdown-item" href="#">Action</a></li>
                        <li><a class="dropdown-item" href="#">Another action</a></li>
                        <li><a class="dropdown-item" href="#">Something else here</a></li>
                    </ul>
                </div>
            </div>
        </div>
        <template v-if="!isLoading">
            <button class="btn btn-primary mb-2" data-bs-toggle="offcanvas" data-bs-target="#offcanvasFilters"
                aria-controls="offcanvasFilters">Filters</button>
            <StationComponent :station-id="station._id" v-for="station of stations" :key="station._id" />
        </template>
        <template v-else>
            <div class="d-flex justify-content-center">
                <LoadingAnimation />
            </div>
        </template>
    </main>
</template>

<script setup>
import { computed } from 'vue'
import { useQuery, useQueryLoading } from '@vue/apollo-composable'
import gql from 'graphql-tag'
import LoadingAnimation from '../components/LoadingAnimation.vue'
import StationComponent from '../components/StationComponent.vue'

const stationListReq = useQuery(gql`
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
    updateQuery: (previousResult, { subscriptionData }) => {
        if (subscriptionData.data.stationRemove) {
            const tmp = structuredClone(previousResult)
            let indexToRemove = -1
            for (let i = 0; i < stations.value.length; i++) {
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

const consoleReq = useQuery(gql`
query Console {
  console {
    _id
    name
  }
}`)

const consoles = computed(() => consoleReq.result.value?.station ?? [])

const isLoading = useQueryLoading()
</script>