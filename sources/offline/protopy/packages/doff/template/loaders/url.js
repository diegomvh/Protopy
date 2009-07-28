require('doff.template.base', 'TemplateDoesNotExist');
require('doff.core.project', 'get_project');
require('ajax');

var project = get_project();

function get_template_sources(template_name, template_dir) {

    if (!template_dir)
        template_dir = project.templates_url;
    if (template_dir === '')
        throw new TemplateDoesNotExist('Your template_url is empty. Change it to point to at least one template url');
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