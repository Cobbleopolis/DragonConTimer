<template>
    <main class="container pt-2">
        <template v-if="!loading">
            <!-- <ConsoleConfigCard v-for="console in consoles" :key="console._id" :console-id="console._id"/> -->
            <div class="d-flex flex-column gap-2 mb-2">
                <StationConfigCard v-for="station in stations" :key="station._id"/>
            </div>
            <div class="input-group mb-3">
                <input type="text" class="form-control" placeholder="New Station Name" aria-label="New Station Name" aria-describedby="button-add" v-model="newStationName">
                <button class="btn btn-primary" type="button" id="button-add" @click="createNewConsole"><i class="bi bi-plus"></i> Add</button>
            </div>
        </template>
        <template v-else>
            <div class="d-flex justify-content-center">
                <LoadingAnimation />
            </div>
        </template>
    </main>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useQuery, useMutation, useQueryLoading } from '@vue/apollo-composable'
import gql from 'graphql-tag'
import UseUpdateQuery from '../../useables/UseUpdateQuery'
import LoadingAnimation from '../../components/LoadingAnimation.vue'
import stationStates from '../../utils/stationStates'
import StationConfigCard from '../../components/config/StationConfigCard.vue'

const loading = useQueryLoading()

const stationReq = useQuery(gql`
query Station {
    station {
        _id
        consoleOptions
        name
        status
    }
}`)

stationReq.subscribeToMore({
    document: gql`
    subscription StationCreate {
        stationCreate {
            _id
            consoleOptions
            name
            status
        }
    }`,
    updateQuery: UseUpdateQuery.standardCollectionCreateUpdateQuery('station', 'stationCreate')
})

stationReq.subscribeToMore({
    document: gql`
    subscription StationRemove {
        stationRemove {
            _id
            consoleOptions
            name
            status
        }
    }`,
    updateQuery: UseUpdateQuery.standardCollectionRemoveUpdateQuery('station', 'stationRemove')
})

const stations = computed(() => stationReq.result.value?.station ?? [])



const newStationName = ref('')

const { mutate: createConsole, onDone: createConsoleDone } = useMutation(gql`
mutation StationCreate($record: CreateOneStationInput!) {
  stationCreate(record: $record) {
    error {
      message
    }
  }
}`)

createConsoleDone(() => {
    newStationName.value = ''
})

function createNewConsole() {
    createConsole({
        record: {
            name: newStationName.value,
            consoleOptions: [],
            status: stationStates.DEFAULT
        }
    })
}
</script>