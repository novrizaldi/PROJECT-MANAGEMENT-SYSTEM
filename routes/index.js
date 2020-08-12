var express = require('express');
var router = express.Router();
const bcrypt = require('bcrypt');
var helpers = require('../helpers/auth');

/* GET home page. */
module.exports = (db) => {
  router.get('/', function (req, res, next) {
    res.render('login', {
      title: 'Express'
})
  })

  router.post('/login', function (req, res, next) {
    db.query('select * from users where email = $1', [req.body.email], (err, data) => {
      if (err) {
        req.flash('pesanKesalahan', 'Terjadi Error Hubungi Administrator')
        return res.redirect('/');
      }
      if (data.rows.length == 0) {
        req.flash('pesanKesalahan', 'username atau password salah')
        return res.redirect('/');
      }
      bcrypt.compare(req.body.password, data.rows[0].password, function (err, result) {
        if (err) {
          req.flash('pesanKesalahan', 'username atau password salah')
          return res.redirect('/');
        }
        if (!result) {
          req.flash('pesanKesalahan', 'username atau password salah')
          return res.redirect('/');
        }
        //lanjut
        let user = data.rows[0]
        delete user['pass']
        req.session.user = user;
        res.redirect('/projects')
      })
    })
  })

  router.get('/logout', function (req, res, next) {
    req.session.destroy(function (err) {
      res.redirect('/')
    })
  })
  return router;
}