function check_password(raw_password, enc_password) {
    var [algo, salt, hsh] = enc_password.split('$');
    if (algo == 'md5') {
    	require('md5', 'md5');
    	return hsh == md5(salt + raw_password);
    } else if (algo == 'sha1') {
    	require('sha1', 'sha1');
    	return hsh == sha1(salt + raw_password);
    }
    throw new ValueError("Got unknown password algorithm type in password.");
}

var User = type('User', [ object ], {
    
	__init__: function(data) {
		extend(this, data);
	},
	
    is_anonymous: function(){ return false;},
    is_authenticated: function(){ return true;},
    get_full_name: function() { 
    	var full_name = '%s %s'.subs(this.first_name, this.last_name);
    	return full_name.strip();
    },
    
    check_password: function(raw_password) {
        return check_password(raw_password, this.password);
    }
});
    
    
var AnonymousUser = type('AnonymousUser', [ object ], {
    username: '',
    
    __init__: function(data) {
		extend(this, data);
	},
    is_anonymous: function(){ return true;},
    is_authenticated: function(){ return false;}
});
    
publish({
	User: User,
	AnonymousUser: AnonymousUser
});