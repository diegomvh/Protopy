require('doff.utils.toolbar', 'Panel');
require('ajax');
require('event');

var install_template = 
(<r><![CDATA[
    <style>
        div#offline-content {
            font-size: 92%;
            font-weight: normal;
            min-height: 200px;
            padding: 0 165px 0 2em;
        }
        div#offline-content img {
            position: absolute;
            right: 8px;
            top: 38px;
        }
    </style>
    <div id="offline-content"></div>
    <div id="offline-buttons">
        <button id="offline-button-enable">Enable offline access</button>
        <button id="offline-button-cancel">Cancel</button>
    </div>
]]></r>).toString();

var Offline = type('Offline', [ Panel ], {
    __init__: function(project) {
	this.config = project.settings;
        super(Panel, this).__init__('logger', 'Offline', 'Install offline access for ' + this.config['PROJECT_NAME']);
	this.height = '20em';
	this.width = '40%';
    },

    get_template: function() {
        return install_template;
    },

    _display: function() {
        super(Panel, this)._display();
        var self = this;

        $('offline-content').insert('<p>' + this.config['PROJECT_DESCRIPTION'] + '</p>');
        $('offline-content').insert('<p>Suggests to:</p>');
        for each (var a in this.config['ADMINS'])
            $('offline-content').insert('<p>' + a[0] + ': <i>' + a[1] + '</i></p>');
        $('offline-content').insert('<img src="' + this.config['PROJECT_IMAGE'] + '" width="100"/>');
    }
});

publish({
    Offline: Offline
});