require('doff.utils.toolbar', 'Panel');
require('ajax');
require('event');

var uninstalled_template = 
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
    <h2>%(PROJECT_NAME)s</h2><br>
    <p>%(PROJECT_DESCRIPTION)s</p><br>
    <h3>Motor: %(DATABASE_ENGINE)s</h3><br>
    <h3>Base de Datos: %(DATABASE_NAME)s</h3><br>
    <img src="%(PROJECT_IMAGE)s" width="100"/>
    <button id="status-button-enable">Enable offline access</button>
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

        var title = (!this.is_installed) ? 'Offline Support' : (this.project.is_online) ? 'Online' : 'Offline';
        super(Panel, this).__init__('status', title, 'Install offline access for ' + this.config['PROJECT_NAME']);

        this.width = '40%';
        this.height = '20em';

        event.connect(project, 'onNetwork', this, 'set_status');
        event.connect(project, 'onInstall', this, 'go_install');
        event.connect(project, 'onUninstall', this, 'go_uninstall');
    },

    set_status: function(status) {
        if (this.project.is_installed) {
            this.tab.update(status.capitalize());
        }
    },

    go_install: function() {
        this.tab.update('Online');
        this.project.is_installed = true;
        this._display();
    },

    go_uninstall: function() {
        this.tab.update('Offline Support');
        this.project.is_installed = false;
        this._display();
    },

    get_template: function() {
        if (this.project.is_installed)
            return installed_template;
        else
            return uninstalled_template.subs(this.config);
    },

    _display: function() {
        super(Panel, this)._display();

        if (this.project.is_installed) {
            event.connect($('status-button-disable'), 'click', this.project, 'uninstall');
        } else {
            event.connect($('status-button-enable'), 'click', this.project, 'install');
        }
    }
});

publish({
    Status: Status
});