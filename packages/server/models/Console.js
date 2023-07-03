import mongoose from 'mongoose'

export default mongoose.model('Console', {
    name: {
        type: String,
        required: true
    },
    games: {
        type: [
            {
                _id: false, 
                name: {
                    type: String,
                    required: true
                }, 
                count: {
                    type: Number,
                    default: 1,
                    required: true
                }
            }
        ],
        required: false
    }
})