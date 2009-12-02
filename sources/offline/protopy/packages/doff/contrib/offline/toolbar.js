require('doff.utils.toolbar', 'Panel');
require('ajax');
require('event');

var Sync = type('Sync', Panel, {
    __init__: function() {
        super(Panel, this).__init__('sync', 'Sync Tool', 'Sincronizacion de datos');
        this.icon = sys.module_url('doff.contrib.offline', 'resources/icons/sync.png');
    },

    get_template: function() {
        var file = sys.module_url('doff.contrib.offline', 'resources/sync.html');
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
            throw new Exception("No template for sync");
            }
        });
        return template;
    },

    _display: function() {
        super(Panel, this)._display();
    }
});

publish({
    Sync: Sync
});