const { Client, LocalAuth } = require('whatsapp-web.js')
const qrcode = require('qrcode-terminal')
const fs = require('fs')

function log(msg, prefix) {
    prefix = prefix === undefined ? '==>' : prefix
    if (prefix === null) {
        console.log(msg)
    } else {
        console.log(prefix, msg)
    }
}

const client = new Client({
    //authStrategy: new LocalAuth({ dataPath: './.wwebjs_auth' }),
    restartOnAuthFail: true,
})

client.on('qr', qr => {
    log('Please connect by scanning the QR code below:')
    qrcode.generate(qr, { small: true })
})

client.on('auth-failure', msg => {
    log('ERROR: Authentication failed.')
    throw new Error(msg)
})

client.on('disconnected', reason => {
    log('ERROR: Client was disconnected.')
    throw new Error(reason)
})

client.once('ready', async () => {
    log('Client is ready!')

    log('Fetching groups...')
    const chats = await client.getChats()
    const groupChats = chats.filter(c => c.isGroup)
    groupChats.forEach(gc => console.log(gc.name))
    log('Done!')
    client.destroy()
})

log('Initializing...')
client.initialize().then(() => log('Initialized!'))
