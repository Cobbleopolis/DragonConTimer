<template>
    <div :class="'card border-' + borderVarient">
        <div :class="'card-header text-bg-' + borderVarient">
            <span>ID: {{  settingId }}</span>
        </div>
        <div class="card-body">
            <form>
                <div class="row g-3">
                    <div class="col-md-6">
                        <label :for="'settingName' + settingId" class="form-label">Setting Name</label>
                        <input type="text" class="form-control" :id="'settingName' + settingId" v-model="settingName" :disabled="!isLoading()">
                    </div>
                    <div class="col-md-6">
                        <label :for="'settingValue' + settingId" class="form-label">Setting Value</label>
                        <input type="text" class="form-control" :id="'settingValue' + settingId" v-model="settingValue" :disabled="!isLoading()">
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
import { ref, computed } from 'vue'
import { useQuery, useMutation } from '@vue/apollo-composable'
import gql from 'graphql-tag'
import UseUpdateQuery from '../../useables/UseUpdateQuery'

const props = defineProps({
    settingId: String,
})

const getGlobalSettingReq = useQuery(gql`
query GlobalSettingById($id: MongoID!) {
  globalSettingById(_id: $id) {
    _id
    name
    value
  }
}`, {
    id: props.settingId
})

getGlobalSettingReq.onResult((result) => {
    settingName.value = result.data.globalSettingById.name
    settingValue.value = result.data.globalSettingById.value
})

getGlobalSettingReq.subscribeToMore({
    document: gql`
    subscription GlobalSettingUpdateById($recordId: MongoID!) {
        globalSettingUpdateById(recordId: $recordId) {
            _id
            name
            value
        }
    }`,
    variables: {
        recordId: props.settingId
    },
    updateQuery: UseUpdateQuery.standardUpdateUpdateQuery('globalSettingById', 'globalSettingUpdateById')
})

const globalSetting = computed(() => getGlobalSettingReq.result.value?.globalSettingById ?? {})

const settingName = ref(globalSetting.value.name)
const settingValue = ref(globalSetting.value.value)

const borderVarient = ref('default')

// const { result: subscriptionUpdateRes } = useSubscription(gql`
// subscription GlobalSettingChangedById($recordId: MongoID!) {
//   globalSettingChangedById(recordId: $recordId) {
//     name
//     value
//   }
// }`, {
//     recordId: props.settingId
// })

// watch(
//     subscriptionUpdateRes,
//     data => {
//         settingName.value = data.globalSettingChangedById.name
//         settingValue.value = data.globalSettingChangedById.value
//     },
//     {
//         lazy: true
//     }
// )

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
        id: props.settingId,
        record: {
            name: settingName.value,
            value: settingValue.value
        }
    })
}

function deleteClick() {
    deleteGlobalSetting({
        id: props.settingId
    })
}

function setBorderVarient(varient, timeout) {
    borderVarient.value = varient
    setTimeout(() => {
        borderVarient.value = 'default'
    }, timeout ?? 1000)
}
</script>