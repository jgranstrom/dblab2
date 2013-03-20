var io;

exports.init = function(server, parser, store){
	io = require('socket.io').listen(server);

	io.sockets.on('connection', function(socket){	
		parser(socket.handshake, null, function(err){
			// Make sure incoming socket connection is authorized
			var sessionID = socket.handshake.signedCookies['sid'];
			store.get(sessionID, function(err, sessionData){
				// session data aquired
				if(!sessionData || !sessionData.passport || !sessionData.passport.user)
					socket.disconnect();
				else
				{					
					console.log('Socket established for user #' + sessionData.passport.user.usr);
					socket.join('/priv/' + sessionData.passport.user.usr);
				}
			});
		});
	});
};

exports.emitToUser = function(userId, event) {
	io.sockets.in('/priv/' + userId).emit(event);
}

