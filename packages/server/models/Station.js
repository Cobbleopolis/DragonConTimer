import mongoose from 'mongoose'

export default mongoose.model('Station', { 
    name: {
        type: String,
        required: true
    },
    status: {
        type: String,
        required: true
    },
    consoleOptions: {
        type: [mongoose.Types.ObjectId],
        required: true
    },
    playerName: {
        type: String,
        required: false
    },
    currentConsole: {
        type: mongoose.Types.ObjectId,
        required: false
    },
    currentExtras: {
        type: [
            {
                _id: false,
                extraId: {
                    type: mongoose.Types.ObjectId,
                    required: true
                },
                count: {
                    type: Number,
                    default: 0,
                    required: true
                }
            }
        ]
    },
    currentGame: {
        type: String,
        required: false
    },
    checkoutTime: {
        type: Date,
        requied: false
    },
    notes: {
        type: String,
        requied: false
    }
})