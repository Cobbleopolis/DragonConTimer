import { computed } from 'vue'
import { useQuery } from '@vue/apollo-composable'
import gql from 'graphql-tag'
import UseUpdateQuery from './UseUpdateQuery'

export default function () {

    function getSetting(settingName) {
        const req = useQuery(gql`
        query GlobalSettingOneLean($filter: FilterFindOneGlobalSettingInput) {
            globalSettingOneLean(filter: $filter) {
                _id
                name
                value
            }
        }`, {
            filter: {
                name: settingName
            }
        })

        const settingObj = computed(() => req.result.value?.globalSettingOneLean ?? {})

        req.onResult(res => {
            if (res.data.globalSettingOneLean) {
                req.subscribeToMore({
                    document: gql`
                    subscription GlobalSettingUpdateById($recordId: MongoID!) {
                        globalSettingUpdateById(recordId: $recordId) {
                            _id
                            name
                            value
                        }
                    }`,
                    variables: {
                        recordId: res.data.globalSettingOneLean._id
                    },
                    updateQuery: UseUpdateQuery.standardUpdateUpdateQuery('globalSettingOneLean', 'globalSettingUpdateById')
                })
            }
        })

        return settingObj
    }

    return {
        getSetting
    }
}