require('sys');
require('event');

var Panel = type('Panel', object, {
    __init__: function(id, title) {
        this.id = id;
	this.title = title;
        
	this.content = document.createElement('div');
        this.content.id = this.id;
	this.content.setAttribute('class', 'panel');
	this.close_image = document.createElement('img');
        this.close_image.src = sys.module_url('doff.utils', 'resources/closebox.gif');
        
	//Style and other yerbas
	this.height = '25em';
	this.width = '80%';
        this.hide();
    },

    set height(value) {
	this.content.style.height = value;
    },
    
    set width(value) {
	this.content.style.width = value;
    },

    hide: function() {
	this.content.hide();
    },

    show: function() {
	if (!this.displayed)
	    this._display();
	this.content.show();
    },

    visible: function() {
        return this.content.visible();
    },

    toggle: function() {
        this[this.visible() ? 'hide' : 'show']();
    },

    get_template: function(){ return ""; },

    _display: function() {
        var content = this.get_template();
        var head = document.createElement('h1');
	head.insert('<span>' + this.title + '</span>');
        head.insert(this.close_image);
        event.connect(this.close_image, 'click', this, 'hide');
	this.content.insert(head);
        this.content.insert(content);
        this.displayed = true;
    }

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
            event.connect(item, 'click', element, 'toggle');
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