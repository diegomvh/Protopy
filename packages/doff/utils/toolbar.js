var Toolbar = type('Toolbar', object, {

    __init__: function() {
	this.bar = document.createElement('ul');
	this.bar.id = 'toolbar';
    },

    add_item: function(name) {
	var item = document.createElement('li');
	item.update(name);
	this.bar.insert(item);
	return item;
    },

    hide: function() {
	this.bar.style.display = 'none';
    },

    show: function() {
	if (!this.displayed)
	    this._display();
	this.bar.style.display = '';
    },
    
    _display: function () {
	var body = $$('body')[0];
	body.insert(this.bar);
	this.displayed = true;
    }
    
});

publish({ Toolbar: Toolbar });