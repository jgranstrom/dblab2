var mysql = require('mysql');

var connection = createConnection();

function createConnection() {
	return mysql.createConnection({
		host	: 'zpruce.no-ip.org',
		user	: 'dev',
		password: 'klaffe',
		database: 'dblab2',
		multipleStatements: true /* Security risk.. */
	});
}

// Handle some unexpected stuff
function ensureConnection(callback) {
	if(connection._socket.destroyed) {
		console.log('Database connection destroyed, restoring');
		connection = createConnection();
		connect(callback);
	}
	else
		callback();
}

var connect = function(callback) {
	connection.connect(function(err){
		if(err)
			console.warn('Error connecting to database');
		else
			console.log('Database connection established');
		if(callback)
			callback();
	});
};

var getUser = function(username, callback){
	ensureConnection(function() {
		console.log(username);
		connection.query('SELECT password, name, entityId, adress, country, nativeCurrency FROM Kiosk NATURAL JOIN Adress WHERE kioskId = ?', 
			[username, username], function(err, rows){
			if(err)
			{
				console.log(err);
				callback(null);
			}
			else if (rows.length > 0)
			{
				callback(rows[0]);
			}
			else
				callback(null);2	
		});
	});	
};

var getKioskAccounts = function(kioskId, callback){
	connection.query('SELECT amount, type, currency FROM Account INNER JOIN Kiosk ON entityId = ownerEntityId NATURAL JOIN AccountType WHERE kioskId = ?', 
		[kioskId], function(err, rows){
		if(err)
		{
			console.log(err);
			callback(null);
		}
		else
		{
			callback(rows);
		}
	});
};

var getOtherKiosks = function(kioskId, callback){
	connection.query('SELECT kioskId, name FROM Kiosk WHERE kioskId <> ?', 
		[kioskId], function(err, rows){
		if(err)
		{
			console.log(err);
			callback(null);
		}
		else
		{
			callback(rows);
		}
	});
};

var getTransfers = function(kioskId, callback){
	connection.query(	'SELECT sentTime, \
						collectedTime, \
						recipientGrantedAmount, \
						sentAmount, \
						senderk.nativeCurrency, \
						statusCode, \
						recipient.passport AS recipientClientId, \
						recipient.fullName AS recipientClientName, \
						sender.passport AS senderClientId, \
						sender.fullName AS senderClientName,\
						recipientKioskId, \
						recipientk.name AS recipientKioskName, \
						recipientk.nativeCurrency AS recipientCurrency \
						FROM Transfer \
						INNER JOIN Kiosk senderk ON senderKioskId = kioskId \
						INNER JOIN Kiosk recipientk ON recipientKioskId = recipientk.kioskId \
						INNER JOIN Client sender ON senderClientId = sender.clientId \
						INNER JOIN Client recipient ON recipientClientId = recipient.clientId \
						WHERE senderk.kioskId = ? \
						ORDER BY statusCode ASC, sentTime DESC', 
		[kioskId], function(err, rows){
		if(err)
		{
			console.log(err);
			callback(null);
		}
		else
		{
			callback(rows);
		}
	});
};

var getPayouts = function(kioskId, callback){
	connection.query(	'SELECT sentTime, \
						collectedTime, \
						recipientGrantedAmount, \
						sentAmount, \
						recipientk.nativeCurrency AS payoutCurrency, \
						statusCode, \
						recipient.passport AS recipientClientId, \
						recipient.fullName AS recipientClientName, \
						sender.passport AS senderClientId, \
						sender.fullName AS senderClientName,\
						senderKioskId, \
						senderk.name AS senderKioskName \
						FROM Transfer \
						INNER JOIN Kiosk senderk ON senderKioskId = kioskId \
						INNER JOIN Kiosk recipientk ON recipientKioskId = recipientk.kioskId \
						INNER JOIN Client sender ON senderClientId = sender.clientId \
						INNER JOIN Client recipient ON recipientClientId = recipient.clientId \
						WHERE recipientk.kioskId = ? \
						ORDER BY statusCode ASC, sentTime DESC', 
		[kioskId], function(err, rows){
		if(err)
		{
			console.log(err);
			callback(null);
		}
		else
		{
			callback(rows);
		}
	});
};

var getCBAccounts = function(callback){
	connection.query(	'SELECT amount, \
						currency \
						FROM Account \
						INNER JOIN Entity \
						WHERE entityId = 1 \
						AND accountTypeId = 3', // CB Exchange accounts 
		[], function(err, rows){
		if(err)
		{
			console.log(err);
			callback(null);
		}
		else
		{
			callback(rows);
		}
	});
}

var getOwing = function(kioskId, clientId, callback){
	connection.query(	'SELECT SUM(recipientGrantedAmount) AS amount, \
						recipientk.nativeCurrency AS currency \
						FROM Transfer \
						INNER JOIN Kiosk recipientk ON recipientKioskId = recipientk.kioskId \
						INNER JOIN Client recipient ON recipientClientId = recipient.clientId \
						WHERE recipientk.kioskId = ? \
						AND recipient.passport = ? \
						AND statusCode = 0',  // Only uncollected payouts
		[kioskId, clientId], function(err, rows){
		if(err)
		{
			console.log(err);
			callback(null);
		}
		else
		{
			callback(rows);
		}
	});
};

var payoutProc = function(kioskId, clientId, callback){
	connection.query(	'SET autocommit=0; \
					START TRANSACTION; \
					SELECT senderKioskId \
						FROM Transfer \
						INNER JOIN Client ON Transfer.recipientClientId = Client.clientId \
						WHERE 	passport = ? \
								AND recipientKioskId = ? \
								AND statusCode = 0;	\
					CALL payout(?, ?, @a, @c); \
					select @a AS amount, @c AS currency',
		[clientId, kioskId, kioskId, clientId], function(err, rows){
			console.log(rows);
		if(err)
		{
			console.log(err);
			callback(null);
		}
		else
		{
			callback(rows[4], rows[2]);
		}
	});

	// May refactor into..
	/*internalQuery('CALL payout(?, ?, @a, @c); \
					select @a AS amount, @c AS currency',
					[kioskId, clientId], function(rows){
						callback(rows[1]);
					});*/
}

var bookProc = function(senderKioskId, senderClientId, recipientKioskId, recipientClientId, amountToSend, callback){
	connection.query(	'CALL book(?, ?, ?, ?, ?, @r); \
					select @r AS bookingDone',
		[senderKioskId, senderClientId, recipientKioskId, recipientClientId, amountToSend], function(err, rows){
		if(err)
		{
			console.log(err);
			callback(null);
		}
		else
		{
			callback(rows);
		}
	});
}

// Helper for refactoring..
/*function internalQuery(query, params, callback) {
	connection.query( query, params, function(err, rows) {
		if(err) {
			console.log(err);
			callback(null);
		}
		else {
			callback(rows);
		}
	});
}*/

var reset = function(callback) {
	connection.query(	' \
						UPDATE Account SET Amount = 10000000 WHERE accountId = 8; \
						UPDATE Account SET Amount = 0 WHERE accountId = 9; \
						UPDATE Account SET Amount = 10 WHERE accountId = 10; \
						UPDATE Account SET Amount = 0 WHERE accountId = 11; \
						UPDATE Account SET Amount = 100000 WHERE accountId = 12; \
						UPDATE Account SET Amount = 0 WHERE accountId = 13; \
						DELETE FROM Transfer;',
		[], function(err, rows){
		if(err)
		{
			console.log(err);
			callback(null);
		}
		else
		{
			callback(rows);
		}
	});
}

exports.connect = connect;
exports.getUser = getUser;
exports.getKioskAccounts = getKioskAccounts;
exports.getOtherKiosks = getOtherKiosks;
exports.getTransfers = getTransfers;
exports.getPayouts = getPayouts;
exports.getCBAccounts = getCBAccounts;
exports.getOwing = getOwing;
exports.payoutProc = payoutProc;
exports.bookProc = bookProc;
exports.reset = reset;