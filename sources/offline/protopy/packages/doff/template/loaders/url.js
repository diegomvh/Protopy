require('doff.template.base', 'TemplateDoesNotExist');
require('ajax');
require('doff.conf.settings', 'settings');

function get_template_sources(template_name, template_dirs) {
	//TODO: UNA CACHE POR AQUI
	var paths = [];
	if (!template_dirs)
        template_dirs = settings.TEMPLATE_URL;
	for each (var template_dir in template_dirs)
    	paths.push(template_dir + template_name);
	return paths;
}

function load_template_source(template_name, template_dirs) {
	debugger;
	var tried = [];
	var template = null;
    for each (var filepath in get_template_sources(template_name, template_dirs)) {
    	new Request(filepath, {
    		method: 'GET',
    		asynchronous : false,
    		onSuccess: function onSuccess(transport) {
    			template = (transport.responseText);
        	},
        	onFailure: function onSuccess(transport) {
        		tried.push(filepath);
        	},
        	onException: function onSuccess(transport) {
        		tried.push(filepath);
        	}
    	});
    	if (template)
    		return [template, filepath];
    }
    throw new TemplateDoesNotExist("Tried", {'tried': tried});
}

publish({ 
    load_template_source: load_template_source 
});