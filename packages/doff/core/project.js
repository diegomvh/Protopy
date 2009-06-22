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
        this.offline_support = offline_support;
	
        //Registro la ruta absoluta al soporte offline
	sys.register_path(this.offline_support, '/' + offline_support);
        //Registro la ruta absoluta al proyecto
        sys.register_path(this.package, sys.module_url(this.offline_support, '/project'));
	this.path = sys.paths[this.package];

        //Url para ver si estoy conectado
        this.availability_url = sys.module_url(offline_support, '/network_check');

        this.is_gears = !!sys.gears;
        if (this.is_gears && sys.gears.factory.hasPermission) {
            //Inicio de los stores
            this._create_stores();
        }

	//Inicio el logging
	require('logging.config', 'file_config');
        try {
            file_config(sys.module_url(this.package, 'logging.js'));
        } catch (except) {}

        this._start_network_thread();
    },

    _create_toolbar: function(){
	//The toolbar
	require('doff.utils.toolbar', 'ToolBar');

	this.toolbar = new ToolBar(this.html);
        //The status and installer bar
	require('doff.utils.toolbars.status', 'Status');
	this.toolbar.add(new Status(this));
        if (this.settings['DEBUG']) {
	    require('doff.utils.toolbars.dbquery', 'DataBaseQuery');
            require('doff.utils.toolbars.logger', 'Logger');
	    this.toolbar.add(new DataBaseQuery());
            this.toolbar.add(new Logger());
	}
        this.toolbar.add('Help');
        this.toolbar.show();
    },

    _create_stores: function(){
	//The toolbar
	var localserver = require('gears.localserver');

	this.project = new localserver.ManagedResourceStore(this.package + '_project');
        this.project.manifest_url = sys.module_url(this.offline_support, '/manifests/project.json');
        this.system = new localserver.ManagedResourceStore(this.package + '_system');
        this.system.manifest_url = sys.module_url(this.offline_support, '/manifests/system.json');
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

    go_offline: function() { 
        this.handler.hook_events();
    },
	
    go_online: function(callback) {
        this.handler.clear_hooks();
    },

    install_gears: function() {
        var message = 'To enable fast client-side search of this website '
            + 'please install Gears';
        var url = 'http://gears.google.com/?action=install'
            + '&message=' + encodeURIComponent(message)
            + '&return=' + encodeURIComponent(window.location.href);
        window.location.href = url;
        //Goodbye blue sky
    },

    get is_allowed() {
        if (!this.is_gears) this.install_gears();
        this._allowed = sys.gears.factory.hasPermission;
        if (this._allowed)
            return this._allowed;
        var site_name = this.settings.PROJECT_NAME;
        var icon = this.settings.PROJECT_IMAGE;
        var msg = this.settings.PROJECT_DESCRIPTION
            + 'This site would like to use Google Gears to enable fast, '
            + 'as-you-type searching of its documents.';

        this._allowed = sys.gears.factory.getPermission(site_name, icon, msg);
        return this._allowed;
    },

    get is_installed() {
        if (this._installed)
            return this._installed;
        var localserver = require('gears.localserver');
        this._installed = localserver.can_serve_locally('/');
        return this._installed;
    },

    install: function() {
        if (!this.is_allowed) return;

        this.system.check_for_update();
        this.project.check_for_update();
    },

    /********************************
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

publish({
    get_project: get_project,
    new_project: get_project,
    get_settings: get_settings
});