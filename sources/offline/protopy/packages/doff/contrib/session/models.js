require('doff.conf.settings', 'settings');
require('md5', 'md5');

var MAX_SESSION_KEY = 73786976294838206464;			// 8 << 63 :P copion!!!

var Session = type('Session', [ Dict ], {
	__init__: function(session_key) {
		if (!session_key)
			session_key = this._get_new_session_key();
		super(Dict, this).__init__();
		this.modified = false;
		this.accessed = false;
		this._session_expiry = null;
		this.session_key = session_key;
	},
	
	__json__: function() {
		return "";
	},
	
	_get_new_session_key: function() {
		return md5("%s%s%s".subs(Math.floor(Math.random() * MAX_SESSION_KEY), window.navigator.userAgent, new Date().getTime()));
	},
	
	set_expiry: function(value) {
		if (isundefined(value) || value == null)
            // Remove any custom expiration for this session.
            this._session_expiry = null;
        this._session_expiry = value;
	},
	
	get_expire_at_browser_close: function() {
		if (this._session_expiry == null)
            return settings.SESSION_EXPIRE_AT_BROWSER_CLOSE;
        return this._session_expiry == 0;
	},
	
	get_expiry_age: function() {
        //Get the number of seconds until the session expires.
        var expiry = this._session_expiry;
        if (!expiry)   // Checks both None and 0 cases
            return settings.SESSION_COOKIE_AGE;
        if (!isinstance(expiry, Date))
            return expiry;
        var delta = new Date(expiry - new Date());
        return delta.getDay() * 86400 + delta.getSeconds();
	},
	
    get_expiry_date: function() {
        //Get session the expiry date (as a datetime object).
        var expiry = this._session_expiry;
        if (isinstance(expiry, Date))
            return expiry;
        if (!expiry)   // Checks both None and 0 cases
            var expiry = settings.SESSION_COOKIE_AGE;
        return new Date(new Date().getTime() + (expiry * 1000));
    },
    
    flush: function() {
    	this.clear();
    	this.session_key = this._get_new_session_key();
    },
    
    cycle_key: function() {
    	this.modified = true;
    	this.session_key = this._get_new_session_key();
    },
    
    set: function(key, value) {
    	this.modified = true;
        return super(Dict, this).set(key, value);
    },
    setdefault: function(key, value){
    	this.modified = true;
    	return super(Dict, this).set(key, value);
    },
    get: function(key, otherwise) {
    	this.accessed = true;
    	return super(Dict, this).get(key, otherwise);
    },
    unset: function(key) {
    	this.modified = true;
    	return super(Dict, this).get(key);
    },
    keys: function() {
    	this.accessed = true;
    	return super(Dict, this).keys();
    },
    values: function() {
    	this.accessed = true;
    	return super(Dict, this).values();
    },
    items: function() {
    	this.accessed = true;
    	return super(Dict, this).items();
    },
    index: function(value) {
    	this.accessed = true;
    	return super(Dict, this).index(value);
    },
    update: function(object) {
    	this.modified = true;
    	return super(Dict, this).update(object);
    },
    pop: function(key) {
    	this.modified = true;
    	return super(Dict, this).pop(key);
    },
    popitem: function(key) {
    	this.modified = true;
    	return super(Dict, this).popitem(key);
    },
    clear: function() {
    	this.modified = true;
    	return super(Dict, this).clear(key);
    },
    has_key: function(key) {
    	this.accessed = true;
    	return super(Dict, this).has_key(key);
    }
});

publish({
	Session: Session
});