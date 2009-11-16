require('sys');
require('event');
require('ajax');

//TODO: ver si podemos trabajar con cookies

function is_installed(remote_site) {
    try {
        var localserver = sys.gears.create('beta.localserver');
        return localserver.canServeLocally(remote_site + '/');
    } catch (e) { 
        return false; 
    }
}

function get_availability_url(url) {
    var new_url = url;
    // bust the browser's cache to make sure we are really talking to the
    // server
    new_url += (url.indexOf("?") == -1)? "?" : "&";
    new_url += "browserbust=" + new Date().getTime();
    return new_url;
}

function network_check(check_url, go_offline) {
    var self = this;
    var get = new ajax.Request(get_availability_url(check_url), {
        method: 'GET',
        onComplete: function(transport) {
            if (200 != transport.status)
                go_offline();
        }
    });
}

function start_network_thread(remote_site, go_offline){
    var check_url = remote_site + '/network_check';
    return window.setInterval(function() { network_check(check_url, go_offline);}, 5000);
}

publish({
    start_network_thread: start_network_thread
});