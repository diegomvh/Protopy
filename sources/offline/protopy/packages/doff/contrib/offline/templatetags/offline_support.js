require('doff.template.base', 'Library');

var register = new Library();

function protopy_js() { return ''; }
function offline_detect(remote_site) { return ''; }

register.simple_tag(protopy_js);
register.simple_tag(offline_detect);

publish({
    register: register
});