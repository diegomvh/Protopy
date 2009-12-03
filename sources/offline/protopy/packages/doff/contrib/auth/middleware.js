require('doff.contrib.auth.base', 'get_user');
require('event');

var _cached_user = null;

var LazyUser = type('LazyUser', [ object ], {
    __get__: function(request, obj_type) {
        if (_cached_user == null) 
            _cached_user = get_user(request);
        return _cached_user;
    }
});

var AuthenticationMiddleware = type('AuthenticationMiddleware', [ object ], {
    process_request: function(request) {
		assert (hasattr(request, 'session'), "The Doff authentication middleware requires session middleware to be installed. Edit your MIDDLEWARE_CLASSES setting to insert 'doff.contrib.session.middleware.SessionMiddleware'.");
		var lu = new LazyUser();
        request.__defineGetter__('user', function() { return lu.__get__(request, this.constructor); });
        return null;
    }
});

publish({
    AuthenticationMiddleware: AuthenticationMiddleware
});