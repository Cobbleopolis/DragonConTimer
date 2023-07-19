<template>
    <div class="modal fade modal-lg" tabindex="-1" :id="'checkoutModal' + station._id" ref="modalRoot">
        <div class="modal-dialog">
            <div class="modal-content">
                <div class="modal-header">
                    <h5 class="modal-title">{{title}}: {{station.name}}</h5>
                    <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                </div>
                <div class="modal-body">
                    <div v-if="currentSelectedConsole && currentSelectedConsole?.checkoutWarning" class="alert alert-info" role="alert">
                        <i class="bi bi-info-circle"></i> {{ currentSelectedConsole.checkoutWarning }}
                    </div>
                    <form>
                        <div class="mb-3">
                            <label id="playerNameLabel" class="form-label" for="playerNameInput">Player Name</label>
                            <input type="text" class="form-control" id="playerNameInput" name="playerName" aria-describedby="playerNameHelp" placeholder="John Doe" v-model="currentPlayerName"/>
                            <div id="playerNameHelp" class="form-text">The name of the person checking out the station</div>
                        </div>
                        <div class="mb-3">
                            <label id="consoleOptionLabel" class="form-label" for="consoleOptionInput">Console</label>
                            <select class="form-select" id="consoleOptionInput" aria-labelledby="consoleOptionLabel" aria-describedby="consoleOptionHelp" v-model="currentConsole" @change="updateCurrentConsoleObj()">
                                <option disabled hidden :value="''" :selected="currentConsole == ''">Select Console</option>
                                <option v-for="console in consoleOptions" :value="console._id" :key="console._id" :selected="currentConsole == console._id || consoleOptions.length === 1">{{ console.name }}</option>
                            </select>
                            <div id="consoleOptionHelp" class="form-text">The console they're going to play</div>
                        </div>
                        <div class="mb-3">
                            <label id="gameOptionLabel" class="form-label" for="gameOptionInput">Game</label>
                            <!-- <select class="form-select" id="gameOptionInput" aria-labelledby="gameOptionLabel" aria-describedby="gameOptionHelp" v-model="currentGame">
                                <option disabled hidden :value="''" :selected="currentGame == ''"> Select Game</option>
                                <option v-for="game in currentSelectedConsole?.games ?? []" :value="game.name" :key="game.name" :selected="currentGame.value == game.name || currentSelectedConsole.length === 1">{{ game.name }}</option>
                            </select> -->
                            <div class="input-group">
                                <input type="text" class="form-control" id="gameOptionInput" list="gameOptionsDatalist" aria-labelledby="gameOptionLabel" aria-describedby="gameOptionHelp" autocomplete="off" placeholder="Game" v-model="currentGame">
                                <button class="btn btn-outline-danger" type="button" @click="currentGame = ''"><i class="bi bi-x"></i></button>
                            </div>
                            <datalist id="gameOptionsDatalist">
                                <option v-for="game in currentSelectedConsole?.games ?? []" :key="game.name">{{ game.name }}</option>
                            </datalist>
                            <div id="gameOptionHelp" class="form-text">
                                The game they're going to play. Click/double click on the empty text box to see all options.<br>
                                <i class="bi bi-exclamation-triangle"></i> PLEASE make sure to try and use autocomplete options as much as possible. Otherwise availibility might not work correctly.
                            </div>
                        </div>
                        <div class="mb-3">
                            <div class="form-check">
                                <input class="form-check-input" type="checkbox" value="" id="updateTimeInput" v-model="updateTime">
                                <label class="form-check-label" id="updateTimeLabel" for="updateTimeInput">Update Checkout Time</label>
                            </div>
                        </div>
                        <div class="mb-3" v-if="updateTime">
                            <div class="input-group">
                                <div class="input-group-text">
                                    <div class="form-check">
                                        <input class="form-check-input" type="checkbox" value="" id="useCustomTimeInput" v-model="useCustomTime">
                                        <label class="form-check-label" id="useCustomTimeLabel" for="useCustomTimeInput">Use Custom Time</label> 
                                    </div>   
                                </div>
                                <input type="datetime-local" class="form-control" aria-label="Custom Time" :disabled="!useCustomTime" v-model="customTime">
                                <button class="btn btn-outline-secondary" type="button" id="customTimeNowButton" @click="setCustomTime(moment())" :disabled="!useCustomTime">Now</button>
                            </div>
                            <!-- <div class="form-check">
                                <input class="form-check-input" type="checkbox" value="" id="useCustomTimeInput" v-model="useCustomTime">
                                <label class="form-check-label" id="useCustomTimeLabel" for="useCustomTimeInput">Use Custom Time</label>
                            </div> -->
                        </div>
                        <div class="mt-2 mb-3">
                            <label id="stationNotesLabel" class="form-label" for="stationNotesInput">Station Notes</label>
                            <textarea rows="3" class="form-control" id="stationNotesInput" name="stationNotes" aria-describedby="stationNotesHelp" placeholder="Lorem ipsum..." v-model="currentStationNotes"></textarea>
                            <div id="stationNotesHelp" class="form-text">Some notes we need to know</div>
                        </div>
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

const props = defineProps({
    station: Object,
    consoleOptions: Array
})

let modalRoot = ref(null)
let modalObj = null

const title = ref('Checkout Station')

const currentPlayerName = ref('')

const currentConsole = ref('')
const currentSelectedConsole = ref(null)

const currentGame = ref('')
const currentStationNotes = ref('')

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
    currentPlayerName.value = props.station?.playerName ?? ''
    currentConsole.value = props.station?.currentConsole ?? ''
    updateCurrentConsoleObj()
    currentGame.value = props.station?.currentGame ?? ''
    currentStationNotes.value = props.station?.notes ?? ''
    setCustomTime(moment(props.station?.checkoutTime) ?? moment())
}

function setCustomTime(momentObj) {
    customTime.value = momentObj.local().format('YYYY-MM-DD HH:mm:ss')
}

function updateCurrentConsoleObj() {
    currentGame.value = ''
    for(const c of props.consoleOptions) {
        if (c._id == currentConsole.value) {
            currentSelectedConsole.value = c
            return
        }
    }
    currentSelectedConsole.value = null
}

function isVisible() {
    return modalRoot.value && (modalRoot.value.hasClass('in') || modalRoot.value.hasClass('show'))
}

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
    _hide()
})

function submitForm() {
    isSubmitting.value = true

    let updateRecord = {
        playerName: currentPlayerName.value,
        currentConsole: currentConsole.value,
        currentGame: currentGame.value,
        notes: currentStationNotes.value
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