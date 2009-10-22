
function get_user(request) {
    require('doff.contrib.auth.models', 'AnonymousUser');
    user_name = request.get_cookie('user_name');
    if (user_name == null)    
        return new AnonymousUser();
    return {'name': user_name};
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