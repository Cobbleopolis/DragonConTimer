import { ref, computed } from 'vue'
import { useQuery, useMutation } from '@vue/apollo-composable'
import gql from 'graphql-tag'
//TODO Delete this when it's not needed anymore
export default function () {

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

    //Handle setting creation
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

    //Handle setting updates
    globalSettingReq.subscribeToMore(() => ({
        document: gql`
        subscription GlobalSettingUpdate {
            globalSettingUpdate {
                _id
                name
                value
            }
        }`,
        updateQuery: (previousResult, { subscriptionData }) => {
            console.log(previousResult)
            const tmp = structuredClone(previousResult)
            for (let i in tmp.globalSetting) {
                if(tmp.globalSetting[i]._id == subscriptionData.data.globalSettingUpdate._id) {
                    tmp.globalSetting[i] = subscriptionData.data.globalSettingUpdate
                    break
                }
            }
            return tmp
        }
    }))

    //Handle setting deletes
    globalSettingReq.subscribeToMore(() => ({
        document: gql`
        subscription GlobalSettingRemove {
            globalSettingRemove {
                _id
            }
        }`,
        updateQuery: (previousResult, { subscriptionData }) => {
            if (subscriptionData.data.globalSettingRemove) {
                const tmp = structuredClone(previousResult)
                let indexToRemove = -1
                for(let i = 0; i < globalSettings.value.length; i++) {
                    if (globalSettings.value[i]._id === subscriptionData.data?.globalSettingRemove._id) {
                        indexToRemove = i
                        break
                    }
                }
                if (indexToRemove !== -1) {
                    tmp.globalSetting.splice(indexToRemove, 1)
                }
                return tmp
            }
        }
    }))

    const globalSettings = computed(() => globalSettingReq.result.value?.globalSetting ?? [])

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

    const { mutate: updateGlobalSetting } = useMutation(gql`
    mutation GlobalSettingUpdateById($id: MongoID!, $record: UpdateByIdGlobalSettingInput!) {
        globalSettingUpdateById(_id: $id, record: $record) {
            error {
                message
            }
        }
    }`)

    const { mutate: deleteGlobalSetting } = useMutation(gql`
    mutation GlobalSettingRemoveById($id: MongoID!) {
        globalSettingRemoveById(_id: $id) {
            error {
                message
            }
        }
    }`)


    function getSetting(settingName) {
        for(let gs of globalSettings.value) {
            if (gs.name === settingName) {
                return gs
            }
        }
        return null
    }

    function createSetting(settingName, settingValue) {
        createGlobalSetting({
            record: {
                name: settingName,
                value: settingValue
            }
        })
    }

    function updateSetting(settingId, settingName, settingValue, implicitCreate) {
        const settingObj = getSetting(settingName)
        if (settingObj) {
            updateGlobalSetting({
                id: settingId,
                record: {
                    name: settingName,
                    value: settingValue
                }
            })
        } else if (implicitCreate) {
            createSetting(settingName, settingValue)
        } else {
            console.warn('A global setting with the id of \'' + settingId + '\' was not found')
        }
    }

    function deleteSetting(settingName) {
        const settingObj = getSetting(settingName)
        if (settingObj) {
            deleteGlobalSetting({
                id: settingObj._id
            })
        } else {
            console.warn('A global setting by the name of \'' + settingName + '\' was not found')
        }
    }

    return {
        globalSettings,
        getSetting,
        createSetting,
        updateSetting,
        deleteSetting
    }
}