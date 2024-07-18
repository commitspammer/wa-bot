const fs = require('fs').promises
const { genUUID } = require('../lib/uuid.js')

const Status = {
    stopped: 'STOPPED',
    waiting: 'WAITING',
    sending: 'SENDING',
}

function MessagesService() {
    const SAVE_FILE_PATH = './save.json'
    const CACHE = {
        timeouts: {},
        statuses: {},
    }

    this.getMessages = async () => {
        //TODO handle 'file not found' and 'empty file'
        const messages = JSON.parse(await fs.readFile(SAVE_FILE_PATH))
        for (i in messages) {
            if (CACHE.statuses[messages[i].id] === undefined) {
                CACHE.statuses[messages[i].id] = Status.stopped
            }
            if (CACHE.timeouts[messages[i].id] === undefined) {
                CACHE.timeouts[messages[i].id] = []
            }
            messages[i].status = CACHE.statuses[messages[i].id]
        }
        return messages
    }

    this.getMessage = async (id) => {
        const messages = await this.getMessages()
        const msg = messages.find(m => m.id === id)
        if (msg === null) throw 'not found'
        return msg
    }

    this.updateMessage = async (m) => {
        const messages = await this.getMessages()
        for (i in messages) {
            if (messages[i].id === m.id) {
                messages[i].text = m.text
                messages[i].groupIds = m.groupIds
                messages[i].media = m.media
                messages[i].waitInterval = m.waitInterval
                messages[i].sendInterval = m.sendInterval
                break
            }
        }
        await fs.writeFile(SAVE_FILE_PATH, JSON.stringify(messages, null, 4))
    }

    this.startMessage = async (m, send) => {
        const messages = await this.getMessages()
        for (i in messages) {
            if (messages[i].id !== m.id) {
                continue
            }
            const msg = messages[i]
            CACHE.statuses[msg.id] = Status.waiting
            CACHE.timeouts[msg.id].push(setTimeout(() => {
                const step = msg.sendInterval / msg.groupIds.length
                for (j in msg.groupIds) {
                    const gid = msg.groupIds[j]
                    CACHE.timeouts[msg.id].push(setTimeout(() => {
                        send(gid, msg.text, msg.media)
                    }, step * j))
                }
                CACHE.statuses[msg.id] = Status.sending
                CACHE.timeouts[msg.id].push(setTimeout(() => {
                    this.startMessage(msg, send)
                }, msg.sendInterval))
            }, msg.waitInterval))
            break
        }
    }

    this.stopMessage = async (m) => {
        CACHE.timeouts[m.id]?.forEach(t => clearTimeout(t))
        CACHE.timeouts[m.id] = []
        CACHE.statuses[m.id] = Status.stopped
    }

    this.createEmptyMessage = async () => {
        const msg = {
            id: genUUID(),
            text: "",
            media: null,
            groupIds: [],
        }
        const messages = await this.getMessages()
        messages.push(msg)
        await fs.writeFile(SAVE_FILE_PATH, JSON.stringify(messages, null, 4))
    }

    this.deleteMessage = async (id) => {
        let messages = await this.getMessages()
        messages = messages.filter(m => m.id !== id)
        await fs.writeFile(SAVE_FILE_PATH, JSON.stringify(messages, null, 4))
    }
}

module.exports = { MessagesService, Status }
