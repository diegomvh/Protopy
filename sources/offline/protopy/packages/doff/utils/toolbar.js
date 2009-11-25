require('sys');
require('event');

var Panel = type('Panel', object, {
    __init__: function(id, name, title) {
        this.id = id;
        this.name = name;
        this.title = title || name;

        //The body element, panel and hide
        this.body = document.createElement('div');
        this.body.id = "doff-panel-" + this.id;
        this.body.addClassName('doff-panel');
        this.body.hide();

        //Header
        this.header = document.createElement('h1');
        this.header.addClassName('doff-panel-header');
        this.header.insert('<span>' + this.title + '</span>');
        var close_image = document.createElement('img');
        close_image.src = sys.module_url('doff.utils', 'resources/closebox.gif');
        this.header.insert(close_image);
        event.connect(close_image, 'click', this, 'hide');

        //Content
        this.content = document.createElement('div');
        this.content.addClassName('doff-panel-content');

        //MenuTab
        this.tab = document.createElement('li');
        this.tab.update(this.name);
        this.tab.addClassName('doff-toolbar-item');
        event.connect(this.tab, 'click', this, 'toggle');
        
        this.body.insert(this.header);
        this.body.insert(this.content);

        //Style and other yerbas
        this.height = '25em';
        this.width = '300px';
    },

    set icon(value) {
        this.tab.setStyle({ 
        	paddingLeft: '26px', 
        	backgroundImage: "url('" + value + "')", 
        	backgroundRepeat: 'no-repeat',
            backgroundPosition: '6px 50%'	});
    },
    
    set height(value) {
    	this.body.setStyle({
        	minHeight: value
    	});
    },

    set width(value) {
        this.body.setStyle({
        	minWidth: value
        });
    },

    hide: function() {
        this.body.hide();
        this.bar.active_panel = null;
    },

    show: function() {
        if (!this.displayed)
            this._display();
        this.body.show();
        this.bar.active_panel = this;
    },

    visible: function() {
        return this.body.visible();
    },

    toggle: function() {
        if (this.bar.active_panel && this.bar.active_panel !== this && this.bar.active_panel.visible())
            this.bar.active_panel.hide();
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
    __init__: function() {
        this.content = document.createElement('div');
        this.content.id = 'doff-toolbar';
        this.ul = document.createElement('ul');
        this.ul.setAttribute('class', 'doff-toolbar-bar');
        this.content.insert(this.ul);
        this.stylesheet = document.createElement('link');
        this.stylesheet.rel = "stylesheet";
        this.stylesheet.type = "text/css";
        this.stylesheet.href = sys.module_url('doff.utils', 'resources/toolbar.css');
        this.active_panel = null;
    },

    add: function(element) {
        //Toolbar tab
        if (isinstance(element, Panel)) {
        	var tab = element.tab;
            element.bar = this;
            this.content.insert(element.body);
        } else if (isinstance(element, String)) {
        	var tab = document.createElement('li');
            tab.addClassName('doff-toolbar-item'); 
            tab.update(element);
        }
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
        document.getElementsByTagName('head')[0].insert(this.stylesheet);
        document.getElementsByTagName('body')[0].insert(this.content);
    }

});

publish({ 
    ToolBar: ToolBar,
    Panel: Panel
});