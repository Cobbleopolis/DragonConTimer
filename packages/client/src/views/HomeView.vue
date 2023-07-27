<template>
    <main class="container pt-2">
        <div class="offcanvas offcanvas-start" tabindex="-1" id="offcanvasFilters" aria-labelledby="offcanvasFiltersLabel">
            <div class="offcanvas-header">
                <h5 class="offcanvas-title" id="offcanvasFiltersLabel">Filters</h5>
                <button type="button" class="btn-close" data-bs-dismiss="offcanvas" aria-label="Close"></button>
            </div>
            <div class="offcanvas-body">
                <div v-if="!isLoading">
                    <button class="btn btn-primary" @click="clearFilters">Clear Filters</button>
                    <form>
                        <span>States</span>
                        <div class="form-check form-switch" v-for="state in stationStates.allStatesArr" :key="state">
                            <input class="form-check-input" type="checkbox" :value="state" role="switch" name="stationStateFilter" :id="'stationStateFilter' + state" v-model="stationStateFilters">
                            <label class="form-check-label" :for="'stationStateFilter' + state">{{ stationStates.getDisplayName(state) }}</label>
                        </div>
                        <span>Console Availability</span>
                        <div class="form-check form-switch" v-for="console in consoles" :key="console._id">
                            <input class="form-check-input" type="checkbox" :value="console._id" role="switch" name="consoleAvailabilityFilter" :id="'consoleAvailability' + console._id" v-model="consoleFilters">
                            <label class="form-check-label" :for="'consoleAvailability' + console._id">{{ console.name }}</label>
                        </div>
                    </form>
                </div>
                <div v-else class="d-flex justify-content-center">
                    <LoadingAnimation />
                </div>
            </div>
        </div>
        <template v-if="!isLoading">
            <button class="btn btn-primary mb-2" data-bs-toggle="offcanvas" data-bs-target="#offcanvasFilters"
                aria-controls="offcanvasFilters">Filters</button>
            <StationComponent :station-id="station._id" v-for="station of filteredStations" :key="station._id" />
        </template>
        <template v-else>
            <div class="d-flex justify-content-center">
                <LoadingAnimation />
            </div>
        </template>
    </main>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useQuery, useQueryLoading } from '@vue/apollo-composable'
import gql from 'graphql-tag'
import LoadingAnimation from '../components/LoadingAnimation.vue'
import StationComponent from '../components/StationComponent.vue'
import stationStates from '../utils/stationStates'

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

const consoles = computed(() => consoleReq.result.value?.console ?? [])

const consoleFilters = ref([])
const stationStateFilters = ref([])

function clearFilters() {
    consoleFilters.value = []
    stationStateFilters.value = []
}

const filteredStations = computed(() => {
    let filtered = stations.value
    if (!filtered)
        return []
    if (stationStateFilters.value && stationStateFilters.value.length > 0) {
        filtered = filtered.filter(s => stationStateFilters.value.includes(s.status))
    }
    if (consoleFilters.value && consoleFilters.value.length > 0) {
        filtered = filtered.filter(s => s.consoleOptions.some(co => consoleFilters.value.includes(co)))
    }
    return filtered
})

const isLoading = useQueryLoading()
</script>