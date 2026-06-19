import { Tooltip, Popover, Dropdown } from 'bootstrap'
import '@popperjs/core'

const tooltip = {
    mounted(el) {
        const tooltip = new Tooltip(el)
    }
}

const popover = {
    mounted(el) {
        const popover = new Popover(el, {})
    }
}

const dropdown = {
    mounted(el) {
        const dropdown = new Dropdown(el)
        console.log(dropdown)
    }
}

export default {
    tooltip,
    popover,
    dropdown,
}