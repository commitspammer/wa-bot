const fs = require('fs').promises
const { genUUID } = require('../lib/uuid.js')
const EventEmitter = require('events')

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
        changedAt: {},
    }

    this.emitter = new EventEmitter()
    this.on = (ev, cb) => this.emitter.on(ev, cb)
    this.emit = (ev, data) => this.emitter.emit(ev, data)
    this.removeListener = (ev, cb) => this.emitter.removeListener(ev, cb)

    this.getMessages = async () => {
        //TODO handle 'file not found' and 'empty file'
        const messages = JSON.parse(await fs.readFile(SAVE_FILE_PATH))
        for (i in messages) {
            if (CACHE.changedAt[messages[i].id] === undefined) {
                CACHE.changedAt[messages[i].id] = Date.now()
            }
            if (CACHE.statuses[messages[i].id] === undefined) {
                CACHE.statuses[messages[i].id] = Status.stopped
                this.emitter.emit('status-changed', Status.stopped, messages[i])
            }
            if (CACHE.timeouts[messages[i].id] === undefined) {
                CACHE.timeouts[messages[i].id] = []
            }
            messages[i].status = CACHE.statuses[messages[i].id]
            messages[i].changedAt = CACHE.changedAt[messages[i].id]
        }
        return messages
    }

    this.getMessage = async (id) => {
        const messages = await this.getMessages()
        const msg = messages.find(m => m.id === id)
        if (!msg) throw new Error('Message not found')
        return msg
    }

    this.updateMessage = async (m) => {
        const messages = await this.getMessages()
        for (i in messages) {
            if (messages[i].status !== Status.stopped) {
                throw new Error('Can\'t update a non-stopped message')
            }
            if (messages[i].id === m.id) {
                messages[i].text = m.text
                messages[i].groupIds = m.groupIds
                messages[i].media = m.media
                messages[i].waitInterval = m.waitInterval
                messages[i].sendInterval = m.sendInterval
                messages[i].status = undefined
                messages[i].changedAt = undefined
                messages[i].timeouts = undefined
                await fs.writeFile(SAVE_FILE_PATH, JSON.stringify(messages, null, 4))
                return await this.getMessage(m.id)
            }
        }
    }

    this.startMessage = async (m, send, restart) => {
        //TODO i might as well call getMessage(id)
        const messages = await this.getMessages()
        for (i in messages) {
            if (messages[i].id !== m.id) {
                continue
            }
            if (messages[i].status !== Status.stopped && !restart) {
                throw new Error('Can\'t start a non-stopped message')
            }
            const msg = messages[i]
            CACHE.timeouts[msg.id]?.forEach(t => clearTimeout(t))
            CACHE.timeouts[msg.id] = []
            CACHE.statuses[msg.id] = Status.waiting
            CACHE.changedAt[msg.id] = Date.now()
            msg.status = CACHE.statuses[msg.id]
            msg.changedAt = CACHE.changedAt[msg.id]
            this.emitter.emit('status-changed', Status.waiting, msg)
            CACHE.timeouts[msg.id].push(setTimeout(() => {
                const step = msg.sendInterval / msg.groupIds.length
                for (j in msg.groupIds) {
                    const gid = msg.groupIds[j]
                    CACHE.timeouts[msg.id].push(setTimeout(() => {
                        send(gid, msg.text, msg.media)
                    }, step * j))
                }
                CACHE.statuses[msg.id] = Status.sending
                CACHE.changedAt[msg.id] = Date.now()
                msg.status = CACHE.statuses[msg.id]
                msg.changedAt = CACHE.changedAt[msg.id]
                this.emitter.emit('status-changed', Status.sending, msg)
                CACHE.timeouts[msg.id].push(setTimeout(() => {
                    this.startMessage(msg, send, true)
                }, msg.sendInterval))
            }, msg.waitInterval))
            return await this.getMessage(m.id)
        }
    }

    this.stopMessage = async (m) => {
        CACHE.timeouts[m.id]?.forEach(t => clearTimeout(t))
        CACHE.timeouts[m.id] = []
        CACHE.statuses[m.id] = Status.stopped
        CACHE.changedAt[m.id] = Date.now()
        m.status = CACHE.statuses[m.id]
        m.changedAt = CACHE.changedAt[m.id]
        this.emitter.emit('status-changed', Status.stopped, m)
        return await this.getMessage(m.id)
    }

    this.createEmptyMessage = async () => {
        const msg = {
            id: genUUID(),
            text: "",
            media: null,
            groupIds: [],
            waitInterval: '3600000',
            sendInterval: '3600000',
            state: Status.stopped,
            changedAt: Date.now(),
        }
        const messages = await this.getMessages()
        messages.push(msg)
        await fs.writeFile(SAVE_FILE_PATH, JSON.stringify(messages, null, 4))
        return await this.getMessage(msg.id)
    }

    this.deleteMessage = async (id) => {
        let messages = await this.getMessages()
        let m = messages.find(m => m.id === id)
        if (m && m.status !== Status.stopped) {
            throw new Error('Can\'t delete a non-stopped message')
        }
        messages = messages.filter(m => m.id !== id)
        await fs.writeFile(SAVE_FILE_PATH, JSON.stringify(messages, null, 4))
    }
}

module.exports = { MessagesService, Status }
