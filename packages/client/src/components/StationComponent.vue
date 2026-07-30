<template>
    <div :class="'card mb-2 border-' + borderVariant">
        <div :class="'card-header text-bg-' + borderVariant">
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
        <ul class="list-group list-group-flush" v-if="station.notes || station.checkoutNotes">
            <li class="list-group-item text-primary-emphasis bg-primary-subtle" v-if="station.notes"><i class="bi bi-info-circle"></i> Notes: {{ station.notes }}</li>
            <li class="list-group-item text-primary-emphasis bg-primary-subtle" v-if="station.checkoutNotes"><i class="bi bi-info-circle"></i> Checkout Notes: {{ station.checkoutNotes }}</li>
        </ul>
        <div class="card-footer text-body-secondary">
            <div class="btn-toolbar d-flex flex-wrap gap-2" role="toolbar" aria-label="Toolbar with button groups">
                <div class="btn-group" role="group" aria-label="First group">
                    <button class="btn btn-primary" @click="showCheckoutModal()"><i class="bi bi-box-arrow-up"></i>
                        Checkout</button>
                    <button class="btn btn-danger" @click="showCheckinModal()"><i class="bi bi-box-arrow-in-down"></i>
                        Checkin/Return</button>
                </div>
                <div class="btn-group flex-wrap" role="group" aria-label="Second group">
                    <button class="btn btn-info" @click="showSetFieldsModal()"><i class="bi bi-pencil"></i> Set
                        Fields</button>
                    <button class="btn btn-info" @click="toggleAvailability()"><i class="bi bi-toggle-off"></i> Toggle
                        Availability</button>
                    <div class="btn-group">
                        <button class="btn btn-info dropdown-toggle" :id="'swapStation' + station._id" data-bs-toggle="dropdown" aria-haspopup="true" aria-expanded="false">
                            <i class="bi bi-arrow-left-right"></i> Swap Station
                        </button>
                        <div class="dropdown-menu">
                            <a class="dropdown-item" v-for="otherStation in swappableStations" @click="swapWithStation(otherStation)">{{otherStation.name}}</a>
                        </div>
                    </div>
                </div>
            </div>
        </div>
        <StationCheckoutModal :station="station" :console-options="consoleOptions" ref="checkoutModal" />
        <StationCheckinModal :station="station" :console-options="consoleOptions" ref="checkinModal"/>
    </div>
</template>

<script setup>
import StationCheckoutModal from './modals/StationCheckoutModal.vue'
import StationCheckinModal from './modals/StationCheckinModal.vue'
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
    stationId: String,
    fullCurrentStationList: Array,
})

const swappableStations = computed(() => {
    let swapList = props.fullCurrentStationList
        .filter(otherStation => otherStation._id !== props.stationId) // filter out ourselves
    if (station.value)
        swapList = swapList
            .filter(otherStation =>
                !station.value.currentConsole ||
                (otherStation.consoleOptions && otherStation.consoleOptions.includes(station.value.currentConsole))
            )
            .filter(otherStation =>
                !otherStation.currentConsole ||
                (station.value.consoleOptions && station.value.consoleOptions.includes(otherStation.currentConsole))
            ) //Ensure that both stations can take the compatible
    return swapList
})

const isLoading = useQueryLoading()

const checkoutModal = ref(null)
const checkinModal = ref(null)

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
        checkoutNotes
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
        checkinWarning
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
    ids: stationReq.result.value?.stationById.consoleOptions ?? [],
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
    const curConsole = consoleOptions.value.find(c => c._id === station.value.currentConsole)
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
            checkoutNotes
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
            checkinWarning
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
const borderVariant = ref('default')

function showCheckoutModal() {
    checkoutModal.value.show({
        popFields: true,
        defaultTimeUpdateState: true,
        resetExtrasCount: true,
        defaultUpdateCustomTimeState: false,
        stateToUpdateTo: stationStates.CHECKED_OUT
    })
}

function showCheckinModal() {
    checkinModal.value.show()
}

function showSetFieldsModal() {
    checkoutModal.value.show({
        popFields: true,
        title: 'Set Fields'
    })
}

function toggleAvailability() {
    isSubmitting.value = true
    let newState
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
        id: station.value._id,
        record: {
            status: newState
        }
    })
}
function updateTick() {
    getFormattedTimeFromNow()
    updateBorderVariant()
}
function getFormattedTimeFromNow() {
    if (!isLoading.value && station.value.checkoutTime !== null) {
        timeSinceCheckout.value = timeUtils.formatDurationFormat(moment.duration(moment().diff(moment(station.value.checkoutTime))))
    } else {
        timeSinceCheckout.value = ''
    }
}
function updateBorderVariant() {
    if (station.value !== null) {
        if (station.value.status === stationStates.NOT_AVAILABLE) {
            borderVariant.value = 'secondary'
        } else if (station.value.status === stationStates.CHECKED_OUT) {
            const duration = moment.duration(moment().diff(moment(station.value.checkoutTime))).asMilliseconds()
            const kickMillis = moment.duration(kickTime.value.value).asMilliseconds()
            const warnMillis = moment.duration(warnTime.value.value).asMilliseconds()
            if (duration >= kickMillis) {
                if (borderVariant.value !== 'danger') {
                    toast.error(station.value.name + ' needs to be kicked')
                }
                borderVariant.value = 'danger'
            } else if (duration >= warnMillis) {
                if (borderVariant.value !== 'warning') {
                    toast.warning(station.value.name + ' has ' + moment.duration(moment().diff(moment(station.value.checkoutTime).add(kickMillis, 'millisecond'))).humanize() + ' left')
                }
                borderVariant.value = 'warning'
            } else {
                borderVariant.value = 'success'
            }
        } else {
            borderVariant.value = 'default'
        }
    } else {
        borderVariant.value = 'default'
    }
}

function isCheckedOut() {
    return station.value.status === stationStates.CHECKED_OUT
}

async function swapWithStation(otherStation) {
    const tmp = structuredClone(otherStation)
    const otherUpdate = {
        checkoutNotes: station.value.checkoutNotes,
        checkoutTime: station.value.checkoutTime,
        currentConsole: station.value.currentConsole,
        currentExtras: station.value.currentExtras.map(({__typename, ...keepAttrs}) => keepAttrs), //Removing metadata to match update query
        currentGame: station.value.currentGame,
        playerName: station.value.playerName,
        status: station.value.status === stationStates.NOT_AVAILABLE ? stationStates.DEFAULT : station.value.status
    }
    const selfUpdate = {
        checkoutNotes: tmp.checkoutNotes,
        checkoutTime: tmp.checkoutTime,
        currentConsole: tmp.currentConsole,
        currentExtras: tmp.currentExtras.map(({__typename, ...keepAttrs}) => keepAttrs), //Removing metadata to match update query
        currentGame: tmp.currentGame,
        playerName: tmp.playerName,
        status: tmp.status === stationStates.NOT_AVAILABLE ? stationStates.DEFAULT : tmp.status
    }
    await updateStation({
        id: station.value._id,
        record: selfUpdate
    })
    await updateStation({
        id: tmp._id,
        record: otherUpdate
    })

}

onMounted(() => {
    updateTick()
    setInterval(updateTick, 1000)
})

onUnmounted(() => {
    clearInterval(updateTick)
})

</script>