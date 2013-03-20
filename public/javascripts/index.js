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
	var cId = $('#payoutClientId').val();
	if(cId.length < 1) {
		showWarningDialog('Provide recipient passport id', 'Input');
		return;
	}

	$.post('/owing', { clientId: cId }, function(data){
		var d = JSON.parse(data)[0];
		showInformationDialog('This kiosk owe client #' + cId + ' ' + (d.amount == null ? 'nothing' : d.amount  + ' ' + d.currency), 'Owing');
	});
}

function payout() {
	var cId = $('#payoutClientId').val();
	if(cId.length < 1) {
		showWarningDialog('Provide recipient passport id', 'Input');
		return;
	}

	$.post('/owing', { clientId: cId }, function(data){
		var d = JSON.parse(data)[0];
		if(d.amount == null) {
			showWarningDialog('You have no owings for client #' + cId);
		} else {
			dialog = showQuestionDialog('Do you want to payout ' + d.amount  + ' ' + d.currency + ' to client#' + cId + '?', 'Payout?', function(proceed){
				if(proceed) {
					setTimeout(function(){
						$.post('/payout', { clientId: cId }, function(data){
							pdata = JSON.parse(data)[0];
							if(pdata.amount != null) {
								showConfirmationDialog('Payout ' + pdata.amount + ' ' + pdata.currency + ' to client #' + cId);	
							}
							else {
								showWarningDialog('You have no owings for client #' + cId);
							}
							
						});
					}, 500);
					
				}
			});
		}		
	});	
}

function book() {
	var senderId = $('#senderClientId').val();
	if(senderId.length < 1) {
		showWarningDialog('Provide sender passport id', 'Input');
		return;
	}

	var recipientId = $('#recipientClientId').val();
	if(recipientId.length < 1) {
		showWarningDialog('Provide recipient passport id', 'Input');
		return;
	}

	var recipientKioskId = $('#kioskSelect').val()
	if(recipientKioskId == null)
	{
		showWarningDialog('Provide recipient kiosk', 'Input');
		return;
	}

	$.post('/book', { senderId: senderId, recipientId: recipientId, recipientKioskId: recipientKioskId }, function(data) {
		// TODO: Check result and display any errors
	});
}

function showInformationDialog(text, title) { 
	$.Zebra_Dialog(text, {
    'type':     'information',
    'title':    title,
    'buttons':  [
                    { caption: 'Ok' }
                ]
	});
}

function showWarningDialog(text, title) { 
	$.Zebra_Dialog(text, {
    'type':     'warning',
    'title':    title,
    'buttons':  [
                    { caption: 'Ok' }
                ]
	});
}

function showConfirmationDialog(text, title) { 
	$.Zebra_Dialog(text, {
    'type':     'confirmation',
    'title':    title,
    'buttons':  [
                    { caption: 'Ok' }
                ]
	});
}

function showQuestionDialog(text, title, callback) { 
	return $.Zebra_Dialog(text, {
    'type':     'question',
    'title':    title,
    'buttons':  [
                    {caption: 'Yes', callback: function() { callback(true); }},
                    {caption: 'No', callback: function() { callback(false); }},
                    {caption: 'Cancel', callback: function() { callback(false); }}
                ]
	});
}

$(document).ready(function(){
	loadAccounts();
	loadKiosks();
	loadTransfers();
	loadPayouts();
})