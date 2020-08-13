var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
const app = express()
const session = require('express-session');
const fileUpload = require('express-fileupload');
const { Pool } = require('pg')

// const pool = new Pool({
//   user: 'novri',
//   host: 'localhost',
//   database: 'pms',
//   password: '1212',
//   port: 5432,
// })

const pool = new Pool({
  user: 'jdojnzggoftppk',
  host: 'ec2-54-165-36-134.compute-1.amazonaws.com',
  database: 'ddnhjha70njots',
  password: '32b398b60f863992ba5b31e446d1b3c8ddbd69bbe03ce4d388bd6a865b393026',
  port: 5432,
})

var indexRouter = require('./routes/index')(pool);
var profileRouter = require('./routes/profile')(pool);
var projectsRouter = require('./routes/projects')(pool);
var usersRouter = require('./routes/users')(pool);

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use(session({
  secret: 'adaaja'
}))
app.use(fileUpload());

app.use('/', indexRouter);
app.use('/profile', profileRouter);
app.use('/projects', projectsRouter);
app.use('/users', usersRouter);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;
