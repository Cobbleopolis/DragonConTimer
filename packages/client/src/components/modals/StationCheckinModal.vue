<template>
    <div class="modal fade modal-lg" ref="modalRoot">
        <div class="modal-dialog">
            <div class="modal-content">
                <div class="modal-header">
                    <h5 class="modal-title">Check In/Return: {{station.name}} <span v-if="currentConsole">({{ currentConsole.name }})</span></h5>
                    <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                </div>
                <div class="modal-body">
                    <div v-if="currentConsole && currentConsole.checkinWarning" class="alert alert-warning" role="alert">
                        <i class="bi bi-exclamation-triangle"></i> {{ currentConsole.checkinWarning }}
                    </div>
                    <h5>Items to return:</h5>
                    <dl class="row">
                        <dt class="col-sm-3" v-if="shouldDisplayName">Name</dt>
                        <dd class="col-sm-9" v-if="shouldDisplayName">{{ station.playerName }}</dd>

                        <dt class="col-sm-3" v-if="shouldDisplayGame">Game</dt>
                        <dd class="col-sm-9" v-if="shouldDisplayGame">{{ station.currentGame }}</dd>

                        <dt class="col-sm-3" v-if="shouldDisplayExtras">Extras</dt>
                        <dd class="col-sm-9" v-if="shouldDisplayExtras">
                            <ul class="list-unstyled">
                                <li v-for="extra in currentDisplayExtras" :key="extra.extraId">{{ extra.name }} x{{ extra.count }}</li>
                            </ul>
                        </dd>
                    </dl>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" data-bs-dismiss="modal" :disabled="isSubmitting">Close</button>
                    <button type="button" class="btn btn-danger" @click="checkinStation()" :disabled="isSubmitting"><i class="bi bi-box-arrow-in-down"></i> Checkin/Return</button>
                </div>
            </div>
        </div>
    </div>
</template>
<script setup>
import { onMounted, ref, computed } from 'vue'
import { useToast } from 'vue-toast-notification'
import gql from 'graphql-tag'
import { useMutation } from '@vue/apollo-composable'
import * as bootstrap from 'bootstrap'
import stationStates from '../../utils/stationStates'
const toast = useToast()

const props = defineProps({
    station: Object,
    consoleOptions: Object
})

let modalRoot = ref(null)
let modalObj = null

onMounted(() => {
    modalObj = new bootstrap.Modal(modalRoot.value)
})

const currentConsole = computed(() => props.consoleOptions.find(c => c._id == props.station.currentConsole))
const currentDisplayExtras = computed(() => {
    if (props.station.currentExtras) {
        return props.station.currentExtras
            .filter(e => e.count > 0)
            .map(e => {
                let consoleExtra = currentConsole.value?.extras ? currentConsole.value?.extras.find(ce => ce._id === e.extraId) : 'Unknown Extra'
                return {
                    ...e, 
                    name: currentConsole.value && consoleExtra ? consoleExtra.name : 'Unknown Extra'
                }
            })
    } else {
        return []
    }
})


const shouldDisplayName = computed(() => props.station.playerName || false)
const shouldDisplayGame = computed(() => props.station.currentGame || false)
const shouldDisplayExtras = computed(() => currentDisplayExtras.value.length > 0)

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
    _hide()
})

onError((error) => {
    isSubmitting.value = false
    toast.error('Error updating the station')
    console.error(error)
})


function checkinStation() {
    isSubmitting.value = true
    updateStation({
        id: props.station._id,
        record: {
            playerName: '',
            currentConsole: null,
            currentExtras: [],
            currentGame: '',
            checkoutTime: null,
            status: stationStates.DEFAULT,
            checkoutNotes: ''
        }
    })
}


function _show() {
    modalObj.show()
}

function _hide() {
    modalObj.hide()
}

function _toggle() {
    modalObj.toggle()
}

defineExpose({ 
    show: _show,
    hide: _hide,
    toggle: _toggle
})
</script>