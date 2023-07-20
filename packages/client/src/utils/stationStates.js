const DEFAULT = 'DEFAULT'
const CHECKED_OUT = 'CHECKED_OUT'
const NOT_AVAILABLE = 'NOT_AVAILABLE'

function getDisplayName(state) {
    if (state === DEFAULT) {
        return 'Default'
    } else if (state === CHECKED_OUT) {
        return 'Checked Out'
    } else if (state === NOT_AVAILABLE) {
        return 'Not Available'
    } else {
        return 'Unknown State'
    }
}

export default {
    DEFAULT,
    CHECKED_OUT,
    NOT_AVAILABLE,
    getDisplayName
}