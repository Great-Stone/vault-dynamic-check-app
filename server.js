const express = require('express')
const app = express()
app.use(express.json())
app.use(express.urlencoded({ extended: true}))

const msslqRouter = require('./routes/mssql');
const oracleRouter = require('./routes/oracle');
const mongodbRouter = require('./routes/mongodb');
const elasticRouter = require('./routes/elastic');

app.use('/mssql', msslqRouter);
app.use('/oracle', oracleRouter);
app.use('/mongodb', mongodbRouter);
app.use('/elastic', elasticRouter);

app.use(express.static('public'));

app.listen(3000, () => {
    console.log('Vault DB Checker - port 3000')
})