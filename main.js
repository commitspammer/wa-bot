const express = require('express')
const multer = require('multer')
const ejs = require('ejs')
const wa = require('./services/whatsapp.js')
const { MessagesService, Status } = require('./services/messages.js')

wa.initialize({
    groupsFilePath: __dirname + '/groups.json',
})
const msg = new MessagesService({
    saveFilePath: __dirname + '/save.json',
})

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

//app.use((req, res, next) => {
//    console.log(req.originalUrl)
//    next()
//})

app.set('port', process.env.PORT || '4807')
app.set('host', process.env.HOST || 'localhost')
app.set('view engine', 'ejs')
app.set('views', ['views', 'views/pages', 'views/comps', 'views/events'].map(s => __dirname+'/'+s))
app.set('whatsapp service', wa)
app.set('messages service', msg)

app.use(express.static('public'))
app.use(express.json({ extended: true }))
app.use(express.urlencoded({ extended: true }))

app.locals.parseQueryList = (q) => {
    return [ q ].flatMap(x => x).filter(x => typeof x === 'string')
}
app.locals.parseIntervalToMs = (v, u) => {
    let c = u.charAt(0).toLowerCase()
    return c == 'd' ? v * 1000 * 60 * 60 * 24 : c == 'h' ? v * 1000 * 60 * 60
        : c == 'm' ? v * 1000 * 60 : c == 's' ? v * 1000 : 0
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
    res.status(200).render('pages/client')
})

app.get('/pages/messages', (req, res) => {
    res.status(200).render('pages/messages')
})

app.get('/client/qrcode', (req, res) => {
    const qr = wa.getQR()
    res.status(200)
    if (wa.getStatus() === 'CONNECTED') {
        res.render('comps/no-qrcode')
    } else if (qr) {
        res.render('comps/qrcode', { qrvalue: qr })
    } else {
        res.render('comps/load-qrcode')
    }
})

app.get('/client/status', (req, res) => {
    const status = wa.getStatus()
    res.status(200).render('comps/status', { status: status })
})

app.post('/client/disconnect', async (req, res, next) => {
    try {
        await wa.disconnect()
        res.status(204).send()
    } catch (e) {
        next(e)
    }
})

app.post('/client/clear-cache', async (req, res, next) => {
    try {
        wa.clearCache()
        res.status(200).send('Cache successfully cleared. Please restart the bot (Ctrl+C -> npm start)')
    } catch (e) {
        next(e)
    }
})

app.get('/client/groups-selector', async (req, res, next) => {
    try {
        const checkedIds = app.locals.parseQueryList(req.query.checked)
        const cached = req.query.cached
        let groups
        if (cached === 'true') {
            groups = await wa.getCachedGroups()
        } else {
            groups = await wa.getGroups()
        }
        res.status(200).render('comps/groups-selector', { groups, checkedIds })
    } catch (e) {
        next(e)
    }
})

app.get('/client/chats/:id/icon', async (req, res, next) => {
    try {
        const id = req.params.id
        const h = req.app.get('host')
        const p = req.app.get('port')
        const url = await wa.getChatPicUrl(id, {
            fallback: `http://${h}:${p}/failed-loading-image.png`
        })
        res.status(200).render('comps/chat-icon', { src: url })
    } catch (e) {
        next(e)
    }
})

app.post('/messages', async (req, res, next) => {
    try {
        await msg.createEmptyMessage()
        res.status(200).render('comps/messages', { messages: await msg.getMessages() })
    } catch (e) {
        next(e)
    }
})

app.get('/messages', async (req, res, next) => {
    try {
        res.status(200).render('comps/messages', { messages: await msg.getMessages() })
    } catch (e) {
        next(e)
    }
})

app.get('/messages/:id', async (req, res, next) => {
    try {
        const id = req.params.id
        res.status(200).render('comps/message', { message: await msg.getMessage(id) })
    } catch (e) {
        next(e)
    }
})

const requireClient = (req, res, next) => {
    if (wa.getStatus() === 'CONNECTED') {
        next()
    } else {
        throw new Error('The whatsapp client is not connected')
    }
}

app.get('/messages/:id/edit', requireClient, async (req, res, next) => {
    try {
        const id = req.params.id
        const m = await msg.getMessage(id)
        if (m.status !== Status.stopped) {
            throw new Error('Stop the message before editing')
        }
        res.status(200).render('comps/edit-message', { message: m })
    } catch (e) {
        next(e)
    }
})

app.put('/messages/:id', upload.single('media'), requireClient, async (req, res, next) => {
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
        res.status(200).render('comps/message', { message: m })
    } catch (e) {
        next(e)
    }
})

app.post('/messages/:id/send/start', requireClient, async (req, res, next) => {
    try {
        const id = req.params.id
        let m = await msg.getMessage(id)
        m = await msg.startMessage(m, (gid, text, media) => {
            let md = media
            if (media && media[0] === '/') {
                md = `http://${app.get('host')}:${app.get('port')}${media}`
            }
            console.log('====TRYING TO SEND NOW====')
            console.log({
                Time: (new Date).toLocaleString('pt-BR'),
                ID: gid, Text: text, Media: md
            })
            console.log('==========================')
            wa.sendMessage(gid, text, md)
                .then(() => console.log(`A message was sent to ${gid}`))
                .catch(console.log)
        })
        res.status(200).render('comps/message', { message: m })
    } catch (e) {
        next(e)
    }
})

app.post('/messages/:id/send/stop', async (req, res, next) => {
    try {
        const id = req.params.id
        let m = await msg.getMessage(id)
        m = await msg.stopMessage(m)
        res.status(200).render('comps/message', { message: m })
    } catch (e) {
        next(e)
    }
})

app.post('/messages/send/start', requireClient, async (req, res, next) => {
    try {
        const messages = await msg.getMessages()
        for (i in messages) {
            const m = messages[i]
            await msg.startMessage(m, (gid, text, media) => {
                let md = media
                if (media && media[0] === '/') {
                    md = `http://${app.get('host')}:${app.get('port')}${media}`
                }
                console.log('====TRYING TO SEND NOW====')
                console.log({
                    Time: (new Date).toLocaleString('pt-BR'),
                    ID: gid, Text: text, Media: md
                })
                console.log('==========================')
                wa.sendMessage(gid, text, md)
                    .then(() => console.log(`A message was sent to ${gid}`))
                    .catch(console.log)
            })
        }
        res.status(200).render('comps/messages', { messages: await msg.getMessages() })
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
        res.status(200).render('comps/messages', { messages: await msg.getMessages() })
    } catch (e) {
        next(e)
    }
})

app.get('/messages/status/events', async (req, res, next) => {
    try {
        res.setHeader('Cache-Control', 'no-cache')
        res.setHeader('Content-Type', 'text/event-stream')
        res.setHeader('Connection', 'keep-alive')
        res.flushHeaders()
        const writeEvent = (e) => (s, m) => {
            const ev = e + '-' + m.id
            req.app.render('events/message-status.ejs', {
                event: ev,
                message: m,
            }, (err, data) => {
                const body = 'event: ' + ev + '\n' + data.replaceAll('\n', '\ndata: ')
                err ? console.log(err) : res.write(`${body}\n\n`)
            })
        }
        const messages = await msg.getMessages()
        for (i in messages) {
            const writeEventCurrentStatus = writeEvent('current-status')
            writeEventCurrentStatus(messages[i].status, messages[i])
        }
        const writeEventStatusChanged = writeEvent('status-changed')
        msg.on('status-changed', writeEventStatusChanged)
        res.on('close', () => {
            msg.removeListener('status-changed', writeEventStatusChanged)
            res.status(200).end()
        })
    } catch (e) {
        next(e)
    }
})

app.delete('/messages/:id', async (req, res, next) => {
    try {
        const id = req.params.id
        await msg.deleteMessage(id)
        res.status(200).send('')
    } catch (e) {
        next(e)
    }
})

app.use((err, req, res, next) => {
    console.warn(err.stack)
    res.status(500).send(err.message + '\n\n\n\n\n\n' + err.stack)
})

app.listen(app.get('port'), app.get('host'), () => {
    console.log(`Server running on http://${app.get('host')}:${app.get('port')}`)
})

module.exports = app
