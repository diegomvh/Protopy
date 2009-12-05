require('rpc', 'ServiceProxy');
require('doff.core.project', 'get_project');
require('event');

var SESSION_KEY = '_auth_username';

function load_user(username) {
	require('doff.contrib.auth.models', 'User', 'AnonymousUser');
	var user = User.get({'username': username});
	if (user == null)
		return new AnonymousUser();
	return user;
}

function authenticate(username, password) {
	var user = load_user(username);
    
	if (user.check_password(password))
		return user;
}

function login(request, user) {
    if (isundefined(user))
        user = request.user;

    if (request.session.has_key(SESSION_KEY)) {
        if (request.session.get(SESSION_KEY) != user.username)
            request.session.flush();
    } else {
        request.session.cycle_key();
    }
    request.session.set(SESSION_KEY, user.username);
    if (hasattr(request, 'user'))
        request.user = user;
}

function logout(request) {
    request.session.flush();
    if (hasattr(request, 'user')) {
    	require('doff.contrib.auth.models', 'AnonymousUser');
        request.user = new AnonymousUser();
    }
}

function get_user(request) {
	require('doff.contrib.auth.models', 'User', 'AnonymousUser');
	var username = request.session.get(SESSION_KEY, null);
	if (username == null) {
		try {
			var proxy = new ServiceProxy(get_project().offline_support + '/jsonrpc/', { asynchronous: false });
			var data = proxy.user();
			if (data['class'] == 'AnonymousUser')
				return new AnonymousUser();
			var user = new User(data);
			try {
				user.save();
				request.session.set(SESSION_KEY, user.username);
			} catch (e) {
				// No tengo base de datos
			}
			return user;
		} catch (e) {
			return new AnonymousUser(); 
		}
	}
	return load_user(username);
}

publish({
	get_user: get_user,
	authenticate: authenticate,
	login: login,
	logout: logout
});