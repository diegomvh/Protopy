require('sys');
require('event');
require('ajax');

var Project = type('Project', object, {
    is_online: null,
    NET_CHECK: 5,
    availability_url: null,
    do_net_checking: true,

    onLoad: function() {
        // Creo el adaptador para el DOM y hago que tome el control de sys.window, sys.document y sys.history
        require('doff.core.client', 'DOMAdapter');
        sys.window = new DOMAdapter();
        sys.document = sys.window.document;
        sys.history = sys.window.history;
        
        if (this.settings['LOADING_SPLASH']) {
        	// Load splash template
        	var template = null;
        	new Request(this.settings['LOADING_SPLASH'], {
                method: 'GET',
                asynchronous : false,
                onSuccess: function onSuccess(transport) {
                    template = (transport.responseText);
                }});
        	if (template) {
        		sys.document.update(template);
        		var messages = $('messages');
        		if (messages)
        			var hm = event.subscribe('module_loaded', function(who, module) { messages.update('<strong>' + module.__name__ + '</strong>');});
        	}
        }
        
        // Inicio del handler para las url
        require('doff.core.handler', 'LocalHandler');
        this.handler = new LocalHandler();

        // Conecto el adaptador al manejador
        event.connect(sys.window, 'send', this.handler, 'receive');
        event.connect(this.handler, 'send', sys.window, 'receive');

        // Inicio el logging, si no hay hay archivo de configuracion no pasa nada
        require('logging.config', 'file_config');
        try {
            file_config(sys.module_url(this.package, 'logging.js'));
        } catch (except) {}

        this.load_toolbar();
        this.start_network_thread();
        sys.window.location = '/';
        if (!isundefined(hm))
        	event.unsubscribe(hm);
    },

    __init__: function(package, offline_support) {
        this.package = package;
        this.offline_support = offline_support;

        // Registro la ruta al proyecto muy importente, desde este momento se puden requerir archivos del proyecto
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
        require('doff.conf.settings', 'settings');
        require('doff.utils.toolbar', 'ToolBar');

        this.toolbar = new ToolBar();

        for each (var toolbar_path in settings.TOOLBAR_CLASSES) {
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

            var tb_instance = new tb_class(this);

            this.toolbar.add(tb_instance);
        }

        this.toolbar.show();
    },

    create_store: function(callback) {
    	callback = callback || function() {};
    	var localserver = sys.gears.create('beta.localserver');
    	
    	callback('store', {	'message': 'Create store ' + this.package + '_store', 
    						'name': this.package + '_store', 
    						'manifest': this.offline_support + '/manifest.json' });
    	this.managed_store = localserver.createManagedStore(this.package + '_store');
        this.managed_store.manifestUrl = this.offline_support + '/manifest.json';
        
        this.managed_store.oncomplete = function(details) { callback('complete', details); };
 	   	this.managed_store.onerror = function(error) { callback('error', error); };
 	   	this.managed_store.onprogress = function(details) { callback('progress', details); };
 	   
        this.managed_store.checkForUpdate();
    },

    remove_store: function(callback) {
    	callback = callback || function() {};
        var localserver = sys.gears.create('beta.localserver');
        callback('store', {	'message': 'Destroy store ' + this.package + '_store', 
							'name': this.package + '_store'});
        localserver.removeManagedStore(this.package + '_store');
        this.managed_store = null;
    },

    bootstrap: function(){
        event.connect(window, 'load', this, 'onLoad');
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
    	if (!sys.gears.installed || !sys.gears.hasPermission) return false;
        try {
            var localserver = sys.gears.create('beta.localserver');
            return localserver.canServeLocally(this.offline_support + '/');
        } catch (e) { 
        	return false; 
        }
    },

    get settings() {
    	if (isundefined(this['_settings'])) {
    		require('doff.conf.settings', 'settings');
    		this._settings = settings;
    	}
    	return this._settings;
    },
    
    install: function(callback) {
    	
        if (!sys.gears.installed) sys.gears.install();
        if (!this.get_permission()) return;
        
        callback = callback || function() {};
        event.publish('pre_install', [callback]);
        
        this.create_store(callback);
        
        require('doff.db.utils','syncdb');
        syncdb(callback);
        event.publish('post_install', [callback]);
    },

    uninstall: function(callback) {
    	callback = callback || function() {};
    	event.publish('pre_uninstall', [callback]);
        require('doff.db.utils','removedb');
        removedb(callback);

        this.remove_store(callback);
        event.publish('post_uninstall', [callback]);
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
                    if(!self.is_online || self.is_online == null) {
                        self.is_online = true;
                        event.publish('go_online', [self]);
                   }
                } else if(self.is_online || self.is_online == null) {
                    self.is_online = false;
                    event.publish('go_offline', [self]);
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

publish({
    get_project: get_project,
    new_project: get_project
});