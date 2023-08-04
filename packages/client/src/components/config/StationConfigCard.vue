<template>
    <div :class="'card border-' + borderVarient">
        <template v-if="!loading">
            <div :class="'card-header text-bg-' + borderVarient">
                <span>ID: {{ stationId }}</span>
            </div>
            <div class="card-body">
                <div class="mb-2">
                    <label :for="'stationName' + station._id" class="form-label">Name</label>
                    <input type="text" class="form-control" :id="'stationName' + station._id" v-model="formName">
                </div>
                <div class="mb-3">
                    <label class="form-label">Console Options</label>
                    <div class="form-check" v-for="console in consoles" :key="console._id">
                        <input class="form-check-input" type="checkbox" :id="stationId + 'consoleOption' + console._id" :value="console._id" v-model="formConsoleOptions">
                        <label class="form-check-label" :for="stationId + 'consoleOption' + console._id">{{ console.name }}</label>
                    </div>
                </div>
            </div>
            <div class="card-footer">
                <div class="btn-toolbar" role="toolbar" aria-label="Operation buttons for this console">
                    <div class="btn-group" role="group">
                        <button class="btn btn-success" @click="saveClick"><i class="bi bi-save"></i> Save</button>
                        <button class="btn btn-danger" @click="deleteClick"><i class="bi bi-trash"></i> Delete</button>
                    </div>
                </div>
            </div>
        </template>
        <template v-else>
            <div class="card-head">
                <span class="placeholder-glow">ID: <span class="placeholder col-2"></span></span>
            </div>
            <div class="card-body d-flex justify-content-center">
                <LoadingAnimation/>
            </div>
        </template>
    </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useQuery, useMutation, useQueryLoading } from '@vue/apollo-composable'
import gql from 'graphql-tag'
import UseUpdateQuery from '../../useables/UseUpdateQuery'
import LoadingAnimation from '../../components/LoadingAnimation.vue'

import {useToast} from 'vue-toast-notification'
const toast = useToast()

const props = defineProps({
    stationId: String
})

const loading = useQueryLoading()

const stationReq = useQuery(gql`
query StationById($id: MongoID!) {
    stationById(_id: $id) {
        _id
        consoleOptions
        name
    }
}`, {
    id: props.stationId
})

stationReq.subscribeToMore({
    document: gql`
    subscription StationUpdateById($recordId: MongoID!) {
        stationUpdateById(recordId: $recordId) {
            _id
            consoleOptions
            name
        }
    }`, 
    variables: {
        recordId: props.stationId
    },
    updateQuery: UseUpdateQuery.standardUpdateUpdateQuery('stationById', 'stationUpdateById')
})

stationReq.onResult((result) => {
    formName.value = result.data.stationById.name
    formConsoleOptions.value = result.data.stationById.consoleOptions
})

const station = computed(() => stationReq.result.value?.stationById ?? {})

const consoleReq = useQuery(gql`
query Console {
    console {
        _id
        name
    }
}`)

consoleReq.subscribeToMore({
    document: gql`
    subscription ConsoleCreate {
        consoleCreate {
            _id
            name
        }
    }`,
    updateQuery: UseUpdateQuery.standardCollectionCreateUpdateQuery('console', 'consoleCreate')
})

consoleReq.subscribeToMore({
    document: gql`
    subscription ConsoleUpdate {
        consoleUpdate {
            _id
            name
        }
    }`,
    updateQuery: UseUpdateQuery.standardCollectionUpdateUpdateQuery('console', 'consoleUpdate')
})

consoleReq.subscribeToMore({
    document: gql`
    subscription ConsoleRemove {
        consoleRemove {
            _id
            name
        }
    }`,
    updateQuery: UseUpdateQuery.standardCollectionRemoveUpdateQuery('console', 'consoleRemove')
})

const consoles = computed(() => consoleReq.result.value?.console ?? {})

const formName = ref(station.value.name)
const formConsoleOptions = ref(station.value.consoleOptions)

const { mutate: updateStation, onDone: onUpdateDone, onError: onUpdateError } = useMutation(gql`
mutation Mutation($id: MongoID!, $record: UpdateByIdStationInput!) {
    stationUpdateById(_id: $id, record: $record) {
        error {
            message
        }
    }
}`)

onUpdateDone(() => {
    setBorderVarient('success')
    toast.success('Successfully saved the station')
})

onUpdateError((error) => {
    toast.error('Error saving the station')
    console.error(error)
})

const { mutate: deleteStation, onError: onDeleteError} = useMutation(gql`
mutation StationRemoveById($id: MongoID!) {
    stationRemoveById(_id: $id) {
        error {
            message
        }
    }
}`)

onDeleteError((error) => {
    toast.error('Error deleting the station')
    console.error(error)
})

function saveClick() {
    updateStation({
        id: props.stationId,
        record: {
            name: formName.value,
            consoleOptions: formConsoleOptions.value
        }
    })
}

function deleteClick() {
    deleteStation({
        id: props.stationId
    })
}

const borderVarient = ref('default')

function setBorderVarient(varient, timeout) {
    borderVarient.value = varient
    setTimeout(() => {
        borderVarient.value = 'default'
    }, timeout ?? 1000)
}

</script>