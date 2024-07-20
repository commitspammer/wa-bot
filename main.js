const express = require('express')
const multer = require('multer')
const ejs = require('ejs')
const wa = require('./services/whatsapp.js')
const { MessagesService } = require('./services/messages.js')

wa.initialize()
const msg = new MessagesService()

const app = express()
const upload = multer({ storage: multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, __dirname + '/public/')
    },
    filename: function (req, file, cb) {
        const ext = file.originalname.split('.').slice(1).pop()
        cb(null, Date.now() + (ext ? '.' + ext : ''))
    }
})})

app.use(express.static('public'))
app.use(express.json({ extended: true }))
app.use(express.urlencoded({ extended: true }))
app.set('port', process.env.PORT || '4807')
app.set('view engine', 'ejs')
app.set('views', ['views', 'views/pages',' views/comps'].map(s => __dirname+'/'+s))
app.set('whatsapp service', wa)
app.set('messages service', msg)

app.locals.parseQueryList = (q) => {
    return [ q ].flatMap(x => x).filter(x => typeof x === 'string')
}
app.locals.parseIntervalToMs = (v, u) => {
    let c = u.charAt(0).toLowerCase()
    return c == "d" ? v * 1000 * 60 * 60 * 24 : c == "h" ? v * 1000 * 60 * 60
        : c == "m" ? v * 1000 * 60 : c == "s" ? v * 1000 : 0
}
app.locals.parseIntervalToStr = (ms) => {
    return ms % (1000 * 60 * 60 * 24) === 0 ? `${ms / (1000 * 60 * 60 * 24)}d`
        : ms % (1000 * 60 * 60) === 0 ? `${ms / (1000 * 60 * 60)}h`
        : ms % (1000 * 60) === 0 ? `${ms / (1000 * 60)}m`
        : ms % (1000) === 0 ? `${ms / (1000)}s` : `${ms}ms`
}
app.locals.parseIntervalToValueUnit = (ms) => {
    return ms % (1000 * 60 * 60 * 24) === 0 ? [ms / (1000 * 60 * 60 * 24), 's']
        : ms % (1000 * 60 * 60) === 0 ? [ms / (1000 * 60 * 60), 'h']
        : ms % (1000 * 60) === 0 ? [ms / (1000 * 60), 'm']
        : ms % (1000) === 0 ? [ms / (1000), 's'] : [ms, 'ms']
}

app.get('/favicon.ico', (req, res) => {
    res.status(204).send()
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

app.get('/groups-selector', async (req, res, next) => {
    try {
        const checkedIds = app.locals.parseQueryList(req.query.checked)
        const groups = await wa.getGroups()
        res.render('comps/groups-selector', { groups, checkedIds })
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

app.put('/messages/:id', upload.single('media'), async (req, res, next) => {
    try {
        const id = req.params.id
        let m = await msg.getMessage(id)
        m.text = req.body.text || ''
        m.groupIds = app.locals.parseQueryList(req.body.gid)
        m.media = req.file ? `/${req.file.filename}` : m.media
        if (req.body.deletemedia === 'true') m.media = null
        m.waitInterval = app.locals.parseIntervalToMs(req.body.waitValue, req.body.waitUnit)
        m.sendInterval = app.locals.parseIntervalToMs(req.body.sendValue, req.body.sendUnit)
        m = await msg.updateMessage(m)
        res.render('comps/message', { message: m })
    } catch (e) {
        next(e)
    }
})

app.post('/messages/:id/send/start', async (req, res, next) => {
    try {
        const id = req.params.id
        let m = await msg.getMessage(id)
        m = await msg.startMessage(m, (gid, text, media) => {
            let md = media
            if (media && media[0] === '/') {
                md = `http://localhost:${app.get('port')}${media}`
            }
            console.log(gid, text, md)
            wa.sendMessage(gid, text, md).catch(console.log)
        })
        res.render('comps/message', { message: m })
    } catch (e) {
        next(e)
    }
})

app.post('/messages/:id/send/stop', async (req, res, next) => {
    try {
        const id = req.params.id
        let m = await msg.getMessage(id)
        m = await msg.stopMessage(m)
        res.render('comps/message', { message: m })
    } catch (e) {
        next(e)
    }
})

app.post('/messages/send/start', async (req, res, next) => {
    try {
        const messages = await msg.getMessages()
        for (i in messages) {
            const m = messages[i]
            await msg.startMessage(m, (gid, text, media) => {
                let md = media
                if (media && media[0] === '/') {
                    md = `http://localhost:${app.get('port')}${media}`
                }
                console.log(gid, text, md)
                wa.sendMessage(gid, text, md).catch(console.log)
            })
        }
        res.render('comps/messages', { messages: await msg.getMessages() })
    } catch (e) {
        next(e)
    }
})

app.post('/messages/send/stop', async (req, res, next) => {
    try {
        const messages = await msg.getMessages()
        for (i in messages) {
            const m = messages[i]
            await msg.stopMessage(m)
        }
        res.render('comps/messages', { messages: await msg.getMessages() })
    } catch (e) {
        next(e)
    }
})

app.get('/messages/:id/events', async (req, res, next) => {
    try {
        res.setHeader('Cache-Control', 'no-cache')
        res.setHeader('Content-Type', 'text/event-stream')
        res.setHeader('Access-Control-Allow-Origin', '*')
        res.setHeader('Connection', 'keep-alive')
        res.flushHeaders()
        const id = req.params.id
        const message = await msg.getMessage(id)
        const writeEvent = (e) => (s, m) => {
            if (m.id === message.id) {
                //res.write(`event: status-changed\ndata: ${s} ${Date.now()}\n\n`)
                const data = ejs.renderFile(__dirname + '/views/events/message-status.ejs', {
                    event: e,
                    status: s,
                }, (err, data) => {
                    err ? console.log(err) : res.write(`${data}\n\n`)
                })
            }
        }
        const writeEventCurrentStatus = writeEvent('current-status')
        writeEventCurrentStatus(message.status, message)
        const writeEventStatusChanged = writeEvent('status-changed')
        msg.on('status-changed', writeEventStatusChanged)
        res.on('close', () => {
            msg.removeListener('status-changed', writeEventStatusChanged)
            res.end()
        })
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
