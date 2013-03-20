
/*
 * GET home page.
 */

exports.index = function(sql) {
	return function(req, res) {
				res.render('index', { 	
					kioskInfo: req.user.kioskName + " (#" + req.user.usr + ") " + req.user.location,
					currency: req.user.currency });
	}; 		
};