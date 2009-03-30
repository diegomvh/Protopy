$L('sys');
function slurp(){};

var ui = {
    name: "",
    path: "",
    module: "",
    onLoad: function onLoad(){}
}

function settings_url() {
    if (!ui.path) 
        throw new Exception('No path to project');
    return ui.path + 'settings.js';
}

function initialize(){
    if (!ui.path) 
        throw new Exception('No path to project');
    sys.register_module_path(ui.module, ui.path);
    this._initializeCalled = true;
    this._storageLoaded = true;
    this._pageLoaded = true;
    if(this._storageLoaded && this._pageLoaded){
        ui.onLoad();
    }
};

$P({
    files: {slurp: slurp},
    ui: ui,
    initialize: initialize,
    settings_url: settings_url
});