var port = 80
function initSocket(){
	var socket = io.connect('http://' + document.domain + ':' + port)

	socket.on('accounts', function(){
		loadAccounts();	
	});
	socket.on('payouts', function(){
		loadPayouts();
	});
}