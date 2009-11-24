var SessionMiddleware = type('SessionMiddleware', [ object ], {
    process_request: function(request) {
        var session_key = request.get_cookie(SESSION_COOKIE_NAME);
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