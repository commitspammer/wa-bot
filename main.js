const express = require('express')
const wa = require('./services/whatsapp.js')
const { MessagesService } = require('./services/messages.js')

wa.initialize()
const msg = new MessagesService()
msg.load()

const app = express()

app.use(express.static('public'))
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

app.get('/messages', async (req, res, next) => {
    try {
        res.render('comps/messages', { messages: await msg.getMessages() })
    } catch (e) {
        next(e)
    }
})

app.get('/chats/:id/icon', async (req, res, next) => {
    try {
        console.log('sus')
        const id = req.params.id
        const url = await wa.getChatPicUrl(id, {
            fallback: 'http://localhost:4807/plainwhite.png'
        })
        res.render('comps/chat-icon', { src: url })
    } catch (e) {
        next(e)
    }
})

app.listen(app.get('port'), () => {
    console.log(`Server running on http://localhost:${app.get('port')}`)
})

module.exports = app
