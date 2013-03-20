
/**
 * Module dependencies.
 */

var express = require('express')
  , routes = require('./routes')
  , login = require('./routes/login')
  , http = require('http')
  , path = require('path')
  , nib = require('nib')
  , stylus = require('stylus')
  , flash = require('connect-flash')
  , passport = require('passport')
  , LocalStrategy = require('passport-local').Strategy
  , users = require('./user')
  , sql = require('./sql')
  , datagets = require('./routes/datagets')
  , dataposts = require('./routes/dataposts');

var app = express();
sql.connect();

passport.use(new LocalStrategy(
  function(username, password, done) {
    users.findUser(sql, username, function(err, user) {
      if(!user) {
        return done(null, false, { message: 'No such kiosk id' });  
      }      
      if(!user.verifyPassword(password)) {
        return done(null, false, { message: 'Invalid password' }); 
      }
      return done(null, user);
    });
  }
));

passport.serializeUser(function(user, done) {
  done(null, user);
});

passport.deserializeUser(function(obj, done) {
  done(null, obj);
});

app.configure(function(){
  app.set('port', process.env.PORT || 80);
  app.set('views', __dirname + '/views');
  app.set('view engine', 'jade');
  app.use(express.favicon());
  app.use(express.logger('dev'));
  app.use(express.bodyParser());
  app.use(express.methodOverride());
  app.use(express.cookieParser('aBcSeCreT#!123Aky7'));
  app.use(express.session());
  app.use(passport.initialize());
  app.use(passport.session());
  app.use(flash());
  app.use(stylus.middleware({
    src: __dirname + '/public',
    compile: function(str, path) {return stylus(str).set('filename', path).use(nib())}}));
  app.use(express.static(path.join(__dirname, 'public' )));  
  app.use(app.router);
});

app.configure('development', function(){
  app.use(express.errorHandler());
});

// Datagets
app.get('/kiosks', ensureAuthenticated, datagets.kiosks(sql));
app.get('/accounts', ensureAuthenticated, datagets.accounts(sql));
app.get('/transfers', ensureAuthenticated, datagets.transfers(sql));
app.get('/payouts', ensureAuthenticated, datagets.payouts(sql));

// Dataposts
app.post('/owing', ensureAuthenticated, dataposts.owing(sql));
app.post('/payout', ensureAuthenticated, dataposts.payout(sql));
app.post('/book', ensureAuthenticated, dataposts.book(sql));

app.get('/', ensureAuthenticated, routes.index(sql));
app.get('/login', login.index);
app.get('/cb', datagets.cb(sql));
app.post('/login',
  passport.authenticate('local', { successRedirect: '/',
                                   failureRedirect: '/login',
                                   failureFlash: true}),
  function(req, res) {
    // If this function gets called, authentication was successful.
    // `req.user` contains the authenticated user.    
  }
);
app.post('/logout', login.logout)

function ensureAuthenticated(req, res, next) {
  if (req.isAuthenticated()) { return next(); }
  res.redirect('/login')
}

http.createServer(app).listen(app.get('port'), function(){
  console.log("Express server listening on port " + app.get('port'));
});