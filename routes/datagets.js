exports.kiosks = function(sql) {
	return function(req, res) {
		sql.getOtherKiosks(req.user.usr, function(kioskRows){
				res.end( JSON.stringify(kioskRows) );
		});
	}; 	
};

exports.accounts = function(sql) {
	return function(req, res) {
		sql.getKioskAccounts(req.user.usr, function(rows){
			res.end( JSON.stringify(rows) );
		});  
	}; 		
};

exports.transfers = function(sql) {
	return function(req, res) {
		sql.getTransfers(req.user.usr, function(rows){
			res.end( JSON.stringify(rows) );
		});  
	}; 		
};

exports.payouts = function(sql) {
	return function(req, res) {
		sql.getPayouts(req.user.usr, function(rows){
			res.end( JSON.stringify(rows) );
		});  
	}; 	
};

exports.cb = function(sql) {
	return function(req, res) {
		sql.getCBAccounts(function(rows){
			res.end( JSON.stringify(rows) );
		});  
	};
}

exports.reset = function(sql) {
	return function(req, res) {
		sql.reset(function(rows){
			if(rows == null) {
				res.end( 'ERROR' );
			}
			else {
				res.end( 'RESET' );
			}
		});  
	};
}