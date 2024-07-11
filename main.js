const express = require('express')

const app = express()

app.set('view engine', 'ejs')
//app.set('view engine', 'html')
//app.engine('html', ejs.renderFile)

app.get('/', (req, res) => {
    res.render('index', { hello: 'World' })
})

port = process.env.PORT || '4807'
app.listen(port, () => {
    console.log(`Express server running on http://localhost:${port}`)
})
