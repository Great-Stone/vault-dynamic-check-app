const fs = require("fs")
const express = require("express")
const request = require("request")
const config = require("../config")
const router = express.Router()

const db = require('../controller/oracleController.js')

const newUser = (req, res, next) => {
    db.newSecret(result => {
        console.log(result);
        res.body = result
        next()
    })
};

const doQuery = (req, res, next) => {
    console.log(`oracle doQuery : ${req.body.query}`)
    db.query(req.body.query, result => {
        console.log(result);
        res.body = result
        next()
    });
};

router.get( "/new", [newUser], function (req, res, next) {
        next();
    },
    function (req, res) {
        res.send(res.body);
    }
);

router.get( "/test", [doQuery], function (req, res, next) {
        req.body = "select * from tab;";
        next();
    },
    function (req, res) {
        res.send(res.body);
    }
);

router.post( "/query", [doQuery], function (req, res, next) {
        next();
    },
    function (req, res) {
        res.send(res.body);
    }
);

module.exports = router;
