require('rpc', 'ServiceProxy');
require('doff.contrib.extradata.models', 'ExtraData');
require('doff.core.project', 'get_project');

var SESSION_KEY = '_auth_user_id';
var _proxy = null;

function load_user(username) {
	var data = null;
	require('doff.contrib.auth.models', 'User', 'AnonymousUser');
	try {
		if (_proxy == null)
			_proxy = new ServiceProxy(get_project().offline_support + '/sync', {asynchronous: false});
		data = _proxy.user(username);
	} catch (e) {
		// Busco localmente
		var obj = ExtraData.objects.filter({'name': 'User', 'module': 'doff.contrib.auth.models', 'key': username});
		data = obj.data;
	}
	
	if (!data || data['class'] == 'AnonymousUser')
		return new AnonymousUser(data);
	return new User(data);
}

function authenticate(username, password) {
	//Validar el usuario contra la app online si esta conectado
	var data = null;
	try {
		if (_proxy == null)
			_proxy = new ServiceProxy(get_project().offline_support + '/sync', {asynchronous: false});
		data = _proxy.authenticate(username, password);
	} catch (e) {
		// Busco localmente
		var obj = ExtraData.objects.filter({'name': 'User', 'module': 'doff.contrib.auth.models', 'key': username});
		data = obj.data;
	}
    
    return data ? new User(data) : null;
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
    var user_name = request.session.get(SESSION_KEY);
    return load_user(user_name);
}
    
publish({
	get_user: get_user,
	authenticate: authenticate,
	login: login,
	logout: logout
});