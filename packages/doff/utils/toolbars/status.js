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
        div.status_store_bar {
            border: 1px solid #949DAD;
            height: 0.5em;
            margin: 5px;
            overflow: hidden;
            padding: 1 px;
            width: 300 px;
        }
        div.status_store_bar div.progress {
            background:#D4E4FF none repeat scroll 0 0;
            font-size:0;
            height:100%;
            width:0;
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
        event.connect(project, 'onCreateStore', this, 'hook_store');
    },

    set_status: function(status) {
        if (this.project.is_installed) {
            this.tab.update(status.capitalize());
        }
    },

    hook_store: function(store){
        $('status-content').insert('<div class="status_store_bar"><div id="' + store.name + '_progress" class="progress"></div></div>');
        var p = $(store.name + '_progress');
        event.connect(store, 'onSyncProgress', function(event){
            p.width = Math.ceil(((event.filesComplete / event.filesTotal) * 100)) + "%";
        })
    },

    install: function(event) {
        event.target.remove();
        this.project.install();
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
            event.connect($('status-button-enable'), 'click', this, 'install');
        }
    }
});

publish({
    Status: Status
});