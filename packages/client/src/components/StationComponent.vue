<template>
    <div class="card mb-2">
        <div class="card-header">
            <span v-if="!isLoading()" >{{ station.name }}&nbsp;({{ station.status }})</span>
            <span v-else class="placeholder col-2"></span>
        </div>
        <div class="card-body">
            <p>Console Options: 
                <span v-if="!isLoading() && consoleReq.result">{{ consoleOptions.map(x => x.name).join(", ") }}</span>
                <span v-else class="placeholder col-2"></span>
            </p>
            <p>Time since checkout: 
                <span v-if="timeSinceCheckout.value">{{ timeSinceCheckout.value }}</span>
                <span v-else class="placeholder col-2"></span>
            </p>
            <form>
                <div class="row g-2">
                    <div class="col-12 col-md-4">
                        <label :for="'playerName' + stationId">Player Name</label>
                        <input type="text" class="form-control" :id="'playerName' + stationId"
                            :value="station.playerName" disabled>
                    </div>
                    <div class="col-12 col-md-4">
                        <label :for="'currentConsole' + stationId">Current Console</label>
                        <input type="text" class="form-control" :id="'currentConsole' + stationId"
                            :value="currentConsole" disabled>
                    </div>
                    <div class="col-12 col-md-4">
                        <label :for="'currentGame' + stationId">Current Game</label>
                        <input type="text" class="form-control" :id="'currentGame' + stationId"
                            :value="station.currentGame" disabled>
                    </div>
                </div>
            </form>
        </div>
        <button class="btn btn-primary" @click="showCheckoutModal()">Checkout</button>
        <StationCheckoutModal :station="station" :console-options="consoleOptions" ref="checkoutModal" />
    </div>
</template>

<script>
import StationCheckoutModal from './modals/StationCheckoutModal.vue'
import { computed, onMounted, ref } from 'vue'
import { useQuery } from '@vue/apollo-composable'
import gql from 'graphql-tag'
import moment from 'moment'
import timeUtils from '../utils/timeUtils'

export default {
    props: {
        stationId: String
    },
    setup(props) {
        const checkoutModal = ref(null)

        const stationReq = useQuery(gql`
        query StationById($stationId: MongoID!) {
            stationById(_id: $stationId) {
                _id
                checkoutTime
                consoleOptions
                currentConsole
                currentGame
                name
                notes
                playerName
                status
            }
        }`, props)

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
        const timeSinceCheckout = ref({})
        const consoleOptions = computed(() => consoleReq.result.value?.consoleByIds ?? [])

        const currentConsole = computed(() => {
            if (consoleOptions.value && consoleOptions.value.length > 0)
                for(let c of consoleOptions.value) {
                    if (c._id === station.value.currentConsole)
                        return c.name
                }
            return ''
        })

        onMounted(() => {
            if (stationReq.result.value?.stationById) { 
                consoleReqEnabled.value = true
            }
        })

        stationReq.onResult(() => {
            consoleReqEnabled.value = true
            // this.getFormattedTimeFromNow()
        })

        stationReq.subscribeToMore(() => ({
            document: gql`
            subscription StationUpdateById($recordId: MongoID!) {
                stationUpdateById(recordId: $recordId) {
                    _id
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
                recordId: props.stationId
            },
            updateQuery: (previousResult, { subscriptionData }) => {
                return { stationById: subscriptionData.data.stationUpdateById }
            }
        }))

        consoleReq.subscribeToMore(() => ({
            document: gql`
            subscription ConsoleUpdateByIds($recordIds: [MongoID]!) {
                consoleUpdateByIds(recordIds: $recordIds) {
                    _id
                    checkoutWarning
                    games {
                        count
                        name
                    }
                    name
                }
            }`,
            variables: {
                recordIds: consoleOptions.value?.map(x => x._id)
            },
            updateQuery: (previousResult, { subscriptionData }) => {
                const tmp = [...previousResult]
                for (let i in tmp) {
                    if (tmp[i]._id == subscriptionData.data.consoleUpdateByIds._id) {
                        tmp[i] = subscriptionData.data.consoleUpdateByIds
                    }
                }
                return tmp
            }
        }))

        return { 
            stationReq,
            station,
            consoleReq,
            consoleReqEnabled,
            consoleOptions,
            timeSinceCheckout,
            currentConsole,
            checkoutModal 
        }
    },
    created() {
        this.getFormattedTimeFromNow()
        setInterval(this.getFormattedTimeFromNow, 1000)
    },
    unmounted() {
        clearInterval(this.getFormattedTimeFromNow)
    },
    methods: {
        isLoading() {
            this.stationReq.loading || this.consoleReq.loading
        },
        showCheckoutModal() {
            this.checkoutModal.show(true, true)
        },
        getFormattedTimeFromNow() {
            if (!this.isLoading() && this.station.checkoutTime) {
                this.timeSinceCheckout.value = timeUtils.formatDurationFormat(moment.duration(moment().diff(moment(this.station.checkoutTime))))
            } else {
                this.timeSinceCheckout.value = null
            }
        }
    },
    components: { StationCheckoutModal }
}

</script>