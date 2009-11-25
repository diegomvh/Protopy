/* 'Wrapper for loading templates from "template" directories in INSTALLED_APPS packages.' */
require('doff.template.base', 'TemplateDoesNotExist');
require('doff.core.exceptions', 'ImproperlyConfigured');
require('ajax');
require('doff.conf.settings', 'settings');

// It won't change, so convert it to a tuple to save memory.
var app_template_dirs = [];

// At compile time, cache the directories to search.
for each (var app in settings.INSTALLED_APPS) {
    var file = app.split('.').join('/');
    var template_dir = file + '/templates/';
    app_template_dirs.push(template_dir);
}

function get_template_sources(template_name, template_dirs) {
    var paths = [];
    if (!template_dirs)
        template_dirs = app_template_dirs;
    for each (var template_dir in template_dirs)
        paths.push(template_dir + template_name);
    return paths;
}

function load_template_source(template_name, template_dirs) {
    var tried = [],
        paths = get_template_sources(template_name, template_dirs),
        template = null,
        error_msg = '';
    for each (var path in paths){
        /* Levantar los templates */
        new Request(path, {
            method: 'GET',
            asynchronous : false,
            onSuccess: function onSuccess(transport) {
                template = (transport.responseText);
            },
            onFailure: function onFailure(){
                tried.push(path);
            }
        });
        if (template) return [template, path];
    }
    if (bool(tried))
        error_msg = "Tried %s".subs(tried);
    else
        error_msg = "Your TEMPLATE_DIRS setting is empty. Change it to point to at least one template directory.";
    throw new TemplateDoesNotExist(error_msg);
}

publish({ 
    load_template_source: load_template_source 
});
