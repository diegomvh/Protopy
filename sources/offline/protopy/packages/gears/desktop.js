require('sys');

var desktop = google.gears.factory.create('beta.desktop');

var Icon = type('Icon', [ object ], {
    _sizes: ['128x128', '48x48', '32x32', '16x16'],
    __init__: function() {
        for each (var s in this._sizes)
            this[s]= null;
    },

    validate: function() {
        for each (var s in this._sizes)
            if (this[s] === null)
                throw new ValueError('Image for size %s is requere'.subs(s));
    },

    is_valid: function() {
        try {
            this.validate();
        } catch (e if isinstance(e, ValueError)) {
            return false;
        }
        return true;
    }
});

var _themes = ['tux'];

var IconTheme = type('Icon', [ Icon ], {
    __init__: function(name) {
        if (!include(_themes, name))
            throw new ValueError('The theme %s is not installed'.subs(name));
        for each (var s in this._sizes)
            this[s] = sys.module_url('gears', 'resources/icons/' + name + s + '.png');
    }
});

var Shortcut = type('Shortcut', [ object ], {
    __init__: function(name, url) {
        assert(bool(name), 'The name of shortcut is requere');
        assert(bool(url), 'The url of shortcut is requere');
        this.name = name;
        this.url = url;
        this.description = null;
        this.icon = null;
    },
    save: function() {
        desktop.createShortcut(this.name, this.url, this.icon);
    }
});


publish({
    Icon: Icon,
    IconTheme: IconTheme,
    Shortcut: Shortcut
});