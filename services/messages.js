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
        return cache.messages
    }

    this.saveMessage = async (m) => {
        const messages = await this.getMessages()
        for (i in messages) {
            if (messages[i].id === m.id) {
                messages[i] = m
            }
        }
    }
}

module.exports = { MessagesService }
