<template>
    <main class="container pt-2 d-flex flex-column gap-3">
        <ConfigSettingConfig v-for="settingObj in globalSettings" :key="settingObj._id" :setting-obj="settingObj"/>
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
import ConfigSettingConfig from '../../components/config/GlobalSettingConfig.vue'

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