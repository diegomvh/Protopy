var auth = require('doff.contrib.auth.base');
require('doff.utils.http', 'HttpResponseRedirect');

function login(request) {
    var username = request.POST['username'];
    var password = request.POST['password'];
    var user = auth.authenticate(username=username, password=password);
    if (user != null)
        if (user.is_active)
        	auth.login(request, user);
    return new HttpResponseRedirect('/');
} 
        
function logout(request) {
    request.session.clear();
    auth.logout(request);
    return new HttpResponseRedirect('/');
}

publish({ 
	login: login,
	logout: logout
});
