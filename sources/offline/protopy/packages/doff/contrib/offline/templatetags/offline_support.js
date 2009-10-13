require('doff.template.base', 'Library');

var register = new Library();

function protopy_js_include() {
    return '';
}

register.simple_tag(protopy_js_include);

publish({
    register: register
});