<template>
    <div class="modal fade modal-lg" tabindex="-1" ref="modalRoot">
        <div class="modal-dialog">
            <div class="modal-content">
                <div class="modal-header">
                    <h5 class="modal-title">{{ title }}</h5>
                    <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                </div>
                <div class="modal-body">
                    <form>
                        <fieldset>
                            <legend>Basic Info</legend>
                            <div class="mb-3">
                                <label :id="'playerNameLabel' + waitlistEntry._id" class="form-label" :for="'playerNameInput' + waitlistEntry._id">Name</label>
                                <input type="text" class="form-control" :id="'playerNameInput' + waitlistEntry._id" name="playerName" :aria-describedby="'playerNameHelp' + waitlistEntry._id" placeholder="John Doe" v-model="formPlayerName"/>
                                <div :id="'playerNameHelp' + waitlistEntry._id" class="form-text">The name of the person joining the waitlist</div>
                            </div>
                            <div class="mb-3">
                                <label :id="'waitingConsolesLabel' + waitlistEntry._id" class="form-label" :for="'waitingConsolesInput' + waitlistEntry._id">Consoles to Wait For</label>
                                <div class="form-check" v-for="console in consoleOptions" :key="console._id">
                                    <input class="form-check-input" type="checkbox" :id="waitlistEntry._id + 'waitingConsoles' + console._id" :value="console._id" v-model="formWaitingConsoles"/>
                                    <label class="form-check-label" :for="waitlistEntry._id + 'waitingConsoles' + console._id">{{ console.name }}</label>
                                </div>
                                <div :id="'waitingConsolesInputHelp' + waitlistEntry._id" class="form-text">The console(s) that the person wants to wait for</div>
                            </div>
                            <div class="mb-3">
                                <label :id="'waitingGameLabel' + waitlistEntry._id" class="form-label" :for="'waitingGameInput' + waitlistEntry._id">Games to Wait For</label>
                                <div v-if="formWaitingGames.length > 0" class="mb-2 d-flex gap-2">
                                    <button v-for="(game, i) in formWaitingGames" :key="game" type="button" class="btn btn-outline badge rounded-pill text-bg-secondary" @click="removeFromGameList(i)">{{ game }} <i class="bi bi-x-circle-fill"></i></button>
                                </div>
                                <input class="form-control" type="text" :id="'waitingGameInput' + waitlistEntry._id" v-model="gameToAdd" @keyup.enter="addGameToFormValue" :list="'waitingGameOptions' + waitlistEntry._id" />
                                <div :id="'waitingGameInputHelp' + waitlistEntry._id" class="form-text">The game(s) that the person wants to wait for</div>
                                <datalist :id="'waitingGameOptions' + waitlistEntry._id">
                                    <option v-for="game in gameOptions" :key="game">{{ game }}</option>
                                </datalist>
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
                        <fieldset>
                            <div class="mb-3">
                                <label :id="'notesLabel' + waitlistEntry._id" class="form-label" :for="'notesInput' + waitlistEntry._id">Notes</label>
                                <textarea type="text" class="form-control" :id="'notesInput' + waitlistEntry._id" name="notes" :aria-describedby="'notesHelp' + waitlistEntry._id" placeholder="Notes" v-model="formNotes"></textarea>
                                <div :id="'notesHelp' + waitlistEntry._id" class="form-text">Some notes about this waitlist entry.</div>
                            </div>
                        </fieldset>
                    </form>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" data-bs-dismiss="modal" :disabled="isSubmitting">Close</button>
                    <button type="button" class="btn btn-primary" @click="upsertEntry()" :disabled="isSubmitting">
                        <span v-if="isSubmitting" class="spinner-grow spinner-grow-sm" role="status" aria-hidden="true"></span>
                        Save changes
                    </button>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup>
import { onMounted, ref, computed } from 'vue'
import { useMutation, useQueryLoading } from '@vue/apollo-composable'
import gql from 'graphql-tag'
import * as bootstrap from 'bootstrap'
import moment from 'moment'

import {useToast} from 'vue-toast-notification'
const toast = useToast()

const props = defineProps({
    waitlistEntry: Object,
    consoleOptions: Array
})

const formPlayerName = ref('')
const formWaitingConsoles = ref([])
const formWaitingGames = ref([])
const gameToAdd = ref('')

const updateTime = ref(false)
const useCustomTime = ref(false)
const customTime = ref('')

const formNotes = ref('')

let modalRoot = ref(null)
let modalObj = null

const title = ref('')

const gameOptions = computed(() => {
    return props.consoleOptions
        .filter(x => formWaitingConsoles.value.includes(x._id))
        .flatMap(x => x.games.map(y => y.name))
})

onMounted(() => {
    modalObj = new bootstrap.Modal(modalRoot.value)
})

function isVisible() {
    return modalRoot.value && (modalRoot.value.hasClass('in') || modalRoot.value.hasClass('show'))
}

function _show(options) {
    if (options.popFields) {
        populateFields()
    } else {
        clearFields()
    }
    gameToAdd.value = ''
    updateTime.value = options.defaultTimeUpdateState ?? false
    useCustomTime.value = options.defaultUpdateCustomTimeState ?? false
    title.value = options.title ?? 'New Waitlist Entry'
    modalObj.show()
}

function _hide() {
    modalObj.hide()
}

function _toggle(popFields) {
    modalObj.toggle()
    if (popFields && isVisible()) {
        populateFields()
    }
}

function populateFields() {
    if (props.waitlistEntry) {
        formPlayerName.value = props.waitlistEntry.playerName
        formWaitingConsoles.value = props.waitlistEntry.waitingConsole ?? []
        formWaitingGames.value = props.waitlistEntry.waitingGame ?? []
        setCustomTime(moment(props.station?.checkoutTime) ?? moment())
        formNotes.value = props.waitlistEntry.notes
    }
}

function clearFields() {
    formPlayerName.value = ''
    formWaitingConsoles.value = []
    formWaitingGames.value = []
    setCustomTime(moment())
    formNotes.value = ''
}



function addGameToFormValue() {
    formWaitingGames.value = formWaitingGames.value.concat(gameToAdd.value)
    gameToAdd.value = ''
}

function removeFromGameList(index) {
    formWaitingGames.value = formWaitingGames.value.filter((_, i) => index !== i)
}

function setCustomTime(momentObj) {
    customTime.value = momentObj.local().format('YYYY-MM-DD HH:mm:ss')
}


const { mutate: updateStation, onDone: onUpdateDone, onError: onUpdateError } = useMutation(gql`
mutation WaitlistEntryUpdateById($id: MongoID!, $record: UpdateByIdWaitlistEntryInput!) {
  waitlistEntryUpdateById(_id: $id, record: $record) {
    error {
      message
    }
  }
}`)

onUpdateDone(() => {
    toast.success('Entry updated!')
    _hide()
})

onUpdateError((error) => {
    toast.error('Error updating waitlist entry!')
    console.error(error)
})

const { mutate: createStation, onDone: onCreateDone, onError: onCreateError } = useMutation(gql`
mutation WaitlistEntryCreate($record: CreateOneWaitlistEntryInput!) {
  waitlistEntryCreate(record: $record) {
    error {
      message
    }
  }
}`)

onCreateDone(() => {
    toast.success('Entry created!')
    _hide()
})

onCreateError((error) => {
    toast.error('Error creating waitlist entry!')
    console.error(error)
})

function upsertEntry() {
    if (gameToAdd.value) {
        addGameToFormValue()
    }
    const record = {
        playerName: formPlayerName.value,
        waitingConsole: formWaitingConsoles.value,
        waitingGame: formWaitingGames.value,
        notes: formNotes.value
    }
    if (updateTime.value) {
        if (useCustomTime.value) {
            record['waitingTimestamp'] = customTime.value
        } else {
            record['waitingTimestamp'] = moment()
        }
    }
    if (props.waitlistEntry && props.waitlistEntry._id) {
        updateStation({
            id: props.waitlistEntry._id,
            record
        })
    } else {
        createStation({
            record
        })
    }
}

const isSubmitting = useQueryLoading()

defineExpose({
    show: _show,
    hide: _hide,
    toggle: _toggle
})
</script>