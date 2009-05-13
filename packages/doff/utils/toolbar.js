require('sys');
require('event');

var Toolbar = type('Toolbar', object, {

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

    add_item: function(name) {
        var item = document.createElement('li');
        item.update(name);
        this.ul.insert(item);
        return item;
    },

    add_panel: function(name, content) {
        var item = this.add_item(name);
        var panel = document.createElement('div');
        panel.insert(content);
        panel.hide();
        this.content.insert(panel);
        event.connect(item, 'click', function() { panel.toggle(); });
        return panel;
    },

    hide: function() {
	this.ul.style.display = 'none';
    },

    show: function() {
	if (!this.displayed)
	    this._display();
	this.ul.style.display = '';
    },
    
    _display: function () {
	var body = $$('body')[0];
        body.insert(this.stylesheet);
	body.insert(this.content);
	this.displayed = true;
    }
    
});

publish({ Toolbar: Toolbar });