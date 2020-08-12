var express = require('express');
var router = express.Router();
var helpers = require('../helpers/auth');
const bcrypt = require('bcrypt');

let checkOption = {
  id: true,
  name: true,
  email: true,
  position: true,
  typejob: true
}

module.exports = (db) => {

  /* GET users listing. */
  router.get('/', function (req, res, next) {

    let sqlUsers = `SELECT * FROM users`;
    db.query(sqlUsers, (err, data) => {
      if (err) return res.json(err)
      res.render('users/list', {
        data: data.rows,
        option: checkOption
      })
    })
  });

 // ----------------------------
  router.post('/option', (req, res) => {
    checkOption.id = req.body.checkid;
    checkOption.name = req.body.checkname;
    checkOption.email = req.body.checkemail;
    checkOption.position = req.body.checkposition;
    checkOption.typejob = req.body.checktypejob;
    res.redirect('/users')
  })

 //------------------------
  router.get('/add', function (req, res, next) {
    let sql = `SELECT DISTINCT position FROM users`
    db.query(sql, (err, data) => {
      if (err) return res.status(500).json(err)

      res.render('users/add', { data : data.rows})
    })
  });

  //-----------------------
  router.post('/add', function (req, res, next) {
    let { firstname, lastname, email, password, typejob, position, as } = req.body

    bcrypt.hash(password, 10, (err, hash) => {
      if (err) return res.status(500).json(err)

      let sql = `INSERT INTO users (firstname, lastname, email, password, typejob, position, as) VALUES ($1,$2,$3,$4,$5,$6,$7)`
      let value = [firstname, lastname, email, hash, typejob, position, as]

      db.query(sql, value, (err) => {
        if (err) return res.status(500).json(err)

        res.redirect('/users')
      })
    });
  });

  router.get('/edit/:userid', function (req, res, next) {
    let userid = req.params.userid
    let sql = `SELECT * FROM users WHERE userid= ${userid}`

    db.query(sql, (err, data) => {
      if (err) return res.status(500).json(err)

      console.log('data user', data.rows[0]);
      res.render('users/edit', {
        data : data.rows[0]
      })
    })
  });

  return router
}