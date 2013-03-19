var mysql = require('mysql');

var connection = createConnection();

function createConnection(){
	return mysql.createConnection({
		host	: 'zpruce.no-ip.org',
		user	: 'dev',
		password: 'klaffe',
		database: 'dblab2'
	});
}

// Handle some unexpected stuff
function handleDisconnection(connection){
	connection.on('error', function(err) {
		if(code === 'PROTOCOL_ENQUEUE_AFTER_DESTROY') {
			console.log('Reconnecting database')

			connection = createConnection();
			handleDisconnection(connection);
			connect();
		}
	});
}
handleDisconnection(connection);

var connect = function() {
	connection.connect(function(err){
		if(err)
			console.warn('Error connecting to database');
		else
			console.log('Database connection established');
	});
};

var getUser = function(username, callback){
	connection.query('SELECT password, name, entityId, adress, country FROM Kiosk NATURAL JOIN Adress WHERE kioskId = ?', 
		[username], function(err, rows){
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
			callback(null);
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
						recipientClientId, \
						recipient.fullName AS recipientClientName, \
						senderClientId, \
						sender.fullName AS senderClientName,\
						recipientKioskId, \
						recipientk.name AS recipientKioskName \
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
						recipientClientId, \
						recipient.fullName AS recipientClientName, \
						senderClientId, \
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

exports.connect = connect;
exports.getUser = getUser;
exports.getKioskAccounts = getKioskAccounts;
exports.getOtherKiosks = getOtherKiosks;
exports.getTransfers = getTransfers;
exports.getPayouts = getPayouts;
exports.getCBAccounts = getCBAccounts;