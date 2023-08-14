<template>
    <div class="modal fade modal-lg" tabindex="-1" :id="'checkoutModal' + station._id" ref="modalRoot">
        <div class="modal-dialog">
            <div class="modal-content">
                <div class="modal-header">
                    <h5 class="modal-title">{{title}}: {{station.name}}</h5>
                    <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                </div>
                <div class="modal-body">
                    <div v-if="currentSelectedConsole && currentSelectedConsole?.checkoutWarning" class="alert alert-warning" role="alert">
                        <i class="bi bi-exclamation-triangle"></i> {{ currentSelectedConsole.checkoutWarning }}
                    </div>
                    <form>
                        <fieldset>
                            <legend>Basic Info</legend>
                            <div class="mb-3">
                                <label :id="'playerNameLabel' + station._id" class="form-label" :for="'playerNameInput' + station._id">Player Name</label>
                                <input type="text" class="form-control" :id="'playerNameInput' + station._id" name="playerName" :aria-describedby="'playerNameHelp' + station._id" placeholder="John Doe" v-model="formCurrentPlayerName"/>
                                <div :id="'playerNameHelp' + station._id" class="form-text">The name of the person checking out the station</div>
                            </div>
                            <div class="mb-3">
                                <label :id="'consoleOptionLabel' + station._id" class="form-label" :for="'consoleOptionInput' + station._id">Console</label>
                                <select class="form-select" :id="'consoleOptionInput' + station._id" :aria-labelledby="'consoleOptionLabel' + station._id" :aria-describedby="'consoleOptionHelp' + station._id" v-model="formCurrentConsole" @change="updateCurrentConsoleObj()">
                                    <option disabled hidden :value="''" :selected="formCurrentConsole == ''">Select Console</option>
                                    <option v-for="console in consoleOptions" :value="console._id" :key="console._id" :selected="formCurrentConsole == console._id">{{ console.name }}</option>
                                </select>
                                <div :id="'consoleOptionHelp' + station._id" class="form-text">The console they're going to play</div>
                            </div>
                            <div class="mb-3">
                                <label :id="'gameOptionLabel' + station._id" class="form-label" :for="'gameOptionInput' + station._id">Game</label>
                                <div class="input-group">
                                    <input type="text" class="form-control" :id="'gameOptionInput' + station._id" :list="'gameOptionsDatalist' + station._id" :aria-labelledby="'gameOptionLabel' + station._id" :aria-describedby="'gameOptionHelp' + station._id" autocomplete="off" placeholder="Game" v-model="formCurrentGame">
                                    <button class="btn btn-outline-danger" type="button" @click="formCurrentGame = ''"><i class="bi bi-x"></i></button>
                                </div>
                                <datalist :id="'gameOptionsDatalist' + station._id">
                                    <option v-for="game in currentSelectedConsole?.games ?? []" :key="game.name">{{ game.name }}</option>
                                </datalist>
                                <div id="gameOptionHelp" class="form-text">
                                    The game they're going to play. Click/double click on the empty text box to see all options.<br>
                                    <i class="bi bi-exclamation-triangle"></i> PLEASE make sure to try and use autocomplete options as much as possible. Otherwise availibility might not work correctly.
                                </div>
                            </div>
                        </fieldset>
                        <fieldset class="mb-3" v-if="currentSelectedConsole && currentSelectedConsole.extras.length > 0">
                            <legend>Extras</legend>
                            <div class="d-flex flex-wrap flex-column flex-md-row gap-2" v-if="currentSelectedConsole" >
                                <div v-for="extra in formCurrentExtras" :key="extra._id">
                                    <label>{{ extra.name }}</label>
                                    <input class="form-control" type="number" min="0" v-model="extra.count">
                                </div>
                            </div>
                        </fieldset>
                        <fieldset class="mb-3">
                            <legend>Checkout Time</legend>
                            <div class="form-check">
                                <input class="form-check-input" type="checkbox" value="" id="updateTimeInput" v-model="updateTime">
                                <label class="form-check-label" id="updateTimeLabel" for="updateTimeInput">Update Checkout Time</label>
                            </div>
                            <div v-if="updateTime">
                                <div class="input-group">
                                    <div class="input-group-text">
                                        <div class="form-check">
                                            <input class="form-check-input" type="checkbox" value="" id="useCustomTimeInput" v-model="useCustomTime">
                                            <label class="form-check-label" id="useCustomTimeLabel" for="useCustomTimeInput">Custom Time</label> 
                                        </div>   
                                    </div>
                                    <input type="datetime-local" class="form-control" aria-label="Custom Time" :disabled="!useCustomTime" v-model="customTime">
                                    <button class="btn btn-outline-secondary" type="button" id="customTimeNowButton" @click="setCustomTime(moment())" :disabled="!useCustomTime">Now</button>
                                </div>
                            </div>
                        </fieldset>
                        <fieldset class="mb-3">
                            <legend>Other</legend>
                            <label id="stationNotesLabel" class="form-label" for="stationNotesInput">Station Notes</label>
                            <textarea rows="1" class="form-control" id="stationNotesInput" name="stationNotes" aria-describedby="stationNotesHelp" placeholder="Lorem ipsum..." v-model="formCurrentStationNotes"></textarea>
                            <div id="stationNotesHelp" class="form-text">Some notes we need to know</div>
                        </fieldset>
                    </form>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" data-bs-dismiss="modal" :disabled="isSubmitting">Close</button>
                    <button type="button" class="btn btn-primary" @click="submitForm()" :disabled="isSubmitting">
                        <span v-if="isSubmitting" class="spinner-grow spinner-grow-sm" role="status" aria-hidden="true"></span>
                        Save changes
                    </button>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup>
import { onMounted, ref } from 'vue'
import { useMutation } from '@vue/apollo-composable'
import gql from 'graphql-tag'
import * as bootstrap from 'bootstrap'
import moment from 'moment'

import {useToast} from 'vue-toast-notification'
const toast = useToast()

const props = defineProps({
    station: Object,
    consoleOptions: Array
})

let modalRoot = ref(null)
let modalObj = null

const title = ref('Checkout Station')

const formCurrentPlayerName = ref('')

const formCurrentConsole = ref('')
const currentSelectedConsole = ref(null)

const formCurrentGame = ref('')
const formCurrentStationNotes = ref('')

const formCurrentExtras = ref([])

const isSubmitting = ref(false)
const updateTime = ref(false)
const useCustomTime = ref(false)
const customTime = ref('')

let updateState = null

onMounted(() => {
    modalObj = new bootstrap.Modal(modalRoot.value)
})

function _show(options) {
    if(options.popFields) {
        populateFields()
    }
    title.value = options.title ?? 'Checkout Station'
    modalObj.show()
    updateTime.value = options.defaultTimeUpdateState ?? false
    useCustomTime.value = options.defaultUpdateCustomTimeState ?? false
    if (options.resetExtrasCount) {
        formCurrentExtras.value.forEach(e => e.count = 0)
    }
    if (!formCurrentGame.value && currentSelectedConsole.value && currentSelectedConsole.value.games.length === 1) {
        formCurrentGame.value = currentSelectedConsole.value.games[0].name
    }

    updateState = options.stateToUpdateTo
}

function _hide() {
    modalObj.hide()
}

function _toggle(popFields) {
    modalObj.toggle()
    if(popFields && isVisible()) {
        populateFields()
    }
}

function populateFields() {
    formCurrentPlayerName.value = props.station?.playerName ?? ''
    formCurrentConsole.value = props.station?.currentConsole ?? ''
    if (props.consoleOptions.length === 1) {
        formCurrentConsole.value = props.consoleOptions[0]._id
    }
    formCurrentExtras.value = props.station?.currentExtras ?? []
    updateCurrentConsoleObj()
    formCurrentGame.value = props.station?.currentGame ?? ''
    formCurrentStationNotes.value = props.station?.notes ?? ''
    setCustomTime(moment(props.station?.checkoutTime) ?? moment())
}

function setCustomTime(momentObj) {
    customTime.value = momentObj.local().format('YYYY-MM-DD HH:mm:ss')
}

function updateCurrentConsoleObj() {
    formCurrentGame.value = ''
    for(const c of props.consoleOptions) {
        if (c._id == formCurrentConsole.value) {
            currentSelectedConsole.value = c
            const extras = c.extras.map(e => {
                let count = 0
                for (let ce of formCurrentExtras.value) {
                    if (e._id === ce.extraId) {
                        count = ce.count
                    }
                }
                return { extraId: e._id, name: e.name, count: count }
            })
            formCurrentExtras.value = extras
            if (!formCurrentGame.value && c.games.length === 1) {
                formCurrentGame.value = c.games[0].name
            }
            return
        }
    }
    currentSelectedConsole.value = null
}

function isVisible() {
    return modalRoot.value && (modalRoot.value.hasClass('in') || modalRoot.value.hasClass('show'))
}

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

function submitForm() {
    isSubmitting.value = true

    let updateRecord = {
        playerName: formCurrentPlayerName.value,
        currentConsole: formCurrentConsole.value,
        currentGame: formCurrentGame.value,
        // eslint-disable-next-line no-unused-vars
        currentExtras: formCurrentExtras.value.map(({__typename, name, ...gameObj}) => gameObj),
        notes: formCurrentStationNotes.value
    }

    if(updateTime.value) {
        if(useCustomTime.value) {
            updateRecord['checkoutTime'] = customTime.value
        } else {
            updateRecord['checkoutTime'] = moment()
        }
    }

    if(updateState) {
        updateRecord['status'] = updateState
    }
        
    updateStation({
        id: props.station._id,
        record: updateRecord
    })
}

defineExpose({ 
    show: _show,
    hide: _hide,
    toggle: _toggle
})
</script>