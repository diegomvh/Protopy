
function get_user(request) {
    require('doff.contrib.auth.models', 'AnonymousUser');
    //TODO: Ontener la cookie con el usuario :)
    try:
        user_id = request.session[SESSION_KEY]
        backend_path = request.session[BACKEND_SESSION_KEY]
        backend = load_backend(backend_path)
        user = backend.get_user(user_id) or AnonymousUser()
    except KeyError:
        user = AnonymousUser()
    return user
}

var _cached_user = null;

var LazyUser = type('LazyUser', [ object ], {
    __get__: function(request, obj_type) {
        if (_cached_user == null) 
            _cached_user = get_user(request);
        return get_user(request);
    }
});

var AuthenticationMiddleware = type('AuthenticationMiddleware', [ object ], {
    process_request: function(request) {
        var lu = new LazyUser();
        request.__defineGetter__('user', function() { return lu.__get__(request, this.constructor); });
        return null;
    }
});

publish({
    AuthenticationMiddleware: AuthenticationMiddleware
});