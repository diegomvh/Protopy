require('rpc', 'ServiceProxy');
require('doff.contrib.extradata.models', 'ExtraData');
require('doff.core.project', 'get_project');
require('event');

var SESSION_KEY = '_auth_user_id';
var _proxy = null;

function load_user(username) {
	var data = null;
	require('doff.contrib.auth.models', 'User', 'AnonymousUser');
	try {
		if (_proxy == null)
			_proxy = new ServiceProxy(get_project().offline_support + '/sync', { asynchronous: false });
		data = _proxy.user();
	} catch (e) {
		try {
			// Busco localmente
			var obj = ExtraData.objects.get({'name': 'User', 'module': 'doff.contrib.auth.models', 'key': username});
			data = obj.data;
		} catch (e if isinstance(e, ExtraData.DoesNotExist)) {}
	}
	
	if (!data || data['class'] == 'AnonymousUser')
		return new AnonymousUser();
	return new User(data);
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
    var user_name = request.session.get(SESSION_KEY);
    return load_user(user_name);
}

function ensure_capture_user(callback) {
	var proxy = new ServiceProxy(get_project().offline_support + '/sync', { asynchronous: false });
	var data = proxy.user();
	if (data && data['class'] != 'AnonymousUser') {
		var ed = new ExtraData();
		var user = new User(data);
		ed.data = user;
		ed.key = user.username;
		print(ed);
		ed.save();
	}
}

//This module is required by middleware, the event is subscribed
var hcu = event.subscribe('post_install', ensure_capture_user);

publish({
	get_user: get_user,
	authenticate: authenticate,
	login: login,
	logout: logout
});