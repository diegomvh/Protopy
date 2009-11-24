var Session = type('Session', [ Dict ], {
	__init__: function(object) {
		super(Dict, this).__init__(object);
		this.modified = false;
		this.accessed = false;
		this._session_expiry = null;
		this.session_key = "huevo";
	},
	
	set_expiry: function(value) {
		if (isundefined(value) || value == null)
            // Remove any custom expiration for this session.
            this._session_expiry = null;
        this._session_expiry = value;
	},
	
	get_expire_at_browser_close: function() {
		if (this._session_expiry == null)
            return SESSION_EXPIRE_AT_BROWSER_CLOSE;
        return this._session_expiry == 0;
	},
	
	get_expiry_age: function() {
        //Get the number of seconds until the session expires.
        var expiry = this._session_expiry;
        if (!expiry)   // Checks both None and 0 cases
            return SESSION_COOKIE_AGE;
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
            var expiry = SESSION_COOKIE_AGE;
        return new Date(new Date().getTime() + (expiry * 1000));
    }
});

var session = new Session();