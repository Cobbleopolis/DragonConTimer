import mongoose from 'mongoose'

export default mongoose.model('GlobalSetting', {
    name: {
        type: String,
        required: true,
        unique: true
    },
    value: {
        type: String,
        required: false
    }
})