<template>
    <div :class="'card border-' + borderVarient">
        <template v-if="!loading">
            <div :class="'card-header text-bg-' + borderVarient">
                <span>ID: {{ console._id }}</span>
            </div>
            <div class="card-body">
                <div class="mb-2">
                    <label :for="'consoleName' + console._id" class="form-label">Name</label>
                    <input type="text" class="form-control" :id="'consoleName' + console._id" v-model="formName">
                </div>
                <div class="d-flex flex-column flex-md-row gap-2">
                    <div class="flex-shrink-1">
                        <label :for="'gameName' + console._id" class="form-label"><span>Games</span></label>
                        <div class="input-group mb-1" v-for="(game, i) in formGames" :key="console._id + i">
                            <input type="text" class="form-control" :id="'gameName' + console._id + i" v-model="game.name" placeholder="Game Name">
                            <input type="number" class="form-control" :id="'gameCount' + console._id + i" v-model="game.count" min="0">
                            <button class="btn btn-danger" type="button" :id="'buttonDeleteGame' + i" @click="deleteGame(i)"><i class="bi bi-trash"></i> Delete</button>
                        </div>
                        <div class="mb-2">
                            <button class="btn btn-primary" role="button" @click="addGame"><i class="bi bi-plus"></i> Add Game</button>
                        </div>
                    </div>
                    <!-- Eventually extras should go here -->
                </div>
                <div class="mb-4">
                    <label :for="'checkoutWarning' + console._id" class="form-label">Checkout Warning</label>
                    <input type="text" class="form-control" :id="'checkoutWarning' + console._id" v-model="formCheckoutWarning">
                </div>
                <div class="btn-group" role="group">
                    <button class="btn btn-success" @click="saveClick"><i class="bi bi-save"></i> Save</button>
                    <button class="btn btn-danger" @click="deleteClick"><i class="bi bi-trash"></i> Delete</button>
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


const props = defineProps({
    consoleId: String
})

const loading = useQueryLoading()

const consoleReq = useQuery(gql`
query ConsoleById($id: MongoID!) {
    consoleById(_id: $id) {
        _id
        checkoutWarning
        games {
            count
            name
        }
        name
    }
}`, {
    id: props.consoleId
})

consoleReq.subscribeToMore({
    document: gql`
    subscription ConsoleUpdateById($recordId: MongoID!) {
        consoleUpdateById(recordId: $recordId) {
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
        recordId: props.consoleId
    },
    updateQuery: UseUpdateQuery.standardUpdateUpdateQuery('consoleById', 'consoleUpdateById')
})

consoleReq.onResult((result) => {
    formName.value = result.data.consoleById.name
    // eslint-disable-next-line no-unused-vars
    formGames.value = result.data.consoleById.games.map(({__typename, ...gameObj}) => gameObj)
    formCheckoutWarning.value = result.data.consoleById.checkoutWarning
})

const console = computed(() => consoleReq.result.value?.consoleById ?? {})

const formName = ref(console.value.name)
// eslint-disable-next-line no-unused-vars
const formGames = ref(console.value.games)
const formCheckoutWarning = ref(console.value.checkoutWarning)

const { mutate: updateConsole, onDone: onUpdateDone } = useMutation(gql`
mutation ConsoleUpdateById($id: MongoID!, $record: UpdateByIdConsoleInput!) {
    consoleUpdateById(_id: $id, record: $record) {
        error {
            message
        }
    }
}`)

onUpdateDone(() => {
    setBorderVarient('success')
})

const { mutate: deleteConsole } = useMutation(gql`
mutation ConsoleRemoveById($id: MongoID!) {
    consoleRemoveById(_id: $id) {
        error {
            message
        }
    }
}`)

function saveClick() {
    updateConsole({
        id: props.consoleId,
        record: {
            name: formName.value,
            // eslint-disable-next-line no-unused-vars
            games: formGames.value.map(({__typename, ...gameObj}) => gameObj).sort((a, b) => {
                var textA = a.name.toUpperCase()
                var textB = b.name.toUpperCase()
                return (textA < textB) ? -1 : (textA > textB) ? 1 : 0
            }),
            checkoutWarning: formCheckoutWarning.value
        }
    })
}

function deleteClick() {
    deleteConsole({
        id: props.consoleId
    })
}

const borderVarient = ref('default')

function setBorderVarient(varient, timeout) {
    borderVarient.value = varient
    setTimeout(() => {
        borderVarient.value = 'default'
    }, timeout ?? 1000)
}

function addGame() {
    formGames.value = [...formGames.value, {name: '', count: 1}]
}

function deleteGame(index) {
    formGames.value.splice(index, 1)
}
</script>