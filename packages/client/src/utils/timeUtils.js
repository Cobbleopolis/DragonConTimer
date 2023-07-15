import moment from 'moment'

export default {
    formatDurationFormat(momentObj) {
        if (moment.isDuration(momentObj)) {
            return (momentObj.hours() | 0) + ':' + moment.utc(momentObj.asMilliseconds()).format('mm:ss')
        } else {
            return null
        }
    },
    dateTimeFormat(momentObj) {
        return momentObj.local().format('Y-MM-DDTHH:mm')
    }
}