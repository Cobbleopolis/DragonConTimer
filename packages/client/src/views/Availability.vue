<!-- eslint-disable vue/multi-word-component-names -->
<template>
    <div class="container">
        <h1>Availability</h1>
        <div class="card mb-2" v-for="console in consoles" :key="console._id">
            <div class="card-header">{{ console.name }}</div>
            <div class="card-body">
                <div class="mb-4">
                    <span v-if="availableConsoleCount[console._id] === 0" >
                        Available in: 
                        <span v-if="timeToNextConsole[console._id]">{{ timeToNextConsole[console._id] }}</span>
                        <span v-else class="placeholder col-2"></span>
                    </span>
                    <span v-else class="me-auto">Availability: {{ availableConsoleCount[console._id] }}/{{ totalConsoleCount[console._id] }}</span>
                    <br>
                    <span v-if="stationsToKick[console._id] && stationsToKick[console._id].length > 0">Stations to kick: {{ (stationsToKick[console._id] ?? []).map(x => x.name).join(", ") }}</span>
                </div>
                <div class="accordion">
                    <div class="accordion-item">
                        <h2 class="accordion-header">
                            <button class="accordion-button collapsed" type="button" data-bs-toggle="collapse" :data-bs-target="'#consoleGameListCollapse-' + console._id" aria-expanded="false" :aria-controls="'consoleGameListCollapse-' + console._id">Games</button>
                        </h2>
                        <div class="collapse" :id="'consoleGameListCollapse-' + console._id">
                            <div class="accordion-body px-0 pt-0 pb-1">
                                <ul class="list-group list-group-flush">
                                    <li :class="'list-group-item ' + (availableGameCount[console._id + '-' + game.name] <= 0 ? 'list-group-item-danger' : '')" v-for="game in console.games" :key="game.name">
                                        <span>{{ game.name }}: {{ availableGameCount[console._id + '-' + game.name] }}/{{ game.count }}</span>
                                    </li>
                                </ul>
                            </div>
                        </div>
                    </div>
                    <div class="accordion-item">
                        <h2 class="accordion-header">
                            <button class="accordion-button collapsed" type="button" data-bs-toggle="collapse" :data-bs-target="'#consoleExtraListCollapse-' + console._id" aria-expanded="false" :aria-controls="'consoleExtraListCollapse-' + console._id">Extras</button>
                        </h2>
                        <div class="collapse" :id="'consoleExtraListCollapse-' + console._id">
                            <div class="accordion-body px-0 pt-0 pb-1">
                                <ul class="list-group list-group-flush">
                                    <li :class="'list-group-item ' + (availableExtraCount[extra._id] <= 0 ? 'list-group-item-danger' : '')" v-for="extra in console.extras" :key="extra._id">
                                        <span>{{ extra.name }}: {{ availableExtraCount[extra._id]}}/{{ extra.count }}</span>
                                    </li>
                                </ul>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useQuery } from '@vue/apollo-composable'
import gql from 'graphql-tag'
import moment from 'moment'

import stationStates from '../utils/stationStates'
import timeUtils from '../utils/timeUtils'
import UseGlobalSettings from '../useables/UseGlobalSettings'
import UseUpdateQuery from '../useables/UseUpdateQuery'

onMounted(() => {
    tickUpdate()
    setInterval(tickUpdate, 1000)
})

onUnmounted(() => {
    clearInterval(tickUpdate)
})

const stationReq = useQuery(gql`
query Station {
    station {
        _id
        name
        consoleOptions
        currentConsole
        currentExtras {
            extraId
            count
        }
        currentGame
        status
        checkoutTime
    }
}`)

stationReq.subscribeToMore({
    document: gql`
    subscription StationCreate {
        stationCreate {
            _id
            name
            checkoutTime
            consoleOptions
            currentConsole
            currentExtras {
                extraId
                count
            }
            currentGame
            status
        }
    }`,
    updateQuery: UseUpdateQuery.standardCollectionCreateUpdateQuery('station', 'stationCreate')
})

stationReq.subscribeToMore({
    document: gql`
    subscription StationUpdate {
        stationUpdate {
            _id
            name
            checkoutTime
            consoleOptions
            currentConsole
            currentExtras {
                extraId
                count
            }
            currentGame
            status
        }
    }`,
    updateQuery: UseUpdateQuery.standardCollectionUpdateUpdateQuery('station', 'stationUpdate')
})

stationReq.subscribeToMore({
    document: gql`
    subscription StationRemove {
        stationRemove {
            _id
            name
            checkoutTime
            consoleOptions
            currentExtras {
                extraId
                count
            }
            currentConsole
            currentGame
            status
        }
    }`,
    updateQuery: UseUpdateQuery.standardCollectionRemoveUpdateQuery('station', 'stationRemove')
})

const stations = computed(() => stationReq.result.value?.station ?? [])

const consoleReq = useQuery(gql`
query Console {
    console {
        _id
        games {
            count
            name
        }
        extras {
            _id
            count
            name
        }
        name
    }
}`)

consoleReq.subscribeToMore({
    document: gql`
    subscription ConsoleCreate {
        consoleCreate {
            _id
            games {
                count
                name
            }
            extras {
                _id
                count
                name
            }
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
            games {
                count
                name
            }
            extras {
                _id
                count
                name
            }
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
            games {
                count
                name
            }
            extras {
                _id
                count
                name
            }
            name
        }
    }`,
    updateQuery: UseUpdateQuery.standardCollectionRemoveUpdateQuery('console', 'consoleRemove')
})

const consoles = computed(() => consoleReq.result.value?.console ?? [])

const totalConsoleCount = computed(() => {
    const tmp = {}
    consoles.value.forEach(c => {
        tmp[c._id] = stations.value.filter(s => s.consoleOptions.includes(c._id)).length
    })
    return tmp
})

const availableConsoleCount = computed(() => {
    const tmp = {}
    consoles.value.forEach(c => {
        tmp[c._id] = stations.value.filter(s => s.consoleOptions.includes(c._id) && s.status == stationStates.DEFAULT).length
    })
    return tmp
})

const availableGameCount = computed(() => {
    const tmp = {}
    consoles.value.forEach(c => {
        c.games.forEach(g => {
            tmp[c._id + '-' + g.name] = g.count - stations.value.filter(s => s.currentConsole === c._id && s.currentGame === g.name).length
        })
    })
    return tmp
})

const availableExtraCount = computed(() => {
    const tmp = {}
    consoles.value.forEach(c => {
        c.extras.forEach(e => {
            tmp[e._id] = e.count - stations.value.filter(s => s.currentConsole === c._id).map(s => s.currentExtras.find(se => se.extraId === e._id).count).reduce((a, b) => a + b, 0)
        })
    })
    return tmp
})

const { getSetting } = UseGlobalSettings()

const kickTime = getSetting('kickTime')

const timeToNextConsole = ref({})

const stationsToKick = ref({})

function tickUpdate() {
    updateTimeToNextConsole()
    updateStationsToKick()
}

function updateTimeToNextConsole() {
    const currentTime = moment()
    consoles.value.forEach(c => {
        let timeToNextConsoleStr = null
        const checkedOutStationsWithConsole = stations.value.filter(s => s.consoleOptions.includes(c._id) && s.status === stationStates.CHECKED_OUT)
        if (checkedOutStationsWithConsole.length > 0) {
            let oldestCheckoutTime = moment(checkedOutStationsWithConsole[0].checkoutTime)
            checkedOutStationsWithConsole.forEach(s => {
                const momentCheckoutTime = moment(s.checkoutTime)
                if (momentCheckoutTime.isBefore(oldestCheckoutTime)) {
                    oldestCheckoutTime = momentCheckoutTime
                }
            })
            const availableTime = oldestCheckoutTime.clone().add(moment.duration(kickTime.value.value))
            timeToNextConsoleStr = timeUtils.formatDurationFormat(moment.duration(availableTime.diff(currentTime)))
        } 
        timeToNextConsole.value[c._id] = timeToNextConsoleStr
    })
}

function updateStationsToKick() {
    consoles.value.forEach(c => {
        stationsToKick.value[c._id] = stations.value.filter(s => {
            if (!s.consoleOptions.includes(c._id)) {
                return false
            }
            const availableTime = moment(s.checkoutTime).add(moment.duration(kickTime.value.value))
            return availableTime.isSameOrBefore(moment())
        })
    })
}
</script>