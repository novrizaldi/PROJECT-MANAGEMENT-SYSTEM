var express = require('express');
var router = express.Router();
var helpers = require('../helpers/auth');
const bcrypt = require('bcrypt');

let checkOption = {
  id: true,
  name: true,
  email: true,
  position: true,
  typejob: true,
  as: true
}

module.exports = (db) => {

  /* GET users listing. */
  router.get('/', helpers.isLoggedIn, function (req, res, next) {

    let sqlUsers = `SELECT * FROM users`;
    db.query(sqlUsers, (err, data) => {
      if (err) return res.status(500).json({
        error: true,
        message: err
      })
      res.render('users/list', {
        login: req.session.user,
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
    checkOption.as = req.body.as;
    res.redirect('/users')
  })

  //------------------------
  router.get('/add', helpers.isLoggedIn, function (req, res, next) {
    let sql = `SELECT DISTINCT position FROM users`
    db.query(sql, (err, data) => {
      if (err) return res.status(500).json({
        error: true,
        message: err
      })

      res.render('users/add', {
        login: req.session.user,
        data: data.rows
      })
    })
  });

  //-----------------------
  router.post('/add',helpers.isLoggedIn, function (req, res, next) {
    let {
      firstname,
      lastname,
      email,
      password,
      typejob,
      position,
      as
    } = req.body

    bcrypt.hash(password, 10, (err, hash) => {
      if (err) return res.status(500).json({
        error: true,
        message: err
      })

      let sql = `INSERT INTO users (firstname, lastname, email, password, typejob, position, as) VALUES ($1,$2,$3,$4,$5,$6,$7)`
      let value = [firstname, lastname, email, hash, typejob, position, as]

      db.query(sql, value, (err) => {
        if (err) return res.status(500).json({
          error: true,
          message: err
        })

        res.redirect('/users')
      })
    });
  });

  router.get('/edit/:userid', helpers.isLoggedIn,function (req, res, next) {
    let userid = req.params.userid
    let sql = `SELECT users.* FROM users WHERE userid= ${userid}`

    db.query(sql, (err, data) => {
      if (err) return res.status(500).json(err)

      console.log('data user', data.rows[0]);
      res.render('users/edit', {
        login: req.session.user,
        data: data.rows[0]
      })
    })
  });

  router.post('/edit/:userid', helpers.isLoggedIn, function (req, res, next) {
    let userid = req.params.userid

    let {
      firstname,
      lastname,
      email,
      password,
      typejob,
      position,
      as
    } = req.body

    bcrypt.hash(password, 10, (err, hash) => {
      if (err) return res.status(500).json({
        error: true,
        message: err
      })

      let sql = `UPDATE users SET email= '${email}', password= '${hash}', firstname='${firstname}', lastname='${lastname}', typejob='${typejob}', "position"='${position}', "as"='${as}' WHERE userid=${userid}`
      console.log('DATA UPDATE', sql);
      db.query(sql, (err) => {
        if (err) return res.status(500).json({
          error: true,
          message: err
        })
        res.redirect('/users')
      })
    })
  });

  router.get('/delete/:userid', helpers.isLoggedIn, function (req, res, next) {
    let userid = req.params.userid
    let sql = `DELETE FROM users WHERE userid= $1`
    
    db.query(sql, [userid], (err) => {
      if (err) return res.status(500).json({
        error: true,
        message: err
      })
      res.redirect('/users')
    })
  });
  return router
}