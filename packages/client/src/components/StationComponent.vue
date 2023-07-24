<template>
    <div :class="'card mb-2 border-' + borderVarient">
        <div :class="'card-header text-bg-' + borderVarient">
            <span v-if="!isLoading()" >{{ station.name }}&nbsp;({{ stationStates.getDisplayName(station.status) }})</span>
            <span v-else class="placeholder-glow"><span class="placeholder col-2"></span></span>
        </div>
        <div class="card-body" v-if="station.status !== stationStates.NOT_AVAILABLE">
            <p>Console Options: 
                <span v-if="!isLoading() && consoleReq.result">{{ consoleOptions.map(x => x.name).join(", ") }}</span>
                <span v-else class="placeholder-glow"><span class="placeholder col-2"></span></span>
            </p>
            <p v-if="isCheckedOut()">Time since checkout: 
                <span v-if="timeSinceCheckout.value">{{ timeSinceCheckout.value }}</span>
                <span v-else class="placeholder-glow"><span class="placeholder col-2"></span></span>
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
        <ul class="list-group list-group-flush" v-if="station.notes">
            <li class="list-group-item">Notes: {{station.notes}}</li>
        </ul>
        <div class="card-footer text-body-secondary d-flex flex-wrap align-items-center">
            <div class="btn-toolbar" role="toolbar" aria-label="Toolbar with button groups">
                <div class="btn-group me-2" role="group" aria-label="First group">
                    <button class="btn btn-primary" @click="showCheckoutModal()"><i class="bi bi-box-arrow-up"></i> Checkout</button>
                    <button class="btn btn-danger" @click="checkinStation()"><i class="bi bi-box-arrow-in-down"></i> Checkin/Return</button>
                </div>
                <div class="btn-group me-2" role="group" aria-label="Second group">
                    <button class="btn btn-info" @click="showSetFieldsModal()"><i class="bi bi-pencil"></i> Set Fields</button>
                    <button class="btn btn-info" @click="toggleAvailability()"><i class="bi bi-toggle-off"></i> Toggle Availibility</button>
                </div>
            </div>
        </div>

        <StationCheckoutModal :station="station" :console-options="consoleOptions" ref="checkoutModal" />
    </div>
</template>

<script>
import StationCheckoutModal from './modals/StationCheckoutModal.vue'
import { computed, onMounted, ref } from 'vue'
import { useQuery, useMutation } from '@vue/apollo-composable'
import gql from 'graphql-tag'
import moment from 'moment'
import timeUtils from '../utils/timeUtils'
import stationStates from '../utils/stationStates'
import GlobalSettings from '../useables/GlobalSettings'

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
                        break
                    }
                }
                return tmp
            }
        }))

        const isSubmitting = ref(false)
        const { mutate: updateStation, onDone } = useMutation(gql`
        mutation StationUpdateById($id: MongoID!, $record: UpdateByIdStationInput!) {
            stationUpdateById(_id: $id, record: $record) {
                error {
                    message
                }
            }
        }`)

        onDone(() => {
            isSubmitting.value = false
        })

        const { getSetting } = GlobalSettings()
        const warnTime = getSetting('warnTime')
        const kickTime = getSetting('kickTime')
        const borderVarient = computed(() => {
            if(station.value.status === stationStates.NOT_AVAILABLE) {
                return 'secondary'
            } else if (station.value.status === stationStates.CHECKED_OUT) {
                const duration = moment.duration(moment().diff(moment(station.value.checkoutTime)))
                return 'primary'
            }
            return 'default'
        })

        return { 
            stationReq,
            station,
            consoleReq,
            consoleReqEnabled,
            consoleOptions,
            timeSinceCheckout,
            currentConsole,
            isSubmitting,
            updateStation,
            updateStationOnDone: onDone,
            checkoutModal,
            stationStates,
            warnTime,
            kickTime,
            borderVarient
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
            this.stationReq.loading || this.consoleReq.loading || this.isSubmitting.value
        },
        showCheckoutModal() {
            this.checkoutModal.show({
                popFields: true, 
                defaultTimeUpdateState: true, 
                defaultUpdateCustomTimeState: false, 
                stateToUpdateTo: stationStates.CHECKED_OUT
            })
        },
        showSetFieldsModal() {
            this.checkoutModal.show({
                popFields: true,
                title: 'Set Fields'
            })
        },
        checkinStation() {
            this.isSubmitting = true
            this.updateStation({
                id: this.stationId,
                record: {
                    playerName: '',
                    currentConsole: null,
                    currentGame: '',
                    checkoutTime: null,
                    status: stationStates.DEFAULT
                }
            })
        },
        toggleAvailability() {
            this.isSubmitting = true
            let newState = stationStates.DEFAULT
            if (this.station.status !== stationStates.NOT_AVAILABLE) {
                newState = stationStates.NOT_AVAILABLE
            } else {
                if (this.station.checkoutTime) {
                    newState = stationStates.CHECKED_OUT
                } else {
                    newState = stationStates.DEFAULT
                }
            }
            this.updateStation({
                id: this.stationId,
                record: {
                    status: newState
                }
            })
        },
        getFormattedTimeFromNow() {
            if (!this.isLoading() && this.station.checkoutTime) {
                this.timeSinceCheckout.value = timeUtils.formatDurationFormat(moment.duration(moment().diff(moment(this.station.checkoutTime))))
            } else {
                this.timeSinceCheckout.value = null
            }
        },
        isCheckedOut() {
            return this.station.status === stationStates.CHECKED_OUT
        }
    },
    components: { StationCheckoutModal }
}

</script>