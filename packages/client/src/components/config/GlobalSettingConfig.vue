<template>
    <div :class="'card border-' + borderVarient">
        <div class="card-body">
            <form>
                <div class="row g-3">
                    <div class="col-md-6">
                        <label :for="'settingName' + settingObj._id" class="form-label">Setting Name</label>
                        <input type="text" class="form-control" :id="'settingName' + settingObj._id" v-model="settingName" :disabled="!isLoading()">
                    </div>
                    <div class="col-md-6">
                        <label :for="'settingValue' + settingObj._id" class="form-label">Setting Value</label>
                        <input type="text" class="form-control" :id="'settingValue' + settingObj._id" v-model="settingValue" :disabled="!isLoading()">
                    </div>
                </div>
            </form>
        </div>
        <div class="card-footer">
            <div class="btn-toolbar" role="toolbar" aria-label="Operation buttons for this setting option">
                <div class="btn-group me-2" role="group">
                    <button class="btn btn-success" @click="saveClick"><i class="bi bi-save"></i> Save</button>
                    <button class="btn btn-danger" @click="deleteClick"><i class="bi bi-trash"></i> Delete</button>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup>
import { ref } from 'vue'
import { useMutation } from '@vue/apollo-composable'
import gql from 'graphql-tag'

const props = defineProps({
    settingObj: Object,
})

const settingName = ref(props.settingObj.name)
const settingValue = ref(props.settingObj.value)

const borderVarient = ref('default')

// onMounted(() => {
//     settingName.value = props.settingObj.name
//     settingValue.value = props.settingObj.value
// })

const { mutate: updateGlobalSetting, loading: updateLoading, onDone: onUpdateDone } = useMutation(gql`
mutation GlobalSettingUpdateById($id: MongoID!, $record: UpdateByIdGlobalSettingInput!) {
    globalSettingUpdateById(_id: $id, record: $record) {
        error {
            message
        }
    }
}`)

onUpdateDone(() => {
    console.log('TEST')
    setBorderVarient('success')
})

const { mutate: deleteGlobalSetting, loading: removeLoading } = useMutation(gql`
mutation GlobalSettingRemoveById($id: MongoID!) {
    globalSettingRemoveById(_id: $id) {
        error {
            message
        }
    }
}`)

function isLoading() {
    return updateLoading || removeLoading
}

function saveClick() {
    updateGlobalSetting({
        id: props.settingObj._id,
        record: {
            name: settingName.value,
            value: settingValue.value
        }
    })
}

function deleteClick() {
    deleteGlobalSetting({
        id: props.settingObj._id
    })
}

function setBorderVarient(varient, timeout) {
    borderVarient.value = varient
    setTimeout(() => {
        borderVarient.value = 'default'
    }, timeout ?? 1000)
}
</script>