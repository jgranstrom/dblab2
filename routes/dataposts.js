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

exports.payout = function(sql, sockets) {
	return function(req, res) {
		sql.payoutProc(req.user.usr, req.body.clientId, function(row, involvedKiosks){
			res.end( JSON.stringify(row) );			
			sockets.emitToUser(req.user.usr, 'accounts');
			sockets.emitToUser(req.user.usr, 'payouts');

			console.log(involvedKiosks);
			involvedKiosks.forEach(function(kiosk) {
				console.log(kiosk.senderKioskId);
				sockets.emitToUser(kiosk.senderKioskId, 'transfers');
			});
		});
	};
};

exports.book = function(sql, sockets) {
	return function(req, res) {
		sql.bookProc(req.user.usr, req.body.senderId, req.body.recipientKioskId, req.body.recipientId, req.body.amount, function(rows){
			if(rows == null) {
				res.end( JSON.stringify({ error: 'error' }));
			}
			else {
				res.end( JSON.stringify({ error: 'noerror' }));			

				sockets.emitToUser(req.user.usr, 'accounts');
				sockets.emitToUser(req.user.usr, 'transfers');

				sockets.emitToUser(req.body.recipientKioskId, 'accounts');
				sockets.emitToUser(req.body.recipientKioskId, 'payouts');
			}			
		});
	};
};