<template>
    <div class="card mb-2">
        <div class="card-header">
            <span v-if="isLoading()">Loading...</span>
            <span v-else>
                {{ station.name }}&nbsp;({{ consoleOptions.map(x => x.name).join(", ") }})
            </span>
        </div>
        <template v-if="isLoading()">
            <div class="card-body">
                <LoadingAnimation />
            </div>
        </template>
        <template v-else>
            <p>{{ stationId }}</p>
            <p>{{ station }}</p>
        </template>
    </div>
</template>

<script>
import LoadingAnimation from './LoadingAnimation.vue'
import { computed } from 'vue'
import { useQuery } from '@vue/apollo-composable'
import gql from 'graphql-tag'

export default {
    props: {
        stationId: String
    },
    data() {
        const stationReq = useQuery(gql `
        query StationById($stationId: MongoID!) {
            stationById(_id: $stationId) {
                checkoutTime
                consoleOptions
                currentConsole
                currentGame
                name
                notes
                playerName
                status
            }
        }`, this.$props)

        const consoleReq = useQuery(gql`
        query ConsoleByIds($ids: [MongoID!]!, $sort: SortFindByIdsConsoleInput) {
            consoleByIds(_ids: $ids, sort: $sort) {
                _id
                checkoutWarning
                games {
                    count
                    name
                }
                name
            }
        }
        `, () => ({
            ids: stationReq.result.value?.stationById.consoleOptions,
            sort: '_ID_ASC'
        }))

        const station = computed(() => stationReq.result.value?.stationById ?? {})
        const consoleOptions = computed (() => consoleReq.result.value?.consoleByIds ?? [])
        return {
            stationReq,
            station,
            consoleReq,
            consoleOptions
        }
    },
    methods: {
        isLoading() {
            this.stationReq.isLoading || this.consoleReq.isLoading
        }
    },
    components: { LoadingAnimation }
}

</script>