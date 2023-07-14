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
            <div class="card-body">
                <p>{{ stationId }}</p>
                <p>{{ station }}</p>
                <form>
                    <div class="row g-2">
                        <div class="col-12 col-md-4">
                            <label :for="'playerName' + stationId">Player Name</label>
                            <input type="text" class="form-control" :id="'playerName' + stationId" :value="station.playerName" disabled>
                        </div>
                        <div class="col-12 col-md-4">
                            <label :for="'currentConsole' + stationId">Current Console</label>
                            <input type="text" class="form-control" :id="'currentConsole' + stationId" :value="station.currentConsole" disabled>
                        </div>
                        <div class="col-12 col-md-4">
                            <label :for="'currentGame' + stationId">Current Game</label>
                            <input type="text" class="form-control" :id="'currentGame' + stationId" :value="station.currentGame" disabled>
                        </div>
                    </div>
                </form>
            </div>
            <button class="btn btn-primary" @click="showCheckoutModal()">Checkout</button>
            <StationCheckoutModal :station="station" ref="checkoutModal"/>
        </template>
    </div>
</template>

<script>
import LoadingAnimation from './LoadingAnimation.vue'
import StationCheckoutModal from './modals/StationCheckoutModal.vue'
import { computed, ref } from 'vue'
import { useQuery } from '@vue/apollo-composable'
import gql from 'graphql-tag'

export default {
    props: {
        stationId: String
    },
    setup() {
        const checkoutModal = ref(null)

        return { checkoutModal }
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

        const consoleReqEnabled = ref(false)

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
        }), () => ({
            enabled: consoleReqEnabled.value && !stationReq.isLoading
        }))

        const station = computed(() => stationReq.result.value?.stationById ?? {})
        const consoleOptions = computed (() => consoleReq.result.value?.consoleByIds ?? [])

        stationReq.onResult(() => {
            consoleReqEnabled.value = true
        })

        stationReq.subscribeToMore(() => ({
            document: gql`
            subscription StationUpdateById($recordId: MongoID!) {
                stationUpdateById(recordId: $recordId) {
                    checkoutTime
                    consoleOptions
                    currentConsole
                    currentGame
                    name
                    notes
                    playerName
                    status
                }
            }`,
            variables: {
                recordId: this.$props.stationId
            },
            updateQuery: (previousResult, { subscriptionData }) => {
                return { stationById: subscriptionData.data.stationUpdateById }
            }
        }))
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
        },
        showCheckoutModal() {
            this.checkoutModal.show()
        }
    },
    components: { LoadingAnimation, StationCheckoutModal }
}

</script>