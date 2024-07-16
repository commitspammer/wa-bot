const express = require('express')
const wa = require('./services/whatsapp.js')
const { MessagesService } = require('./services/messages.js')

wa.initialize()
const msg = new MessagesService()
msg.load()

const app = express()

app.use(express.static('public'))
app.use(express.json({ extended: true }))
app.use(express.urlencoded({ extended: true }))
app.set('port', process.env.PORT || '4807')
app.set('view engine', 'ejs')
app.set('views', ['views', 'views/pages',' views/comps'].map(s => __dirname+'/'+s))
app.set('whatsapp service', wa)
app.set('messages service', msg)

app.get('/favicon.ico', (req, res) => {
    res.status(204)
})

app.get('/', (req, res) => {
    res.redirect('pages/client')
})

app.get('/pages/client', (req, res) => {
    res.render('pages/client')
})

app.get('/pages/messages', (req, res) => {
    res.render('pages/messages')
})

app.get('/qrcode', (req, res) => {
    const qr = wa.getQR()
    if (qr) {
        res.render('comps/qrcode', { qrvalue: qr })
    } else {
        res.render('comps/load-qrcode')
    }
})

app.get('/status', (req, res) => {
    const status = wa.getStatus()
    res.render('comps/status', { status: status })
})

app.get('/groups/selector', async (req, res, next) => {
    try {
        const selectedIds = req.query['selected']
        const groups = await wa.getGroups()
        res.render('comps/groups-selector', { groups, selectedIds })
    } catch (e) {
        next(e)
    }
})

app.get('/chats/:id/icon', async (req, res, next) => {
    try {
        const id = req.params.id
        const url = await wa.getChatPicUrl(id, {
            fallback: 'http://localhost:4807/failed-loading-image.png'
        })
        res.render('comps/chat-icon', { src: url })
    } catch (e) {
        next(e)
    }
})

app.post('/messages', async (req, res, next) => {
    try {
        await msg.createEmptyMessage()
        res.render('comps/messages', { messages: await msg.getMessages() })
    } catch (e) {
        next(e)
    }
})

app.get('/messages', async (req, res, next) => {
    try {
        res.render('comps/messages', { messages: await msg.getMessages() })
    } catch (e) {
        next(e)
    }
})

app.get('/messages/:id', async (req, res, next) => {
    try {
        const id = req.params.id
        res.render('comps/message', { message: await msg.getMessage(id) })
    } catch (e) {
        next(e)
    }
})

app.get('/messages/:id/edit', async (req, res, next) => {
    try {
        const id = req.params.id
        res.render('comps/edit-message', { message: await msg.getMessage(id) })
    } catch (e) {
        next(e)
    }
})

app.put('/messages/:id', async (req, res, next) => {
    try {
        const id = req.params.id
        const m = await msg.getMessage(id)
        m.text = req.body.text
        await msg.updateMessage(m)
        res.render('comps/message', { message: m })
    } catch (e) {
        next(e)
    }
})

app.delete('/messages/:id', async (req, res, next) => {
    try {
        const id = req.params.id
        await msg.deleteMessage(id)
        res.send('')
    } catch (e) {
        next(e)
    }
})

app.listen(app.get('port'), () => {
    console.log(`Server running on http://localhost:${app.get('port')}`)
})

module.exports = app
