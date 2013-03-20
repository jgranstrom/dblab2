/*exports.kiosks = function(sql) {
	return function(req, res) {
		sql.getOtherKiosks(req.user.usr, function(kioskRows){
				res.end( JSON.stringify(kioskRows) );
		});
	}; 		
};
*/

exports.owing = function(sql) {
	return function(req, res) {
		sql.getOwing(req.user.usr, req.body.clientId, function(row){
			res.end( JSON.stringify(row) );
		});
	};
};

exports.payout = function(sql) {
	// TODO: Add actual payout logic to change values here
	return function(req, res) {
		sql.payoutProc(req.user.usr, req.body.clientId, function(row){
			res.end( JSON.stringify(row) );
		});
	};
};

exports.book = function(sql) {
	// TODO: Add booking logic and return result in json here
	return function(req, res) {
		res.end( JSON.stringify([]));
	};
};