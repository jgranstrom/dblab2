function loadAccounts(){
	var accountList = $('#accountList');
	$.get('/accounts', function(accounts) {
		JSON.parse(accounts).forEach(function(account){
			accountList.append($('<li></li>')
	        	.html('<span>' + account.type + '</span>'
	        		+ '<span class=\'right currency\'>' + account.currency + '</span>'
	        		+ '<span class=\'right\'>' + account.amount + '</span>')); 
		});
	});
}

function loadKiosks(){
	var kioskSelect = $('#kioskSelect');
	$.get('/kiosks', function(kiosks) {
		JSON.parse(kiosks).forEach(function(kiosk){
			kioskSelect.append($("<option></option>")
	        	.attr("value",kiosk.kioskId)
	        	.text(kiosk.name + ' (#' + kiosk.kioskId + ')')); 
		});
	});
}

function loadTransfers(){
	var transferList = $('#transferList');
	$.get('/transfers', function(transfers) {
		JSON.parse(transfers).forEach(function(transfer){
			var popupText = "<b>From client:</b> " + transfer.senderClientName + " (#" + transfer.senderClientId
							+ ")<br/><b>To client:</b> " + transfer.recipientClientName + " (#" + transfer.recipientClientId
							+ ")<br/><b>Sent:</b> " + new Date(transfer.sentTime).toString();
			var adstyle = "";
			if(transfer.statusCode === 1) {
				popupText += "<br/><b>Collected:</b>  " + new Date(transfer.collectedTime).toString();
			}
			else {
				popupText += "<br/><b>Waiting to be collected</b> ";
				adstyle = 'class = \"highlight\"';
			}
			
			transferList.append($('<li ' + adstyle + 'title=\"' + popupText + '\"></li>')
	        	.html('<span>' + transfer.recipientKioskName + '</span>'
	        		+ '<span class=\'right currency\'>' + transfer.nativeCurrency + '</span>'
	        		+ '<span class=\'right\'>' + transfer.sentAmount + '</span>')
	        	.powerTip({ mouseOnToPopup: true, placement: 'w' }));
		});
	});
}

function loadPayouts(){
	var payoutList = $('#payoutList');
	$.get('/payouts', function(payouts) {
		JSON.parse(payouts).forEach(function(payout){
			var popupText = "<b>From kiosk:</b> " + payout.senderKioskName + " (#" + payout.senderKioskId
							+ ")<br/><b>From client:</b> " + payout.senderClientName + " (#" + payout.senderClientId
							+ ")<br/><b>To client:</b> " + payout.recipientClientName + " (#" + payout.recipientClientId
							+ ")<br/><b>Sent:</b> " + new Date(payout.sentTime).toString();
			var adstyle = "";
			if(payout.statusCode === 1) {
				popupText += "<br/><b>Collected:</b>  " + new Date(payout.collectedTime).toString();
			}
			else {
				popupText += "<br/><b>Waiting to be collected</b> ";
				adstyle = 'class = \"highlight\"';
			}
			
			payoutList.append($('<li ' + adstyle + 'title=\"' + popupText + '\"></li>')
	        	.html('<span>' + payout.recipientClientName + '</span>'
	        		+ '<span class=\'right currency\'>' + payout.payoutCurrency + '</span>'
	        		+ '<span class=\'right\'>' + payout.recipientGrantedAmount + '</span>')
	        	.powerTip({ mouseOnToPopup: true, placement: 'w' }));
		});
	});
}

function showOwing() {
	var clientId = $('#payoutClientId');

	$.post('/owing', { clientId: clientId.val() }, function(data){
		var d = JSON.parse(data)[0];
		alert((d.amount == null ? 0 : d.amount) + ' ' + d.currency);
	});
}

$(document).ready(function(){
	loadAccounts();
	loadKiosks();
	loadTransfers();
	loadPayouts();
})