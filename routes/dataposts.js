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

