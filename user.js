function User(usr, row){
	this.usr = usr
	this.pwd = row.password;
	this.kioskName = row.name;
	this.entityId = row.entityId;
	this.location = row.adress + " " + row.country;
	this.currency = row.nativeCurrency
}

User.prototype.verifyPassword = function(pwd) {
	var ok = false;
	if(pwd === this.pwd)
		ok = true;
	delete this.pwd;
	return ok;
};

findUser = function(sql, usr, callback) {
	sql.getUser(usr, function(row){
		if(!row) {
			callback(null, null);	
		}
		else
		{
			callback(null, new User(usr, row));
		}
	})	
};

exports.findUser = findUser
exports.User = User