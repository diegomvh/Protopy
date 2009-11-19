var Session = type('Session', [ Dict ], {
	__init__: function(object) {
		super(Dict, this).__init__(object);
		this.modified = false;
		this.accessed = false;
		this.expire_date = 100;
		this.session_key = "huevo";
	},
	
	set_expiry: function(value) {
		/*
	     * If value is an integer, the session will expire after that many seconds of inactivity. For example, calling request.session.set_expiry(300) would make the session expire in 5 minutes.
	     * If value is a datetime or timedelta object, the session will expire at that specific date/time.
	     * If value is 0, the user’s session cookie will expire when the user’s Web browser is closed.
	     * If value is None, the session reverts to using the global session expiry policy.
	     */
		this.expire_date = value;
	},
	
	get_expire_at_browser_close: function() {
		return this.expire_date == 0;
	},
	
	get_expiry_age: function() {
		return 10;
	},
	
	get_expiry_date: function() {
		return this.expire_date = 100;
	}
});

var session = new Session();

var SessionMiddleware = type('SessionMiddleware', [ object ], {
    process_request: function(request) {
		debugger;
        var session_key = request.get_cookie('doff-session'); //Solo con fines recreativos
        request.session = session;
	},
	
    process_response: function(request, response) {
		debugger;
		var modified = true; //Esto se tiene que detectar de la session
		var accessed = true;
        if (accessed) {}
        if (modified) {
            if (request.session.get_expire_at_browser_close()) { //Se pierde con el navegador?
                var max_age = null;
                var expires = null;
            } else {
                var max_age = request.session.get_expiry_age();
                var expires_time = new Date(new Date().getTime() + max_age);
                // Save the session data and refresh the client cookie.
                response.set_cookie('doff-session',
                	request.session.session_key, max_age,
                    expires_time, domain="localhost",
                    path="/",
                    secure=false)
            }
        }
        return response;
	}
});

publish({
	SessionMiddleware: SessionMiddleware
});