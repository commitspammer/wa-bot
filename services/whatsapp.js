const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js')

const client = new Client({
    authStrategy: new LocalAuth(),
    restartOnAuthFail: true,
})

var status = 'LOADING'
var qr = null

const getStatus = () => status.toUpperCase()
const getQR = () => qr

const initialize = () => {
    qr = null
    console.log('Initializing!')
    status = 'INITIALIZING'
    client.initialize()
        .then(() => {
            console.log('Initialized!')
            status = 'DISCONNECTED'
        })
        .catch(() => {
            console.log('Failed!')
            status = 'FAILED (RESTART BOT)'
        })
}

client.on('qr', q => {
    console.log('QR!')
    status = 'DISCONNECTED'
    qr = q
})

client.on('disconnected', () => { //this is bugged and only runs when you logout from the mobile app
    console.log('Disconnected!')
    status = 'RESTARTING'
    client.destroy().then(() => initialize())
})

client.on('authenticated', () => {
    console.log('Authenticated!')
    status = 'CONNECTING'
})

client.on('ready', () => {
    console.log('Ready!')
    status = 'CONNECTED'
})

const disconnect = async () => {
    if (status === 'DISCONNECTED')
        throw new Error('Already disconnected')
    if (status !== 'CONNECTED')
        throw new Error('The client is not initialized')
    await client.logout()
    status = 'RESTARTING'
    client.destroy().then(() => initialize()) //this line shouldnt have to be here, but theres this whatsappweb.js bug where event:disconnected isn't emitted after client.logout()
}

const clearCache = () => {
    const fs = require('fs')
    fs.rmSync(__dirname + '/../.wwebjs_cache', { recursive: true, force: true })
    fs.rmSync(__dirname + '/../.wwebjs_auth', { recursive: true, force: true })
}

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

module.exports = { initialize, disconnect, clearCache, getQR, getStatus, getGroups, getChatPicUrl, sendMessage }
