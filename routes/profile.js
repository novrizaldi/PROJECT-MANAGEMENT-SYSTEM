var express = require('express');
var router = express.Router();
var helpers = require('../helpers/auth');
const bcrypt = require('bcrypt');

/* GET home page. */
module.exports = (db) => {

    router.get('/', helpers.isLoggedIn, function (req, res, next) {
      let user = req.session.user
      let sql = `SELECT * FROM users WHERE email = '${user.email}'`
      db.query(sql, (err, data) => {
        if (err) return res.status(500).json(err)
        console.log(data.rows[0]);
        res.render('profile/view', {
          user,
          data: data.rows[0],
          login: req.session.user
        })
      })
    });

    router.post('/', helpers.isLoggedIn, function (req, res, next) {
          let user = req.session.user
          bcrypt.hash(req.body.password, 10, (err, hash) => {
            if (err) return res.status(500).json(err)
            let sql = `UPDATE users SET password = '${hash}', position = '${req.body.position}', typejob = '${req.body.typejob}' WHERE email = '${user.email}'`
            db.query(sql, (err) => {
              if (err) return res.status(500).json(err)
              res.redirect('/projects')
            })
          });
        })
          return router;
    }