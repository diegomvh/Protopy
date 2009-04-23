$L('doff.core.exceptions', 'ImproperlyConfigured'),
$L('doff.template.*', 'Template', 'Context', 'TemplateDoesNotExist', 'add_to_builtins');
$L('doff.core.project', 'get_settings', 'get_project');
$L('logging.*');

var logger = logging.get_logger(__name__);
var settings = get_settings();
var project = get_project();

/* Candidato a la borrada
var LoaderOrigin = type('LoaderOrigin', [ Origin ], {
    __init__: function(display_name, loader, name, dirs) {
        super(Origin, this).__init__(display_name);
        this.loader = loader;
        this.loadname = name;
        this.dirs = dirs;
    },

    reload: function() {
        return this.loader(this.loadname, this.dirs)[0]; }
});

function make_origin(display_name, loader, name, dirs) {
    if (settings.TEMPLATE_DEBUG)
        return new LoaderOrigin(display_name, loader, name, dirs);
    else
        return null;
}
*/

//TODO: Una cache para los templates cargados
/* defo:translate
 * Busca un template para cada uno de los cargadores de template definididos en settings
 * Si los cargadores no estan iniciados, los inicia, dejandolos dentro del proyecto
 */
function find_template_source(name, dirs) {
    //TODO: ver si dejo los loaders en el proyecto o dentro de este modulo como una variable
    var template_source_loaders = project._template_source_loaders;
    if (!template_source_loaders) {
        var loaders = [];
        for each (var path in settings.TEMPLATE_LOADERS) {
            var i = path.lastIndexOf('.');
            var module = path.substring(0, i);
            var attr = path.substring(i + 1 , path.length);
            try {
                var mod = $L(module);
            } catch (e) {
                throw new ImproperlyConfigured('Error importing template source loader %s: "%s"'.subs(module, e));
            }
            try {
                var loader = getattr(mod, attr);
            } catch (e if isinstance(e, AttributeError)) {
                throw new ImproperlyConfigured('Module "%s" does not define a "%s" callable template source loader'.subs(module, attr));
            }
            loaders.push(loader);
        }
        template_source_loaders = project._template_source_loaders = loaders;
    }
    for each (var loader in template_source_loaders) {
        try {
            var [source, display_name] = loader(name, dirs);
            logger.debug("Template: %s, Name: %s, Dirs: %s", display_name, name, dirs);
            return source;
        } catch (e if isinstance(e, TemplateDoesNotExist)) { }
    }
    throw new TemplateDoesNotExist(name);
}

/* defo:translate
 * Carga un template en base a su nombre ejemplo.html
 */
function get_template(template_name) {
    var source = find_template_source(template_name);
    var template = get_template_from_string(source, template_name);
    return template;
}

function get_template_from_string(source, name) {
    return new Template(source, name);
}

/* Candidato a la borrada
function render_to_string(template_name, dictionary, context_instance) {
    var dictionary = dictionary || {};
    if (template_name instanceof Array)
        t = select_template(template_name);
    else
        t = get_template(template_name);
    if (context_instance)
        context_instance.update(dictionary);
    else
        context_instance = Context(dictionary);
    return t.render(context_instance);
}

function select_template(template_name_list) {
    for(var i = 0; template_name = template_name_list[i]; i++) {
        try {
            return get_template(template_name);
        } catch (e if e instanceof TemplateDoesNotExist) { continue; }
    }
    throw new TemplateDoesNotExist(template_name_list.join(', '));
}
*/

$P({ 
    find_template_source: find_template_source,
    get_template_from_string: get_template_from_string,
    get_template: get_template
});