import fs from 'fs'
import path from 'path'
import moment from 'moment'
import crypto from 'crypto'
import momentDurationSetup from 'moment-duration-format'

momentDurationSetup(moment)

const fileName = 'DCT-Telemetry-Boardgames-2025.json'

const appendConsoleId = false

const excludeYears = [
    2024
]

const sessions = {}

const individualGroups = {}
const stations = {}
const games = {}

fs.readFile(path.join('.', fileName), 'utf8', (err, data) => {
    if (err) {
        console.log(err)
        process.exit(1)
    }
    let telemetry;
    try {
        telemetry = JSON.parse(data).data.telemetryEntry.reverse()
    } catch (parseError) {
        console.log(parseError);
    }


    for (const telemetryEntry of telemetry) {
        if (excludeYears.includes(moment(telemetryEntry.timestamp).year()))
            continue;
        const stationId = telemetryEntry.mutationArgs._id
        if (telemetryEntry.eventType === "stationCreate") {
            stations[stationId] = createStation(telemetryEntry.oldState.name, telemetryEntry.oldState.status, telemetryEntry.timestamp)
        }
        if (telemetryEntry.eventType === "stationUpdate") {

            let station = stations[stationId]
            const gameName = appendConsoleId ? `${telemetryEntry.oldState.currentGame} (${telemetryEntry.oldState.currentConsole})` : telemetryEntry.oldState.currentGame
            let game = games[gameName]

            const groupName = getGroupNameFromRawName(telemetryEntry.oldState.playerName)
            let group = individualGroups[groupName]

            if (!station) {
                station = createStation(telemetryEntry.oldState.name, telemetryEntry.oldState.status, telemetryEntry.timestamp)
            }

            if (!game) {
                game = createGame(gameName)
            }

            if (!group) {
                group = createGroup(groupName)
            }

            let session = createSession(moment(station.lastUpdate), moment(telemetryEntry.timestamp))
            sessions[session.id] = session

            let fromState = telemetryEntry.oldState.status
            let toState = telemetryEntry.mutationArgs.record.status
            if (
                (fromState === "CHECKED_OUT" && toState === "DEFAULT") ||
                (fromState === "CHECKED_OUT" && (!toState || toState === "CHECKED_OUT") ||
                (fromState === "CHECKED_OUT" && toState === "NOT_AVAILABLE"))
            ) { //Returning & updating
                station.addSessionId(session.id)
                game.addSessionId(session.id)
                group.addSessionId(session.id)
                // station.sessions.push(session.id)
            }


            station.state = telemetryEntry.mutationArgs.record.status
            station.lastUpdate = moment(telemetryEntry.timestamp)

            stations[stationId] = station
            games[gameName] = game
            individualGroups[groupName] = group


            // let station = stations[telemetryEntry.mutationArgs._id]
            //
            // if (!station) {
            //     if (!telemetryEntry.oldState)
            //         continue;
            //     station = {
            //         totalCheckoutTime: moment.duration(0),
            //         checkoutCount: 0,
            //         state: "DEFAULT",
            //         name: telemetryEntry.oldState.name,
            //         lastUpdate: moment(telemetryEntry.timestamp),
            //         checkouts: []
            //     }
            // } else {
            //     let checkoutEntry = {
            //         start: moment(station.lastUpdate),
            //         end: moment(telemetryEntry.timestamp),
            //     }
            //     if (telemetryEntry.mutationArgs.record.playerName) {
            //         let rawName = telemetryEntry.mutationArgs.record.playerName.toLowerCase()
            //         // for (let individualName of rawName.split(/[,+\/]/)) {
            //         //     var guestName = individualName.trim()
            //         //     let guest = individualGuests[guestName]
            //         //     if (!guest) {
            //         //         guest = {
            //         //             checkoutTime: moment.duration(moment(telemetryEntry.timestamp).diff(station.lastUpdate)),
            //         //             checkoutCount: 1,
            //         //             lastUpdate: moment(telemetryEntry.timestamp)
            //         //         }
            //         //     } else {
            //         //         let checkoutDuration = moment.duration(moment(telemetryEntry.timestamp).diff(guest.lastUpdate))
            //         //         guest.checkoutTime = guest.checkoutTime.add(checkoutDuration)
            //         //         guest.checkoutCount++
            //         //     }
            //         //     guest.lastUpdate = moment(telemetryEntry.timestamp)
            //         //     individualGuests[guestName] = guest
            //         // }
            //
            //         let guestName = rawName.replaceAll("\"", "")
            //         let guest = individualGroups[guestName]
            //         if (!guest) {
            //             guest = {
            //                 totalCheckoutTime: moment.duration(moment(telemetryEntry.timestamp).diff(station.lastUpdate)),
            //                 checkoutCount: 1,
            //                 lastUpdate: moment(telemetryEntry.timestamp),
            //                 checkouts: [checkoutEntry]
            //             }
            //         } else {
            //             let checkoutDuration = moment.duration(moment(telemetryEntry.timestamp).diff(station.lastUpdate))
            //             guest.totalCheckoutTime = guest.totalCheckoutTime.add(checkoutDuration)
            //             guest.checkoutCount++
            //             guest.checkouts.push(checkoutEntry)
            //         }
            //         guest.lastUpdate = moment(telemetryEntry.timestamp)
            //         individualGroups[guestName] = guest
            //     }
            //     if (station.state === "CHECKED_OUT" && telemetryEntry.mutationArgs.record.status === "DEFAULT") { //Returning
            //         let checkoutDuration = moment.duration(moment(telemetryEntry.timestamp).diff(station.lastUpdate))
            //         station.totalCheckoutTime = moment.duration(station.totalCheckoutTime.add(checkoutDuration))
            //         station.checkoutCount++
            //         if (!station.checkouts) {
            //             station.checkouts = []
            //         }
            //         station.checkouts.push(checkoutEntry)
            //     }
            //     station.state = telemetryEntry.mutationArgs.record.status
            //     station.lastUpdate = moment(telemetryEntry.timestamp)
            // }
            // stations[telemetryEntry.mutationArgs._id] = station
        }
    }
    // Printing info
    console.log("Stations: ")
    let totalStationTime = moment.duration(0)
    let totalStationCheckouts = 0
    for (const k in stations) {
        let station = stations[k]
        if (!station)
            continue;
        let stationTime = station.getTotalCheckoutTime()
        totalStationTime = totalStationTime.add(stationTime)
        totalStationCheckouts += station.sessionIds.length
        const printName = (station.name.indexOf(',') !== -1) ? "\"" + station.name + "\"" : station.name
        console.log(`${k}", "${printName}", "${station.sessionIds.length}", "${stationTime.format("HH:mm:ss.SSS")}"`)
    }
    console.log("Total Station Checkouts/Updates: " + totalStationCheckouts)
    console.log(`Total Time: "${totalStationTime.format("HH:mm:ss.SSS")}"`)

    console.log("Games: ")
    let totalGameTime = moment.duration(0)
    let totalGameCheckouts = 0
    for (const k in games) {
        let game = games[k]
        if (!game)
            continue;
        let gameTime = game.getTotalCheckoutTime()
        totalGameTime = totalGameTime.add(gameTime)
        totalGameCheckouts += game.sessionIds.length
        const printName = (game.name.indexOf(',') !== -1) ? "\"" + game.name + "\"" : game.name
        console.log(`${printName}, "${game.sessionIds.length}", "${gameTime.format("HH:mm:ss.SSS")}"`)
    }
    console.log("Total Game Checkouts/Updates: " + totalGameCheckouts)
    console.log(`Total Time: "${totalGameTime.format("HH:mm:ss.SSS")}"`)

    console.log("Groups:")
    let totalGroupTime = moment.duration(0)
    let totalGroupCheckouts = 0
    let uniquePlayerCount = 0
    let totalPlayerCount = 0
    for (const k in individualGroups) {
        let group = individualGroups[k]
        if (!group)
            continue;
        let groupTime = group.getTotalCheckoutTime()
        totalGroupTime = totalGroupTime.add(groupTime)
        totalGroupCheckouts += group.sessionIds.length
        uniquePlayerCount += group.individualCount
        totalPlayerCount += group.individualCount * group.sessionIds.length
        const printName = (group.name.indexOf(',') !== -1) ? "\"" + group.name + "\"" : group.name
        console.log(`${printName}, "${group.individualCount}", "${group.sessionIds.length}", "${groupTime.format("HH:mm:ss.SSS")}"`)
    }
    console.log("Total Game Checkouts/Updates: " + totalGroupCheckouts)
    console.log(`Total Time: "${totalGroupTime.format("HH:mm:ss.SSS")}"`)
    console.log("Unique Player Count: " + uniquePlayerCount)
    console.log("Total Player Count: " + totalPlayerCount)
//     console.log("Station Stats")
//     console.log()
//     let totalTime = moment.duration(0)
//     let totalCheckouts = 0
//     for (const k in stations) {
//         let station = stations[k]
//         totalTime = totalTime.add(station.totalCheckoutTime)
//         totalCheckouts += station.checkoutCount
//         console.log(station.name + ', ' + station.totalCheckoutTime.format('HH:mm:ss.SSS') + ', ' + station.checkoutCount)
//     }
//     console.log("Total Time: " + totalTime.format('HH:mm:ss.SSS'))
//     console.log("Total Checkouts: " + totalCheckouts)
//
//     console.log("\n============================\n")
//     console.log("Guest Stats")
//     console.log()
//     let individualGuests = 0
//     for (const k in individualGroups) {
//         const groupMatch = k.match(/^(.+)\s*[+x]\s*(\d+)$/)
//         if (groupMatch) {
//             individualGuests += parseInt(groupMatch[2])
//         } else {
//             let names = k.split(/\s*[,+\/(?:and)]+\s*/)
//             individualGuests += names.length - 1 //We're adding one later for the whole group
//         }
//
//         let player = individualGroups[k]
//         individualGuests++
//         // console.log(k + " " + player.checkoutTime.format('HH:mm:ss.SSS') + " " + player.checkoutCount)
//     }
//     console.log("Individual Groups: " + Object.keys(individualGroups).length)
//     console.log("Individual Guests: " + individualGuests)
})

function createStation(name, status, lastUpdateTimestamp) {
    let station = createSessionContainer(name)
    station.state = status
    station.lastUpdate = moment(lastUpdateTimestamp)

    return station
}

function createGame(gameName) {
    return createSessionContainer(gameName)
}

function createGroup(groupName) {
    let group = createSessionContainer(groupName)
    group.individualCount = getPlayerCountFromGroupName(groupName)
    return group
}

function createSessionContainer(name) {
    return {
        name,
        sessionIds: [],
        addSessionId(id) {
            if (!this.sessionIds.includes(id))
                this.sessionIds.push(id)
        },
        getTotalCheckoutTime() {
            let totalDuration = moment.duration(0)
            for (const sessionId of this.sessionIds) {
                const session = sessions[sessionId]
                const sessionDuration = session.getSessionDuration()
                totalDuration = moment.duration(totalDuration.add(sessionDuration))
            }
            return totalDuration
        }
    }
}

function createSession(start, end) {
    let sessionId = crypto.randomUUID()
    while (sessions[sessionId]) //Ensure we don't get UUID collisions
        sessionId = crypto.randomUUID()
    return {
        id: sessionId,
        start,
        end,
        getSessionDuration() {
            return moment.duration(moment(this.end).diff(this.start))
        }
    }
}

function getSessionDuration(session) {
    return moment.duration(moment(session.end).diff(session.start))
}

function getGroupNameFromRawName(rawName) {
    if (!rawName)
        return rawName
    return rawName.toLowerCase().trim()
}

function getPlayerCountFromGroupName(groupName) {
    let playerCount = 0
    const splitNames = groupName.split(/[,+\/]/)
    for (const individualName of splitNames) {
        const name = individualName.trim()
        if (!name)
            continue
        if (isNaN(name) && isNaN(parseFloat(name))) {
            const multiplerRegex = /\w+\s+x(\d+)/
            const multiplierMatches = name.match(multiplerRegex)
            if (multiplierMatches > 0) {
                playerCount += parseFloat(multiplierMatches[1])
            } else {
                playerCount++
            }
        } else {
            playerCount += parseFloat(name)
            if (isNaN(playerCount)) {
                console.log("Error Processing name: " + name)
                process.exit(1)
            }
        }
    }
    return playerCount
}
