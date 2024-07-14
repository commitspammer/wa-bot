const express = require('express')
const wa = require('./services/whatsapp.js')
const { MessagesService } = require('./services/messages.js')

wa.initialize()
const msg = new MessagesService()
msg.load()

const app = express()

app.use(express.static('public'))
app.set('view engine', 'ejs')
app.set('whatsapp service', wa)
app.set('messages service', msg)

app.get('/', async (req, res) => {
    const m = await msg.getMessages()
    res.render('index', { messages: m })
})

app.get('/qrcode', (req, res) => {
    const qr = wa.getQR()
    if (qr) {
        res.render('qrcode', { qrvalue: qr })
    } else {
        res.render('load-qrcode')
    }
})

app.get('/status', (req, res) => {
    const status = wa.getStatus()
    res.render('status', { status: status })
})

//app.get('/messages', async (req, res, next) => {
//    try {
//        res.render('messages', { messages: await msg.getMessages() })
//    } catch (e) {
//        next(e)
//    }
//})

//app.put('/messages/:id', (req, res) => {
//    await msg.saveMessage()
//})

port = process.env.PORT || '4807'
app.listen(port, () => {
    console.log(`Express server running on http://localhost:${port}`)
})

module.exports = app
