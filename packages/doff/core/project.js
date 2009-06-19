require('sys');
require('event');
require('ajax');

var Project = type('Project', object, {
    is_online: false,
    NET_CHECK: 5,
    availability_url: null,
    going_online: false,
    do_net_checking: true,

    onLoad: function() {
        //Tiro cables al html
        this.html = {'head': $$('head')[0], 'body': $$('body')[0]};

        //Inicio del handler para las url
	require('doff.core.urlhandler', 'Handler');
	this.handler = new Handler(this.settings.ROOT_URLCONF, this.html);

        this._create_toolbar();

        this._start_network_thread();

    },

    onNetwork: function(type) {
        var m = 'go_' + type;
	this[m]();
    },

    handle: function(value) {
        return this.handler.handle(value);
    },

    __init__: function(package, offline_support) {
	this.package = package;
	//Registro la ruta absoluta al soporte offline
	sys.register_path(offline_support, '/' + offline_support);
        //Registro la ruta absoluta al proyecto
        sys.register_path(this.package, sys.module_url(offline_support, '/project'));
	this.path = sys.paths[this.package];

        //Url para ver si estoy conectado
        this.availability_url = sys.module_url(offline_support, '/network_check');

	//Inicio de los stores
	require('gears.localserver', 'ManagedResourceStore');
	this.project = new ManagedResourceStore(package + '_project');
	this.project.manifest_url = sys.module_url(offline_support, '/manifests/project.json');
	this.system = new ManagedResourceStore(package + '_system');
	this.system.manifest_url = sys.module_url(offline_support, '/manifests/system.json');
	
	//Inicio el logging
	require('logging.config', 'file_config');
        file_config(sys.module_url(this.package, 'logging.js'));
    },

    _create_toolbar: function(){
	//The toolbar
	require('doff.utils.toolbar', 'ToolBar');
        
	this.toolbar = new ToolBar(this.html);
	require('doff.utils.toolbars.offline', 'Offline');
	this.toolbar.add(new Offline(this));
        if (this.settings['DEBUG']) {
	    require('doff.utils.toolbars.dbquery', 'DataBaseQuery');
            require('doff.utils.toolbars.logger', 'Logger');
	    this.toolbar.add(new DataBaseQuery());
            this.toolbar.add(new Logger());
	}	
        this.toolbar.add('Settings');
        this.toolbar.add('Help');
        this.toolbar.show();
    },

    bootstrap: function(){
	event.connect(window, 'load', this, 'onLoad');
    },

    sync_stores: function() {
        this.system.check_for_update();
        this.project.check_for_update();
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

    go_offline: function() { 
        this.handler.hook_events();
    },
	
    go_online: function(callback) {
        this.handler.clear_hooks();
    },
	
    network_check: function network_check(){
	var self = this;
	var get = new ajax.Request(this._get_availability_url(), {
	    method: 'GET',
	    onSuccess: function(transport) {
		if(!self.is_online){
		    self.is_online = true;
		    self.onNetwork("online");
		}
	    },
	    onException: function(transport){
		if(self.is_online) {
		    self.is_online = false;
		    self.onNetwork("offline");
		}
	    }
	});
    },

    _start_network_thread: function(){
	if(!this.do_net_checking){
	    return;
	}
	this.thread = window.setInterval(getattr(this, 'network_check'), this.NET_CHECK * 1000);
    },

    _stop_network_thread: function(){
	if (this.thread != null) {
	    window.clearInterval(this.thread);
	    this.thread = null;
	}
    },

    _get_availability_url: function(){
	var url = this.availability_url;
	// bust the browser's cache to make sure we are really talking to the server
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

/* Ideas que tengo que agregar

if (!google.gears.factory.hasPermission) {
    var siteName = 'My Site';
    var icon = 'images/myIcon.png';
    var msg = 'This site would like to use Google Gears to enable fast, '
            + 'as-you-type searching of its documents.';
    
    var allowed = google.gears.factory.getPermission(siteName, icon, msg);
}

--Detectar si esta gears y mostrar el link para instalacion
!sys.browser.features.Gears
var message = 'To enable fast client-side search of this website '
            + 'please install Gears';
var url = 'http://gears.google.com/?action=install'
            + '&message=' + encodeURIComponent(message)
            + '&return=' + encodeURIComponent(window.location.href);
widget.innerHTML = '<a href="' + url + '">Install '
                + 'Gears to enable fast search!</a>';
return false;


*/
publish({
    get_project: get_project,
    new_project: get_project,
    get_settings: get_settings
});