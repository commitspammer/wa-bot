const express = require('express')
const wa = require('./services/whatsapp.js')
const { MessagesService } = require('./services/messages.js')

wa.initialize()
const msg = new MessagesService()
msg.load()

const app = express()

app.use(express.static('public'))
app.set('view engine', 'ejs')
app.set('views', ['views', 'views/pages',' views/comps'].map(s => __dirname+'/'+s))
app.set('whatsapp service', wa)
app.set('messages service', msg)

//const render = (res, path, params) => {
//    for (let [k, v] of Object.entries(params)) {
//        res.locals[k] = v
//    }
//    res.render('index', { page: path })
//}

app.get('/', async (req, res) => {
    res.redirect('pages/client')
})

app.get('/pages/client', async (req, res) => {
    res.render('pages/client', {})
})

app.get('/pages/messages', async (req, res) => {
    const m = await msg.getMessages()
    res.render('pages/messages', { messages: m })
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
