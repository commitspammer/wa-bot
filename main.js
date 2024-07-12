const express = require('express')
const wa = require('./services/whatsapp.js')

wa.initialize()

const app = express()

app.use(express.static('public'))
app.set('view engine', 'ejs')

app.get('/', (req, res) => {
    res.render('index', { hello: 'World' })
})

app.get('/qrcode', (req, res) => {
    const qr = wa.getQR()
    if (qr) {
        res.render('qrcode', { qrvalue: qr })
    } else {
        res.render('load-qrcode')
    }
})

port = process.env.PORT || '4807'
app.listen(port, () => {
    console.log(`Express server running on http://localhost:${port}`)
})

module.exports = app
