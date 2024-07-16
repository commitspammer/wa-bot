const fs = require('fs').promises

function MessagesService() {
    const SAVE_FILE_PATH = './save.json'

    const cache = {
        messages: undefined
    }

    this.load = async () => {
        const messages = JSON.parse(await fs.readFile(SAVE_FILE_PATH))
        //const messages = JSON.parse(fs.readFileSync(SAVE_FILE_PATH))
        console.log(messages)
        cache.messages = messages
    }

    this.getMessages = async () => {
        if (cache.messages === undefined) {
            await load()
        }
        //return cache.messages //no cache being used for now
        const messages = JSON.parse(await fs.readFile(SAVE_FILE_PATH))
        return messages
    }

    this.getMessage = async (id) => {
        const messages = await this.getMessages()
        const msg = messages.find(m => m.id == id)
        if (msg === null) throw 'not found'
        return msg
    }

    this.saveMessage = async (m) => {
        const messages = await this.getMessages()
        for (i in messages) {
            if (messages[i].id === m.id) {
                messages[i].text = m.text
            }
        }
        await fs.writeFile(SAVE_FILE_PATH, JSON.stringify(messages, null, 4))
    }
}

module.exports = { MessagesService }
