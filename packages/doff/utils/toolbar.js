require('sys');
require('event');

var Panel = type('Panel', object, {
    __init__: function(id, name, title) {
        this.id = id;
	this.name = name;
	this.title = title || name;

        this.body = document.createElement('div');
        this.body.id = this.id;
        this.body.setAttribute('class', 'panel');

        //Header
        this.header = document.createElement('h1');
        this.header.setAttribute('class', 'header');
	this.header.insert('<span>' + this.title + '</span>');
        var close_image = document.createElement('img');
        close_image.src = sys.module_url('doff.utils', 'resources/closebox.gif');
        this.header.insert(close_image);
        event.connect(close_image, 'click', this, 'hide');
	
        //Content
	this.content = document.createElement('div');
	this.content.setAttribute('class', 'content');

        this.body.insert(this.header);
        this.body.insert(this.content);

	//Style and other yerbas
	this.height = '25em';
	this.width = '80%';
        this.hide();
    },

    set height(value) {
	this.body.style.height = value;
    },
    
    set width(value) {
	this.body.style.width = value;
    },

    hide: function() {
	this.body.hide();
    },

    show: function() {
	if (!this.displayed)
	    this._display();
	this.body.show();
    },

    visible: function() {
        return this.body.visible();
    },

    toggle: function() {
        this[this.visible() ? 'hide' : 'show']();
    },

    get_template: function(){ return ""; },

    _display: function() {
        var content = this.get_template();
        this.content.update(content);
        this.displayed = true;
    }

});

var ToolBar = type('Toolbar', object, {
    __init__: function(html) {
        this.html = html;
        this.content = document.createElement('div');
        this.content.id = 'toolbar';
        this.ul = document.createElement('ul');
        this.content.insert(this.ul);
        this.stylesheet = document.createElement('link');
        this.stylesheet.rel = "stylesheet";
        this.stylesheet.type = "text/css";
        this.stylesheet.href = sys.module_url('doff.utils', 'resources/toolbar.css');
	this.panels = [];
    },

    add: function(element) {
        //Toolbar tab
        var tab = document.createElement('li');
	if (isinstance(element, Panel)) {
            tab.update(element.name);
            element.tab = tab;
	    this.panels.push(element);
	    this.content.insert(element.body);
	    //TODO: Mejorar el sistema de paneles
	    event.connect(tab, 'click', element, 'toggle');
        } else if (isinstance(element, String))
	    tab.update(element);
        this.ul.insert(tab);
        return tab;
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
	this.html['head'].insert(this.stylesheet);
	this.html['body'].insert(this.content);
    }
    
});

publish({ 
    ToolBar: ToolBar,
    Panel: Panel
});