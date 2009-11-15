require('sys');
require('event');
require('ajax');

var Project = type('Project', object, {
    is_online: true,
    NET_CHECK: 5,
    availability_url: null,
    do_net_checking: true,
    managed_store: null,

    onLoad: function() {
        // Creo el adaptador para el DOM y hago que tome el control de sys.window, sys.document y sys.history
        require('doff.core.client', 'DOMAdapter');
        sys.window = new DOMAdapter();
        sys.document = sys.window.document;
        sys.history = sys.window.history;

        // Inicio del handler para las url
        require('doff.core.handler', 'LocalHandler');
        this.handler = new LocalHandler(this.settings);

        // Conecto el adaptador al manejador
        event.connect(sys.window, 'send', this.handler, 'receive');
        event.connect(this.handler, 'send', sys.window, 'receive');

        // Inicio del handler para la sincronizacion
        require('doff.contrib.offline.handler', 'SyncHandler');
        this.sync = new SyncHandler(this.settings);

        // Inicio el logging, si no hay hay archivo de configuracion no pasa nada
        require('logging.config', 'file_config');
        try {
            file_config(sys.module_url(this.package, 'logging.js'));
        } catch (except) {}

        this.load_toolbar();
        this.start_network_thread();
        sys.window.location = '/';
    },

    onNetwork: function(type) {},

    __init__: function(package, offline_support) {
        this.package = package;
        this.offline_support = offline_support;

        // Registro la ruta al proyecto
        sys.register_path(this.package, this.offline_support + '/js');

        // Url para ver si estoy conectado
        this.availability_url = this.offline_support + '/network_check';

        // Los templates
        this.templates_url = this.offline_support + '/templates/';

        // Estoy conectado?
        this.network_check();
    },

    load_toolbar: function() {
    	require('doff.core.exceptions');
        require('doff.utils.toolbar', 'ToolBar');

        this.toolbar = new ToolBar();
        
        for each (var toolbar_path in this.settings.TOOLBAR_CLASSES) {
            var dot = toolbar_path.lastIndexOf('.');
            if (dot == -1)
                throw new exceptions.ImproperlyConfigured('%s isn\'t a toolbar module'.subs(toolbar_path));
            var [ tb_module, tb_classname ] = [ toolbar_path.slice(0, dot), toolbar_path.slice(dot + 1)];
            try {
                var mod = require(tb_module);
            } catch (e if isinstance(e, LoadError)) {
                throw new exceptions.ImproperlyConfigured('Error importing toolbar %s: "%s"'.subs(tb_module, e));
            }
            var tb_class = getattr(mod, tb_classname);
            if (isundefined(tb_class))
                throw new exceptions.ImproperlyConfigured('Toolbar module "%s" does not define a "%s" class'.subs(tb_module, tb_classname));

            var tb_instance = new tb_class();
            
            this.toolbar.add(tb_instance);
        }
        
        this.toolbar.show();
    },

    create_store: function() {
        var localserver = sys.gears.create('beta.localserver');
        this.managed_store = localserver.createManagedStore(this.package + '_manifest');
        this.managed_store.manifestUrl = this.offline_support + '/manifest.json';
        this.managed_store.checkForUpdate();
    },

    remove_store: function() {
        var localserver = sys.gears.create('beta.localserver');
        localserver.removeManagedStore(this.package + '_manifest');
        this.managed_store = null;
    },

    bootstrap: function(){
        event.connect(window, 'load', this, 'onLoad');
    },

    get settings() {
        if (this._settings)
            return this._settings;
        var self = this;
        var global_settings = require('doff.conf.settings');
        var url_settings = sys.module_url(this.package, 'settings.js');
        new ajax.Request(url_settings, {
            method: 'GET',
            asynchronous : false,
            onSuccess: function(transport) {
                var code = '(' + transport.responseText + ');';
                var project_settings = eval(code);
                self._settings = extend(global_settings, project_settings);
            },
            onException: function(obj, exception) {
                throw exception;
            },
            onFailure: function(transport) {
                throw new Exception("No settings");
            }
        });
        return this._settings;
    },

    get_permission: function() {
        if (sys.gears.hasPermission)
            return true;
        var site_name = this.settings.PROJECT_NAME;
        var icon = this.settings.PROJECT_IMAGE;
        var msg = this.settings.PROJECT_DESCRIPTION
            + 'This site would like to use Google Gears to enable fast, '
            + 'as-you-type searching of its documents.';

        return sys.gears.getPermission(site_name, icon, msg);
    },

    get is_installed() {
        try {
            var localserver = sys.gears.create('beta.localserver');
            return localserver.canServeLocally(this.offline_support + '/');
        } catch (e) { return false; }
    },

    onInstallProgress: function(type) {},
    
    install: function() {
        if (!sys.gears.installed) sys.gears.install();
        if (!this.get_permission()) return;
        if (this.managed_store == null)
            this.create_store();

        require('doff.db.utils','syncdb');
        syncdb();
    },

    uninstall: function() {
        require('doff.db.utils','removedb');
        removedb();

        this.remove_store();
    },

    /***************************************************************************
     * Network Check
     */
    network_check: function network_check(){
        var self = this;
        var get = new ajax.Request(this._get_availability_url(), {
            method: 'GET',
            onComplete: function(transport) {
                if (200 == transport.status) {
                    if(!self.is_online) {
                        self.is_online = true;
                        self.onNetwork("online");
                   }
                } else if(self.is_online) {
                    self.is_online = false;
                    self.onNetwork("offline");
                }
            }
        });
    },

    start_network_thread: function(){
        if(!this.do_net_checking)
            return;
        this.thread = window.setInterval(getattr(this, 'network_check'), this.NET_CHECK * 1000);
    },

    stop_network_thread: function(){
        if (this.thread != null) {
            window.clearInterval(this.thread);
            this.thread = null;
        }
    },

    _get_availability_url: function(){
        var url = this.availability_url;
        // bust the browser's cache to make sure we are really talking to the
        // server
        url += (url.indexOf("?") == -1)? "?" : "&";
        url += "browserbust=" + new Date().getTime();
        return url;
    }
});

/**
 * Instancia del proyecto
 */
var project = null;

function get_project(package, offline_support){
    if (!package && !project) 
        throw new Exception('No project');
    if (!project) 
        project = new Project(package, offline_support);
    return project;
}

function get_settings() {
    return get_project().settings;
}

publish({
    get_project: get_project,
    new_project: get_project,
    get_settings: get_settings
});