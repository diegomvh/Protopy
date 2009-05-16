require('sys');
require('event');

var Panel = type('Panel', object, {
    __init__: function(id, title) {
	this.id = id;
	this.title = title;
        this.content = document.createElement('div');
        this.content.id = this.id;
	this.content.setAttribute('class', 'panel');
        this.hide();
    },

    hide: function() {
	this.content.hide();
    },

    show: function() {
	if (!this.displayed){
	    this._display();
            this.displayed = true;
        }
	this.content.show();
    },

    visible: function() {
        return this.content.visible();
    },

    toggle: function() {
        this[this.visible() ? 'hide' : 'show']();
    },

    render: function(content) {
	var t = document.createElement('h1');
	t.update(this.title);
	this.content.insert(t);
        this.content.insert(content);
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
	this.panel_items = [];
    },

    add: function(element) {
	if (isinstance(element, Panel)) {
            var item = document.createElement('li');
	    item.setAttribute('class', 'panel');
	    item.panel = element;
	    item.update(element.title);
	    this.panel_items.push(element);
	    this.ul.insert(item);
	    this.content.insert(element.content);
	    var self = this;
            event.connect(item, 'click', function() { 
                for each (var p in self.panel_items) { 
		    if (p != element) p.hide() 
		};
		element.toggle(); 
            });
        } else if (isinstance(element, String)) {
	    var item = document.createElement('li');
	    item.update(element);
	    this.ul.insert(item);
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