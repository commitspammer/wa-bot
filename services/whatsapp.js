const { Client, LocalAuth } = require('whatsapp-web.js')

const client = new Client({
    authStrategy: new LocalAuth(),
    restartOnAuthFail: true,
})

const initialize = () => {
    client.initialize().then(() => console.log('Initialized!'))
}

var qr = null
const getQR = () => qr
client.on('qr', q => {
    qr = q
})

var state = null
const getState = () => state
client.on('change_state', s => {
    state = s
    console.log(state)
})

var groups = null
const getGroups = async () => {
    if (groups == null) {
        const chats = await client.getChats()
        groups = chats.filter(gc => gc.isGroup)
    }
    return groups
}

client.once('ready', async () => {
    console.log('Client is ready!')
})

module.exports = { initialize, getQR, getGroups }
