const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js')

const client = new Client({
    authStrategy: new LocalAuth(),
    restartOnAuthFail: true,
})

var status = "DISCONNECTED"
const getStatus = () => status.toUpperCase()
client.on('ready', () => {
    console.log('Ready!')
    status = "CONNECTED"
})
client.on('authenticated', () => {
    console.log('Authenticated!')
    status = "CONNECTING"
})
client.on('auth_failure', () => {
    console.log('Failed to authenticate!')
    status = "UNAUTHENTICATED"
})
client.on('disconnected', () => { //this is bugged and never runs
    console.log('Disconnected!')
    status = "DISCONNECTED"
    client.destroy()
    client.initialize()
})
client.on('change_state', s => { //this is bugged and never runs
    console.log(`New state: ${state}`)
})

const initialize = () => {
    status = "INITIALIZING"
    client.initialize().then(() => console.log('Initialized!'))
}

const disconnect = async () => {
    await client.logout()
    status = "DISCONNECTED" //these 3 lines shouldnt have to be here, but
    client.destroy()        //theres this whatsappweb.js bug which makes
    client.initialize()     //event:disconnected never be thrown
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

const sendMessage = async (chatId, content, mediaUrl) => {
    const chat = await client.getChatById(chatId)
    if (mediaUrl && content) {
        const media = await MessageMedia.fromUrl(mediaUrl, { unsafeMime: true })
        chat.sendMessage(content, { media: media })
    } else if (content) {
        chat.sendMessage(content)
    } else if (mediaUrl) {
        const media = await MessageMedia.fromUrl(mediaUrl, { unsafeMime: true })
        chat.sendMessage(media)
    } else {
        throw 'missing content and media url'
    }
}

module.exports = { initialize, disconnect, getQR, getStatus, getGroups, getChatPicUrl, sendMessage }
