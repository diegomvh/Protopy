require('sys');
require('event');

var Panel = type('Panel', object, {
    __init__: function() {
        this.div = document.createElement('div');
        this.hide();
    },

    hide: function() {
	this.div.hide();
    },

    show: function() {
	if (!this.displayed){
	    this._display();
            this.displayed = true;
        }
	this.div.show();
    },

    visible: function() {
        return this.div.visible();
    },

    toggle: function() {
        this[this.visible() ? 'hide' : 'show']();
    },

    _display: function() {}

});

var ToolBar = type('Toolbar', object, {
    __init__: function() {
        this.content = document.createElement('div');
        this.content.id = 'toolbar';
        this.ul = document.createElement('ul');
        this.content.insert(this.ul);
        this.stylesheet = document.createElement('link');
        this.stylesheet.rel = "stylesheet";
        this.stylesheet.type = "text/css";
        this.stylesheet.href = sys.module_url('doff.utils', 'resources/toolbar.css');
    },

    add: function(name, panel) {
        var item = document.createElement('li');
        item.update(name);
        this.ul.insert(item);
        if (isinstance(panel, Panel)) {
            this.content.insert(panel.div);
            event.connect(item, 'click', function() { 
                panel.toggle(); 
            });
        }
        return item;
    },

    hide: function() {
        this.ul.hide();
    },

    show: function() {
	if (!this.displayed) {
	    this._display();
            this.displayed = true;
        }
	this.ul.show();
    },

    _display: function () {
	var body = $$('body')[0];
        body.insert(this.stylesheet);
	body.insert(this.content);
    }
    
});

publish({ 
    ToolBar: ToolBar,
    Panel: Panel
});