require('doff.template.base', 'TemplateDoesNotExist');
require('doff.core.project', 'get_settings');
require('ajax');

var settings = get_settings();

function get_template_sources(template_name, template_dir) {

    if (!template_dir)
        template_dir = settings.TEMPLATE_URL;
    if (template_dir === '')
	throw new TemplateDoesNotExist('Your TEMPLATE_DIRS setting is empty. Change it to point to at least one template directory');
    return template_dir + template_name;
}

function load_template_source(template_name, template_dirs) {
    var template = null,
	path = get_template_sources(template_name, template_dirs)
    new Request(path, {
	method: 'GET',
	asynchronous : false,
	onSuccess: function onSuccess(transport) {
	    template = (transport.responseText);
	}
    });
    if (template)
	return [template, path];
    throw new TemplateDoesNotExist("Tried %s".subs(path));
}

publish({ 
    load_template_source: load_template_source 
});