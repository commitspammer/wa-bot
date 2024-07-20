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
    const TIMEOUTS = {}

    this.emitter = new EventEmitter()
    this.on = (ev, cb) => this.emitter.on(ev, cb)
    this.emit = (ev, data) => this.emitter.emit(ev, data)
    this.removeListener = (ev, cb) => this.emitter.removeListener(ev, cb)

    this.getMessages = async () => {
        //TODO handle 'file not found' and 'empty file'
        const messages = JSON.parse(await fs.readFile(SAVE_FILE_PATH))
        if (!messages) throw 'messages not found'
        return messages
    }

    this.getMessage = async (id) => {
        const messages = await this.getMessages()
        const msg = messages.find(m => m.id === id)
        if (!msg) throw 'message not found'
        return msg
    }

    this.saveMessages = async (messages) => {
        await fs.writeFile(SAVE_FILE_PATH, JSON.stringify(messages, null, 4))
        return await this.getMessages()
    }

    this.saveMessage = async (msg) => {
        const messages = await this.getMessages()
        for (i in messages) {
            if (messages[i].id === msg.id) {
                messages[i] = msg
                await this.saveMessages(messages)
                return await this.getMessage(msg.id)
            }
        }
    }

    this.updateMessage = async (msg) => { //->editMessage
        const messages = await this.getMessages()
        for (i in messages) {
            if (messages[i].id === msg.id) {
                messages[i].text = msg.text
                messages[i].groupIds = msg.groupIds
                messages[i].media = msg.media
                messages[i].waitInterval = msg.waitInterval
                messages[i].sendInterval = msg.sendInterval
                //messages[i].status = msg.status
                //messages[i].timeouts = msg.timeouts
                await this.saveMessages(messages)
                return await this.getMessage(msg.id)
            }
        }
    }

    this.setMessageState = async (id, status) => {
        let msg = await this.getMessage(id)
        msg.status = status
        msg = await this.saveMessage(msg)
        this.emitter.emit('status-changed', status, msg)
        return msg
    }

    this.pushMessageTimeout = async (id, timeout) => {
        let msg = await this.getMessage(id)
        if (!TIMEOUTS[msg.id]) TIMEOUTS[msg.id] = []
        TIMEOUTS[msg.id].push(timeout)
        return msg
    }

    this.startMessage = async (m, send, restart) => {
        let msg = await this.getMessage(m.id)
        if (msg.status !== Status.stopped && !restart) {
            return msg
        }
        msg = await this.setMessageState(msg.id, Status.waiting)
        await this.pushMessageTimeout(msg.id, setTimeout(() => {
            const step = msg.sendInterval / msg.groupIds.length
            this.setMessageState(msg.id, Status.sending)
            for (i in msg.groupIds) {
                const gid = msg.groupIds[i]
                this.pushMessageTimeout(msg.id, setTimeout(() => {
                    send(gid, msg.text, msg.media)
                }, step * i))
            }
            this.pushMessageTimeout(msg.id, setTimeout(() => {
                this.startMessage(msg, send, true)
            }, msg.sendInterval))
        }, msg.waitInterval))
        return await this.getMessage(m.id)
    }

    this.stopMessage = async (m) => {
        let msg = await this.getMessage(m.id)
        TIMEOUTS[msg.id]?.forEach(t => clearTimeout(t))
        TIMEOUTS[msg.id] = []
        return await this.setMessageState(msg.id, Status.stopped)
    }

    this.createEmptyMessage = async () => {
        const msg = {
            id: genUUID(),
            text: "",
            media: null,
            groupIds: [],
            timeouts: [],
            status: Status.stopped,
            lastStatusChange: Date.now(),
        }
        const messages = await this.getMessages()
        messages.push(msg)
        return await this.saveMessages(messages)
    }

    this.deleteMessage = async (id) => {
        let messages = await this.getMessages()
        messages = messages.filter(m => m.id !== id)
        return await this.saveMessages(messages)
    }
}

module.exports = { MessagesService, Status }
