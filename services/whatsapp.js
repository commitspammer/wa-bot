const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js')
const fs = require('fs').promises

const client = new Client({
    //authStrategy: new LocalAuth(),
    restartOnAuthFail: true,
})

var GROUPS_FILE_PATH = undefined
var status = 'LOADING'
var qr = null

const getStatus = () => status.toUpperCase()
const getQR = () => qr

const initialize = ({ groupsFilePath }) => {
    GROUPS_FILE_PATH = groupsFilePath || undefined
    qr = null
    console.log('Initializing!')
    status = 'INITIALIZING'
    client.initialize()
        .then(() => {
            console.log('Initialized!')
            if (status !== 'DISCONNECTED') {
                status = 'AUTHENTICATING'
            } else {
                status = 'INITIALIZED'
            }
        })
        .catch(() => {
            console.log('Failed!')
            console.log(e)
            status = 'FAILED (restart bot)'
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
    status = 'RESTARTING'
    await client.logout()
    client.destroy().then(() => initialize()) //this line shouldnt have to be here, but theres this whatsappweb.js bug where event:disconnected isn't emitted after client.logout()
}

const clearCache = () => {
    const fsSync = require('fs')
    fsSync.rmSync(__dirname + '/../.wwebjs_cache', { recursive: true, force: true })
    fsSync.rmSync(__dirname + '/../.wwebjs_auth', { recursive: true, force: true })
}

const getGroups = async () => {
    console.log('LOADING GROUPS FROM API...')
    const chats = await client.getChats()
    const groups = chats.filter(gc => gc.isGroup)
    console.log('Creating groups cache file...')
    await fs.writeFile(GROUPS_FILE_PATH, JSON.stringify(groups, null, 4))
    return groups
}

var cachedGroups = null

const getCachedGroups = async () => {
    if (cachedGroups == null) {
        try {
            cachedGroups = JSON.parse(await fs.readFile(GROUPS_FILE_PATH))
        } catch (e) {
            cachedGroups = getGroups()
        }
    }
    return cachedGroups
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

module.exports = { initialize, disconnect, clearCache, getQR, getStatus, getGroups, getCachedGroups, getChatPicUrl, sendMessage }
