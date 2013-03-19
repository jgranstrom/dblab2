exports.index = function(req, res){
  res.render('login', {errormsg: req.flash('error')});
};

exports.post = function(req, res, passport){

};

exports.logout = function(req, res){
	req.logout();
  	res.redirect('/login');
};