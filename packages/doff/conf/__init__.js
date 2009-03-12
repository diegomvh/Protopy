var glb_settings = $L('doff.conf.global_settings');
$L('ajax', 'Request');

new Request(window.settings, {
        asynchronous : false,
        'onSuccess': function onSuccess(transport) {
            code = '(' + transport.responseText + ');';
            var project = eval(code);
            extend(glb_settings, project);
        },
        'onException': function onException(obj, exception){
            throw exception;
        },
        'onFailure': function onFailure(transport){
            throw "No settings";
        }
    });

$P({'settings': glb_settings});