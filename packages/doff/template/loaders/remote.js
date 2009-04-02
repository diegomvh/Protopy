$L('doff.template', 'TemplateDoesNotExist');
$L('doff.core.project', 'get_settings');
$L('ajax');

var settings = get_settings();

function get_template_sources(template_name, template_dirs) {

    var paths = [];
    if (!template_dirs)
        template_dirs = settings.TEMPLATE_DIRS;

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
            asynchronous : false,
            'onSuccess': function onSuccess(transport) {
                template = (transport.responseText);
            },
            'onFailure': function onFailure(){
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

$P({ 'load_template_source': load_template_source });