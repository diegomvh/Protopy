require('doff.utils.toolbar', 'Panel');
require('ajax');
require('event');
require('sys');

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

        div.doff-progress-container {
            border: 1px solid #ccc; 
            width: 100px; 
            margin: 2px 5px 2px 0; 
            padding: 1px; 
            float: left; 
            background: white;
        }

        div.doff-progress-container > div {
            background-color: #ACE97C; 
            height: 12px
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
    },

    set_status: function(status) {
        if (this.project.is_installed) {
            this.tab.update(status.capitalize());
        }
    },

    install: function(e) {
        if (!sys.gears.hasPermission && !this.project.get_permission())
            return;
        if (isundefined(this.project.system))
            this.project._create_stores();

        e.target.remove();
        $('status-content').insert('<div class="doff-progress-container"><div id="doff-status-store-progress"/></div>');
        var c = len(this.project.managed_stores);
        for (var i = 0; i < c; i++)
            event.connect(this.project.managed_stores[i], 'onSyncProgress', function(event) {
                var cantidad = c;
                var indice = i;
                var valor = ((100 / cantidad) * indice) + Math.ceil((event.filesComplete / event.filesTotal) * ( 100 / cantidad ));
                print(valor);
                $('doff-status-store-progress').style.width = valor + "%";
            });
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