import fs from 'fs'
import path from 'path'
import moment from 'moment'
import momentDurationSetup from 'moment-duration-format'

momentDurationSetup(moment)

const fileName = 'DCT-Telemetry-Boardgames-2025.json'

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

    const individualGroups = {}
    const stations = {}
    const games = {}

    for (const telemetryEntry of telemetry) {
        if (moment(telemetryEntry.timestamp).year() !== 2024)
            continue;
        if (telemetryEntry.eventType === "stationCreate") {
            stations[telemetryEntry.oldState._id] = {
                totalCheckoutTime: moment.duration(0),
                checkoutCount: 0,
                state: telemetryEntry.oldState.status,
                name: telemetryEntry.oldState.name,
                lastUpdate: moment(telemetryEntry.timestamp)
            }
        }
        if (telemetryEntry.eventType === "stationUpdate") {

            let station = stations[telemetryEntry.mutationArgs._id]

            if (!station) {
                if (!telemetryEntry.oldState)
                    continue;
                station = {
                    totalCheckoutTime: moment.duration(0),
                    checkoutCount: 0,
                    state: "DEFAULT",
                    name: telemetryEntry.oldState.name,
                    lastUpdate: moment(telemetryEntry.timestamp),
                    checkouts: []
                }
            } else {
                let checkoutEntry = {
                    start: moment(station.lastUpdate),
                    end: moment(telemetryEntry.timestamp),
                }
                if (telemetryEntry.mutationArgs.record.playerName) {
                    let rawName = telemetryEntry.mutationArgs.record.playerName.toLowerCase()
                    // for (let individualName of rawName.split(/[,+\/]/)) {
                    //     var guestName = individualName.trim()
                    //     let guest = individualGuests[guestName]
                    //     if (!guest) {
                    //         guest = {
                    //             checkoutTime: moment.duration(moment(telemetryEntry.timestamp).diff(station.lastUpdate)),
                    //             checkoutCount: 1,
                    //             lastUpdate: moment(telemetryEntry.timestamp)
                    //         }
                    //     } else {
                    //         let checkoutDuration = moment.duration(moment(telemetryEntry.timestamp).diff(guest.lastUpdate))
                    //         guest.checkoutTime = guest.checkoutTime.add(checkoutDuration)
                    //         guest.checkoutCount++
                    //     }
                    //     guest.lastUpdate = moment(telemetryEntry.timestamp)
                    //     individualGuests[guestName] = guest
                    // }

                    let guestName = rawName.replaceAll("\"", "")
                    let guest = individualGroups[guestName]
                    if (!guest) {
                        guest = {
                            totalCheckoutTime: moment.duration(moment(telemetryEntry.timestamp).diff(station.lastUpdate)),
                            checkoutCount: 1,
                            lastUpdate: moment(telemetryEntry.timestamp),
                            checkouts: [checkoutEntry]
                        }
                    } else {
                        let checkoutDuration = moment.duration(moment(telemetryEntry.timestamp).diff(station.lastUpdate))
                        guest.totalCheckoutTime = guest.totalCheckoutTime.add(checkoutDuration)
                        guest.checkoutCount++
                        guest.checkouts.push(checkoutEntry)
                    }
                    guest.lastUpdate = moment(telemetryEntry.timestamp)
                    individualGroups[guestName] = guest
                }
                if (station.state === "CHECKED_OUT" && telemetryEntry.mutationArgs.record.status === "DEFAULT") { //Returning
                    let checkoutDuration = moment.duration(moment(telemetryEntry.timestamp).diff(station.lastUpdate))
                    station.totalCheckoutTime = moment.duration(station.totalCheckoutTime.add(checkoutDuration))
                    station.checkoutCount++
                    if (!station.checkouts) {
                        station.checkouts = []
                    }
                    station.checkouts.push(checkoutEntry)
                }
                station.state = telemetryEntry.mutationArgs.record.status
                station.lastUpdate = moment(telemetryEntry.timestamp)
            }
            stations[telemetryEntry.mutationArgs._id] = station
        }
    }

    // Printing info
    console.log("Station Stats")
    console.log()
    let totalTime = moment.duration(0)
    let totalCheckouts = 0
    for (const k in stations) {
        let station = stations[k]
        totalTime = totalTime.add(station.totalCheckoutTime)
        totalCheckouts += station.checkoutCount
        console.log(station.name + ', ' + station.totalCheckoutTime.format('HH:mm:ss.SSS') + ', ' + station.checkoutCount)
    }
    console.log("Total Time: " + totalTime.format('HH:mm:ss.SSS'))
    console.log("Total Checkouts: " + totalCheckouts)

    console.log("\n============================\n")
    console.log("Guest Stats")
    console.log()
    let individualGuests = 0
    for (const k in individualGroups) {
        const groupMatch = k.match(/^(.+)\s*[+x]\s*(\d+)$/)
        if (groupMatch) {
            individualGuests += parseInt(groupMatch[2])
        } else {
            let names = k.split(/\s*[,+\/(?:and)]+\s*/)
            individualGuests += names.length - 1 //We're adding one later for the whole group
        }

        let player = individualGroups[k]
        individualGuests++
        // console.log(k + " " + player.checkoutTime.format('HH:mm:ss.SSS') + " " + player.checkoutCount)
    }
    console.log("Individual Groups: " + Object.keys(individualGroups).length)
    console.log("Individual Guests: " + individualGuests)
})

function getCheckoutEntryDuration(checkoutEntry) {
    return moment.duration(moment(checkoutEntry.end).diff(checkoutEntry.start))
}
