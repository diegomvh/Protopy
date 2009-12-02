require('doff.utils.toolbar', 'Panel');
require('ajax');
require('event');
require('sys');

var uninstalled_template = 
(<r><![CDATA[
    <style>
        div#info-content {
            font-size: 92%;
            font-weight: normal;
            min-height: 200px;
            padding: 0 165px 0 2em;
            text-indent: 10px;
        	border-bottom: 1px solid; 
        }
        div#info-content img {
            position: absolute;
            right: 8px;
            top: 7px;
        }

        div.doff-progress-container {
            border: 1px solid #ccc; 
            width: 100%;
        	height: 12px
            margin: 2px 5px 2px 0; 
            padding: 1px; 
            float: left; 
            background: white;
        }

        div#doff-progress-bar {
            background-color: #ACE97C; 
        	height:12px;
            width: 0px;
        }

    </style>
    <div id="info-content">
    <p>%(PROJECT_DESCRIPTION)s</p>
    <h3>Motor: %(DATABASE_ENGINE)s</h3>
    <h3>Base de datos: %(DATABASE_NAME)s</h3>
    <h3>Store: %(PROJECT_NAME)s_store</h3>
    <img src="%(PROJECT_IMAGE)s" style="border: 0px;" width="150"/>
    </div>
    <div id="status-content">
    	<button class="doff-panel-button" id="status-button-enable">Enable offline access</button>
    </div>
]]></r>).toString();

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

        super(Panel, this).__init__('status', 'Offline Support', 'Install offline access for ' + this.config.PROJECT_NAME);
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
        if (this.project.is_installed) {
            return installed_template;
        } else {
        	return new Template(uninstalled_template).evaluate(this.config);
        }
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