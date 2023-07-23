<template>
    <main class="container pt-2 d-flex flex-column gap-3">
        <ConfigSettingConfig v-for="settingObj in globalSettings" :key="settingObj._id" :setting-id="settingObj._id"/>
        <form>
            <div class="input-group mb-3">
                <input type="text" class="form-control" placeholder="New Setting Name" aria-label="New Setting Name" aria-describedby="button-add" v-model="newSettingName">
                <button class="btn btn-primary" type="button" id="button-add" @click="createNewSetting">Add</button>
            </div>
        </form>
    </main>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useQuery, useMutation } from '@vue/apollo-composable'
import gql from 'graphql-tag'
import ConfigSettingConfig from '../../components/config/GlobalSettingConfigCard.vue'

const globalSettingReq = useQuery(gql`
query GlobalSetting($sort: SortFindManyGlobalSettingInput) {
    globalSetting(sort: $sort) {
        _id
        name
        value
    }
}`, {
    sort: 'NAME_ASC'
})

globalSettingReq.subscribeToMore(() => ({
    document: gql`
    subscription GlobalSettingCreate {
        globalSettingCreate {
            _id
            name
            value
        }
    }`,
    updateQuery: (previousResult, { subscriptionData }) => {
        const tmp = structuredClone(previousResult)
        tmp.globalSetting = [...tmp.globalSetting, subscriptionData.data.globalSettingCreate]
        return tmp
    }
}))

globalSettingReq.subscribeToMore({
    document: gql`
    subscription GlobalSettingRemove {
        globalSettingRemove {
            _id
        }
    }`,
    updateQuery: (previousResult, { subscriptionData }) => {
        const tmp = structuredClone(previousResult)
        tmp.globalSetting = tmp.globalSetting.filter(settingObj => settingObj._id !== subscriptionData.data?.globalSettingRemove._id)
        return tmp
    }
})

const globalSettings = computed(() => globalSettingReq.result.value?.globalSetting ?? [])

const newSettingName = ref('')

const { mutate: createGlobalSetting } = useMutation(gql`
mutation GlobalSettingCreate($record: CreateOneGlobalSettingInput!) {
    globalSettingCreate(record: $record) {
        record {
            _id
            name
            value
        }
    }
}`)

function createNewSetting() {
    createGlobalSetting({
        record: {
            name: newSettingName.value
        }
    })
}
</script>