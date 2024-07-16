const { Client, LocalAuth } = require('whatsapp-web.js')

const client = new Client({
    authStrategy: new LocalAuth(),
    restartOnAuthFail: true,
})

var status = "DISCONNECTED"
const getStatus = () => status.toUpperCase()
client.once('ready', () => {
    console.log('Ready!')
    status = "CONNECTED"
})
client.once('authenticated', () => {
    console.log('Authenticated!')
    status = "CONNECTING"
})
client.once('auth_failure', () => {
    console.log('Failed to authenticate!')
    status = "UNAUTHENTICATED"
})
client.once('disconnected', () => {
    console.log('Disconnected!')
    status = "DISCONNECTED"
})
client.on('change_state', s => {
    console.log(`New state: ${state}`)
})

const initialize = () => {
    status = "INITIALIZING"
    client.initialize().then(() => console.log('Initialized!'))
}

var qr = null
const getQR = () => qr
client.on('qr', q => {
    status = "DISCONNECTED"
    qr = q
})

var groups = null
const getGroups = async () => {
    try {
        if (groups == null) {
            const chats = await client.getChats()
            groups = chats.filter(gc => gc.isGroup)
        }
        return groups
    } catch (e) {
        return null
    }
}

const getChatPicUrl = async (chatId, { fallback }) => {
    try {
        const chat = await client.getChatById(chatId)
        const contact = await chat.getContact()
        const url = await contact.getProfilePicUrl()
        return url
    } catch (e) {
        return fallback || ''
    }
}

module.exports = { initialize, getQR, getStatus, getGroups, getChatPicUrl }
