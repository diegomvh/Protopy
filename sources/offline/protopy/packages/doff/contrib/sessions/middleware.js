var SESSION_COOKIE_NAME = 'doffsessionid';                       // Cookie name. This can be whatever you want.
var SESSION_COOKIE_AGE = 60 * 60 * 24 * 7 * 2;               // Age of cookie, in seconds (default: 2 weeks).
var SESSION_COOKIE_DOMAIN = null;                            // A string like ".lawrence.com", or None for standard domain cookie.
var SESSION_COOKIE_SECURE = false;                           // Whether the session cookie should be secure (https:// only).
var SESSION_COOKIE_PATH = '/';                               // The path of the session cookie.
var SESSION_SAVE_EVERY_REQUEST = false;                      // Whether to save the session data on every request.
var SESSION_EXPIRE_AT_BROWSER_CLOSE = false;                 // Whether a user's session cookie expires when the Web browser is closed.
var SESSION_FILE_PATH = null; 								// Directory to store session files if using

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

var SessionMiddleware = type('SessionMiddleware', [ object ], {
    process_request: function(request) {
        var session_key = request.get_cookie(SESSION_COOKIE_NAME); //Solo con fines recreativos
        request.session = session;
	},
	
    process_response: function(request, response) {
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
            }
            response.set_cookie(SESSION_COOKIE_NAME,
                	request.session.session_key, max_age,
                    expires_time,
                    path=SESSION_COOKIE_PATH,
                    domain=SESSION_COOKIE_DOMAIN,
                    secure=false);
        }
        return response;
	}
});

publish({
	SessionMiddleware: SessionMiddleware
});