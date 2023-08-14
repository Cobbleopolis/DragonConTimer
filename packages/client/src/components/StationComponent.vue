<template>
    <div :class="'card mb-2 border-' + borderVarient">
        <div :class="'card-header text-bg-' + borderVarient">
            <span v-if="!isLoading">{{ station.name }}&nbsp;({{ stationStates.getDisplayName(station.status) }})</span>
            <span v-else class="placeholder-glow"><span class="placeholder col-2"></span></span>
        </div>
        <div class="card-body" v-if="station.status !== stationStates.NOT_AVAILABLE">
            <div class="d-flex flex-column flex-md-row mb-2">
                <div class="d-flex flex-column flex-grow-1 me-auto">
                    <span>Console Options:
                        <span v-if="!isLoading && consoleReq.result">{{ consoleOptions.map(x => x.name).join(", ") }}</span>
                        <span v-else class="placeholder-glow"><span class="placeholder col-2"></span></span>
                    </span>
                    <span v-if="isCheckedOut()">Time since checkout:
                        <span v-if="timeSinceCheckout">{{ timeSinceCheckout }}</span>
                        <span v-else class="placeholder-glow"><span class="placeholder col-2"></span></span>
                    </span>
                </div>
                <div v-if="isCheckedOut() && currentDisplayExtras.length > 0" class="d-flex flex-column">
                    <span>Current Extras:</span>
                    <span v-for="extra in currentDisplayExtras" :key="extra.extraId">{{ extra.name }}&nbsp;x{{ extra.count }}</span>
                </div>
            </div>
            <form>
                <div class="row g-2">
                    <div class="col-12 col-md-4">
                        <label :for="'playerName' + stationId">Player Name</label>
                        <input type="text" class="form-control" :id="'playerName' + stationId" :value="station.playerName"
                            disabled>
                    </div>
                    <div class="col-12 col-md-4">
                        <label :for="'currentConsole' + stationId">Current Console</label>
                        <input type="text" class="form-control" :id="'currentConsole' + stationId" :value="currentConsole"
                            disabled>
                    </div>
                    <div class="col-12 col-md-4">
                        <label :for="'currentGame' + stationId">Current Game</label>
                        <input type="text" class="form-control" :id="'currentGame' + stationId" :value="station.currentGame"
                            disabled>
                    </div>
                </div>
            </form>
        </div>
        <ul class="list-group list-group-flush" v-if="station.notes">
            <li class="list-group-item text-primary-emphasis bg-primary-subtle">Notes: {{ station.notes }}</li>
        </ul>
        <div class="card-footer text-body-secondary">
            <div class="btn-toolbar d-flex flex-wrap gap-2" role="toolbar" aria-label="Toolbar with button groups">
                <div class="btn-group" role="group" aria-label="First group">
                    <button class="btn btn-primary" @click="showCheckoutModal()"><i class="bi bi-box-arrow-up"></i>
                        Checkout</button>
                    <button class="btn btn-danger" @click="checkinStation()"><i class="bi bi-box-arrow-in-down"></i>
                        Checkin/Return</button>
                </div>
                <div class="btn-group" role="group" aria-label="Second group">
                    <button class="btn btn-info" @click="showSetFieldsModal()"><i class="bi bi-pencil"></i> Set
                        Fields</button>
                    <button class="btn btn-info" @click="toggleAvailability()"><i class="bi bi-toggle-off"></i> Toggle
                        Availability</button>
                </div>
            </div>
        </div>
        <StationCheckoutModal :station="station" :console-options="consoleOptions" ref="checkoutModal" />
    </div>
</template>

<script setup>
import StationCheckoutModal from './modals/StationCheckoutModal.vue'
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useQuery, useMutation, useQueryLoading } from '@vue/apollo-composable'
import gql from 'graphql-tag'
import moment from 'moment'
import timeUtils from '../utils/timeUtils'
import stationStates from '../utils/stationStates'
import UseGlobalSettings from '../useables/UseGlobalSettings'
import UseUpdateQuery from '../useables/UseUpdateQuery'

import {useToast} from 'vue-toast-notification'
const toast = useToast()

const props = defineProps({
    stationId: String
})

const isLoading = useQueryLoading()

const checkoutModal = ref(null)

const stationReq = useQuery(gql`
query StationById($stationId: MongoID!) {
    stationById(_id: $stationId) {
        _id
        checkoutTime
        consoleOptions
        currentConsole
        currentGame
        currentExtras {
            count
            extraId
        }
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
        extras {
            _id
            count
            name
        }
        name
    }
}`, () => ({
    ids: stationReq.result.value?.stationById.consoleOptions,
    sort: '_ID_ASC'
}), () => ({
    enabled: consoleReqEnabled.value && !stationReq.isLoading
}))

const station = computed(() => stationReq.result.value?.stationById ?? {})
const timeSinceCheckout = ref('')
const consoleOptions = computed(() => consoleReq.result.value?.consoleByIds ?? [])
const currentDisplayExtras = computed(() => {
    if (!consoleOptions.value || !station.value || !station.value.currentConsole) {
        return []
    }
    const curConsole = consoleOptions.value.find(c => c._id == station.value.currentConsole)
    if (!curConsole)
        return []
    return station.value.currentExtras
        .filter(e => e.count > 0)
        .map(e => {
            let consoleExtra = curConsole.extras.find(ce => ce._id === e.extraId)
            return {
                ...e, 
                name: consoleExtra ? consoleExtra.name : 'Unknown Extra'
            }
        })
})

const currentConsole = computed(() => {
    if (consoleOptions.value && consoleOptions.value.length > 0)
        for (let c of consoleOptions.value) {
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
            currentExtras {
                count
                extraId
            }
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
    updateQuery: UseUpdateQuery.standardUpdateUpdateQuery('stationById', 'stationUpdateById')
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
            extras {
                _id
                count
                name
            }
            name
        }
    }`,
    variables: {
        recordIds: consoleOptions.value?.map(x => x._id)
    },
    updateQuery: UseUpdateQuery.standardCollectionUpdateUpdateQuery('consoleByIds', 'consoleUpdateByIds')
}))

const isSubmitting = ref(false)
const { mutate: updateStation, onDone, onError } = useMutation(gql`
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

onError((error) => {
    isSubmitting.value = false
    toast.error('Error updating the station')
    console.error(error)
})

const { getSetting } = UseGlobalSettings()
const warnTime = getSetting('warnTime')
const kickTime = getSetting('kickTime')
const borderVarient = ref('default')

function showCheckoutModal() {
    checkoutModal.value.show({
        popFields: true,
        defaultTimeUpdateState: true,
        resetExtrasCount: true,
        defaultUpdateCustomTimeState: false,
        stateToUpdateTo: stationStates.CHECKED_OUT
    })
}
function showSetFieldsModal() {
    checkoutModal.value.show({
        popFields: true,
        title: 'Set Fields'
    })
}
function checkinStation() {
    isSubmitting.value = true
    updateStation({
        id: props.stationId,
        record: {
            playerName: '',
            currentConsole: null,
            currentExtras: [],
            currentGame: '',
            checkoutTime: null,
            status: stationStates.DEFAULT
        }
    })
}
function toggleAvailability() {
    isSubmitting.value = true
    let newState = stationStates.DEFAULT
    if (station.value.status !== stationStates.NOT_AVAILABLE) {
        newState = stationStates.NOT_AVAILABLE
    } else {
        if (station.value.checkoutTime) {
            newState = stationStates.CHECKED_OUT
        } else {
            newState = stationStates.DEFAULT
        }
    }
    updateStation({
        id: props.stationId,
        record: {
            status: newState
        }
    })
}
function updateTick() {
    getFormattedTimeFromNow()
    updateBorderVarient()
}
function getFormattedTimeFromNow() {
    if (!isLoading.value && station.value.checkoutTime !== null) {
        timeSinceCheckout.value = timeUtils.formatDurationFormat(moment.duration(moment().diff(moment(station.value.checkoutTime))))
    } else {
        timeSinceCheckout.value = ''
    }
}
function updateBorderVarient() {
    if (station.value !== null) {
        if (station.value.status === stationStates.NOT_AVAILABLE) {
            borderVarient.value = 'secondary'
        } else if (station.value.status === stationStates.CHECKED_OUT) {
            const duration = moment.duration(moment().diff(moment(station.value.checkoutTime))).asMilliseconds()
            const kickMillis = moment.duration(kickTime.value.value).asMilliseconds()
            const warnMillis = moment.duration(warnTime.value.value).asMilliseconds()
            if (duration >= kickMillis) {
                if (borderVarient.value != 'danger') {
                    toast.error(station.value.name + ' needs to be kicked')
                }
                borderVarient.value = 'danger'
            } else if (duration >= warnMillis) {
                if (borderVarient.value != 'warning') {
                    toast.warning(station.value.name + ' has ' + moment.duration(moment().diff(moment(station.value.checkoutTime).add(kickMillis, 'millisecond'))).humanize() + ' left')
                }
                borderVarient.value = 'warning'
            } else {
                borderVarient.value = 'success'
            }
        } else {
            borderVarient.value = 'default'
        }
    } else {
        borderVarient.value = 'default'
    }
}

function isCheckedOut() {
    return station.value.status === stationStates.CHECKED_OUT
}

onMounted(() => {
    updateTick()
    setInterval(updateTick, 1000)  
})

onUnmounted(() => {
    clearInterval(updateTick)
})

</script>