require('doff.utils.toolbar', 'Panel');
require('ajax');
require('event');
require('sys');
require('doff.conf.settings', 'settings');

var installed_template = 
(<r><![CDATA[
    <style>
        div#status-content {
            font-size: 92%;
            font-weight: normal;
            min-height: 200px;
            padding: 0 165px 0 2em;
            text-indent: 10px;
        }
        div#status-content img {
            position: absolute;
            right: 8px;
            top: 7px;
        }
    </style>
    <div id="status-content">
        <button id="status-button-disable">Disable offline access</button>
    </div>
]]></r>).toString();

var Status = type('Status', [ Panel ], {
    __init__: function(project) {
        this.project = project;
		this.config = project.settings;

        super(Panel, this).__init__('status', 'Offline', 'Install offline access for ' + this.config.PROJECT_NAME);
        this.width = '40%';
        this.icon = sys.module_url('doff.utils.toolbars', 'templates/icons/protopy.png');

        this.project.is_online ? this.go_online() : this.go_offline();
        
        this.hgon = event.subscribe('go_online', getattr(this, 'go_online'));
        this.hgoff = event.subscribe('go_offline', getattr(this, 'go_offline'));
    },

    go_online: function(status) {
        if (this.project.is_installed) {
            this.tab.update('Online');
            this.icon = sys.module_url('doff.utils.toolbars', 'templates/icons/online.png');
        }
    },
    
    go_offline: function(status) {
        if (this.project.is_installed) {
            this.tab.update('Offline');
            this.icon = sys.module_url('doff.utils.toolbars', 'templates/icons/offline.png');
        }
    },

    go_install: function(key, details) {
    	if (key === 'progress') {
    		// Store actualizando archivos
    		this.bar.setStyle({ 'width': (details.filesComplete * 100) / details.filesTotal+ '%' });
    	} else if (key === 'error') {
    		// Un error, quiza sea bueno dejarlo en un lugar de errores 
    		this.status.update(details['message']);
    	} else {
    		this.status.update(details['message']);
    	}
    },
    
    install: function(e) {
        e.target.remove();
        $('status-content').update('<h3 id="doff-progress-status"></h3><div class="doff-progress-container"><div id="doff-progress-bar"/></div></div>');
        this.status = $('doff-progress-status');
        this.bar = $('doff-progress-bar');
        this.project.install(getattr(this, 'go_install'));
    },

    get_template: function() {
    	var file = sys.module_url('doff.utils.toolbars', 'templates/status-uninstalled.html');
    	//if (this.project.is_installed)
        var template = '';
        new ajax.Request(file, {
            method: 'GET',
		    asynchronous : false,
		    onSuccess: function(transport) {
				template = transport.responseText;
		    },
		    onException: function(obj, exception) {
		    	throw exception;
		    },
		    onFailure: function(transport) {
		    	throw new Exception("No template for logger");
		    }
		});
        return new Template(template).evaluate(settings);
    },

    _display: function() {
        super(Panel, this)._display();

        if (this.project.is_installed) {
            event.connect($('status-button-disable'), 'click', this.project, 'uninstall');
        } else {
            event.connect($('status-button-enable'), 'click', this, 'install');
        }
    }
});

publish({
    Status: Status
});