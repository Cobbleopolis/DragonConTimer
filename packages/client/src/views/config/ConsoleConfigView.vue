<template>
    <div class="container pt-2">
        <div v-if="!loading">
            <div class="d-flex flex-column gap-2 mb-2">
                <ConsoleConfigCard v-for="console in consoles" :key="console._id" :console-id="console._id"/>
            </div>
            <div class="input-group mb-3">
                <input type="text" class="form-control" placeholder="New Console Name" aria-label="New Console Name" aria-describedby="button-add" v-model="newConsoleName">
                <button class="btn btn-primary" type="button" id="button-add" @click="createNewConsole"><i class="bi bi-plus"></i> Add</button>
            </div>
        </div>
        <div v-else class="d-flex justify-content-center">
            <LoadingAnimation />
        </div>
    </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useQuery, useMutation, useQueryLoading } from '@vue/apollo-composable'
import gql from 'graphql-tag'
import UseUpdateQuery from '../../useables/UseUpdateQuery'
import LoadingAnimation from '../../components/LoadingAnimation.vue'
import ConsoleConfigCard from '../../components/config/ConsoleConfigCard.vue'

const consoleReq = useQuery(gql`
query Console {
    console {
        _id
        games {
            count
            name
        }
        name
        checkoutWarning
    }
}`)

consoleReq.subscribeToMore({
    document: gql`
    subscription ConsoleRemove {
        consoleCreate {
            name
            games {
                name
                count
            }
            checkoutWarning
            _id
        }
    }`,
    updateQuery: UseUpdateQuery.standardCollectionCreateUpdateQuery('console', 'consoleCreate')
})

consoleReq.subscribeToMore({
    document: gql`
    subscription ConsoleRemove {
        consoleRemove {
            _id
            games {
                count
                name
            }
            checkoutWarning
            name
        }
    }`,
    updateQuery: UseUpdateQuery.standardCollectionRemoveUpdateQuery('console', 'consoleRemove')
})

const consoles = computed(() => consoleReq.result.value?.console ?? [])

const loading = useQueryLoading()

const newConsoleName = ref('')

const { mutate: createConsole, onDone: createConsoleDone } = useMutation(gql`
mutation ConsoleCreate($record: CreateOneConsoleInput!) {
  consoleCreate(record: $record) {
    error {
      message
    }
  }
}`)

createConsoleDone(() => {
    newConsoleName.value = ''
})

function createNewConsole() {
    createConsole({
        record: {
            name: newConsoleName.value
        }
    })
}

</script>