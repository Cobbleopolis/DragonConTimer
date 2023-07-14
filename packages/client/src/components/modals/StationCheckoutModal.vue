<template>
    <div class="modal" tabindex="-1" :id="'checkoutModal' + station._id" ref="modalRoot">
        <div class="modal-dialog">
            <div class="modal-content">
            <div class="modal-header">
                <h5 class="modal-title">Modal title</h5>
                <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>
            <div class="modal-body">
                <p>Modal body text goes here.</p>
            </div>
            <div class="modal-footer">
                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
                <button type="button" class="btn btn-primary">Save changes</button>
            </div>
            </div>
        </div>
    </div>
</template>

<script setup>
import { onMounted, ref } from 'vue'
import * as bootstrap from 'bootstrap'
defineProps({
    station: Object
})

let modalRoot = ref(null)
let modalObj = null

onMounted(() => {
    modalObj = new bootstrap.Modal(modalRoot.value)
})

function _show() {
    modalObj.show()
}

function _hide() {
    modalObj.hide()
}

function _toggle() {
    modalObj.toggle()
}

defineExpose({ 
    show: _show,
    hide: _hide,
    toggle: _toggle
})

// export default {
//     props: {
//         station: Object
//     },
//     setup() {
//         const modalRoot = ref(null)

//         return {
//             modalRoot
//         }
//     },
//     data() {
//         const modal = new bootstrap.Modal(this.modalRoot, null)
//         return {
//             modal
//         }
//     },
//     methods: {
//         show() {

//         },
//         hide() {

//         },
//         toggle() {
            
//         }
//     }
// }
</script>