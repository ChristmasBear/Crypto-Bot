const mongoose = require('mongoose')
const { Schema } = mongoose;

const settingsSchema = new Schema({
    _id: String,
    defaultCurrency: String,
    prefix: String,
    mainCoin: String
})

module.exports = mongoose.model('crypto-bot.settings', settingsSchema)