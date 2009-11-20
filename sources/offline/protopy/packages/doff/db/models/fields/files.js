/*import datetime
import os

from django.conf import settings
from django.core.files.base import File, ContentFile
from django.core.files.storage import default_storage
from django.core.files.images import ImageFile, get_image_dimensions
from django.core.files.uploadedfile import UploadedFile
from django.utils.functional import curry
from django.db.models import signals
from django.utils.encoding import force_unicode, smart_str
from django.utils.translation import ugettext_lazy, ugettext as _
from django.db.models.loading import cache
*/
require('event');
require('doff.db.models.fields.base', 'Field');
var forms = require('doff.forms.base');

var default_storage = {};

var FieldFile = type('FieldFile', [ object ], {
    __init__: function(instance, field, name) {
        this.instance = instance;
        this.field = field;
        this.storage = field.storage;
        this._name = name || '';
        this._committed = true;
    },

    __eq__: function(other) {
        // Older code may be expecting FileField values to be simple strings.
        // By overriding the == operator, it can remain backwards compatibility.
        if (hasattr(other, 'name'))
            return this.name == other.name;
        return this.name == other;
    },

    __ne__: function(other) {
        return !this.__eq__(other);
    },

    // The standard File contains most of the necessary properties, but
    // FieldFiles can be instantiated without a name, so that needs to
    // be checked for here.

    _require_file: function() {
        if (!this)
            throw new ValueError("The '%s' attribute has no file associated with it.".subs(this.field.name));
    },

    get file() {
        this._require_file();
        if (!hasattr(this, '_file') || this._file == null)
            this._file = this.storage.open(this.name, 'rb');
        return this._file;
    },

    set file(file) {
        this._file = file;
    },

    get path() {
        this._require_file();
        return this.storage.path(this.name);
    },

    get url() {
        this._require_file();
        return this.storage.url(this.name);
    },

    get size() {
        if (!this._committed)
            return len(this.file);
        return this.storage.size(this.name);
    },

    open: function(mode) {
        mode = mode || 'rb';
        this._require_file();
        this.file.open(mode);
    // open() doesn't alter the file's contents, but it does reset the pointer
    },

    // In addition to the standard File API, FieldFiles have extra methods
    // to further manipulate the underlying file, as well as update the
    // associated model instance.

    save: function(name, content, save) {
        save = save || true;
        name = this.field.generate_filename(this.instance, name);
        this._name = this.storage.save(name, content);
        setattr(this.instance, this.field.name, this.name);

        // Update the filesize cache
        this._size = len(content);

        // Save the object because it has changed, unless save is False
        if (save)
            this.instance.save();
    },

    delete: function(save) {
        save = save || true;
        // Only close the file if it's already open, which we know by the presence of this._file
        if (hasattr(this, '_file')) {
            this.close();
            delete this._file;
        }

        this.storage.delete(this.name);

        this._name = null;
        setattr(this.instance, this.field.name, this.name);

        // Delete the filesize cache
        if (hasattr(this, '_size'))
            delete this._size;

        if (save)
            this.instance.save();
    },

    __getstate__: function() {
        // FieldFile needs access to its associated model field and an instance
        // it's attached to in order to work properly, but the only necessary
        // data to be pickled is the file's name itthis. Everything else will
        // be restored later, by FileDescriptor below.
        return {'_name': this.name, '_closed': false};
    }
});

var FileDescriptor = type('FileDescriptor', [ object ], {
    __init__: function(field) {
        this.field = field;
    },

    __get__: function(instance, instance_type) {
        if (isundefined(instance))
            throw new AttributeError("%s can only be accessed from %s instances.".subs(this.field.name(this.owner.__name__)));
        var file = instance["_" + this.field.name];
        if (isinstance(file, String) || file == null) {
            var attr = new this.field.attr_class(instance, this.field, file);
            instance["_" + this.field.name + "_file"] = attr;
        } else if (isinstance(file, File) && !isinstance(file, FieldFile)) {
            var file_copy = new this.field.attr_class(instance, this.field, file.name);
            file_copy.file = file;
            file_copy._committed = false;
            instance["_" + this.field.name + "_file"] = file_copy;
        } else if (isinstance(file, FieldFile) && !hasattr(file, 'field')) {
            file.instance = instance;
            file.field = this.field;
            file.storage = this.field.storage;
        }
        return instance["_" + this.field.name];
    },

    __set__: function(instance, instance_type, value) {
    	instance["_" + this.field.name] = value;
    }
});

var FileField = type('FileField', [ Field ], {
    attr_class: FieldFile,
    descriptor_class: FileDescriptor,

    __init__: function(verbose_name, name, upload_to, storage) {
		var arg = new Arguments(arguments, {'verbose_name': null, 'name':null, 'upload_to':'', 'storage':null});
		var kwargs = arg.kwargs;
        for each (var a in ['primary_key', 'unique']) {
            if (a in arg.kwargs)
                throw new TypeError("'%s' is not a valid argument for %s.".subs(arg, this.__class__));
        }

        this.storage = kwargs['storage'] || default_storage;
        this.upload_to = kwargs['upload_to'];
        if (callable(upload_to))
            this.generate_filename = upload_to;

        arg.kwargs['max_length'] = arg.kwargs['max_length'] || 100;
        super(Field, this).__init__(arg);
    },

    get_internal_type: function() {
        return "FileField";
    },

    get_db_prep_lookup: function(lookup_type, value) {
        if (hasattr(value, 'name'))
            value = value.name;
        return super(Field, this).get_db_prep_lookup(lookup_type, value);
    },

    get_db_prep_value: function(value) {
        /* Returns field's value prepared for saving into a database.*/
        // Need to convert File objects provided via a form to unicode for database insertion
        if (isundefined(value) || value == null)
            return null;
        return string(value);
    },
    
    contribute_to_class: function(cls, name) {
        super(Field, this).contribute_to_class(cls, name);
        var fd = new this.descriptor_class(this);
        cls.prototype.__defineGetter__(this.name, function(){ return fd.__get__(this, this.constructor); });
        cls.prototype.__defineSetter__(this.name, function(value){ return fd.__set__(this, this.constructor, value); });
        event.subscribe('post_delete', this.delete_file);
    },

    delete_file: function(instance, sender) {
        var arg = new Arguments(arguments);
        var file = getattr(instance, this.attname);
        // If no other object of this type references the file,
        // and it's not the default value for future objects,
        // delete it from the backend.
        //TODO: no se puede filtar asi, hay que armar el objeto
        var filter = {};
        filter[this.name] = file.name;
        if (file && file.name != this.default && !sender._default_manager.filter(filter))
            file.delete(false);
        else if (file)
            // Otherwise, just close the file, so it doesn't tie up resources.
            file.close();
    },
    
    get_directory_name: function() {
        return os.path.normpath(force_unicode(datetime.datetime.now().strftime(smart_str(this.upload_to))));
    },

    get_filename: function(filename) {
        return os.path.normpath(this.storage.get_valid_name(os.path.basename(filename)));
    },

    generate_filename: function(instance, filename) {
        return os.path.join(this.get_directory_name(), this.get_filename(filename));
    },

    save_form_data: function(instance, data) {
        if (data && isinstance(data, UploadedFile))
            getattr(instance, this.name).save(data.name, data, false);
    },

    formfield: function() {
        var arg = new Arguments(arguments);
        var kwargs = arg.kwargs;
        var defaults = {'form_class': forms.FileField}
        // If a file has been provided previously, then the form doesn't require
        // that a new file is provided this time.
        // The code to mark the form field as not required is used by
        // form_for_instance, but can probably be removed once form_for_instance
        // is gone. ModelForm uses a different method to check for an existing file.
        if ('initial' in kwargs)
            defaults['required'] = false;
        extend(defaults, kwargs);
        return super(Field, this).formfield(defaults);
    }
});

var ImageFileDescriptor = type('ImageFileDescriptor' ,[ FileDescriptor ], {
    __set__: function(instance, instance_type, value) {
        var previous_file = !isundefined(instance["_" + this.field.name]);
        super(FileDescriptor, this).__set__(instance, instance_type, value);

        if (previous_file)
            this.field.update_dimension_fields(instance, true);
	}
});

var ImageFieldFile = type('ImageFieldFile', [ FieldFile ], {
    delete: function(save) {
        // Clear the image dimensions cache
        save = save || true;
        if (hasattr(this, '_dimensions_cache'))
            delete this._dimensions_cache;
        super(FieldFile, this).delete(save);
    }
});

var ImageField = type('ImageField', [ FileField ], {
    attr_class: ImageFieldFile,
    descriptor_class: ImageFileDescriptor,

    __init__: function(verbose_name, name, width_field, height_field) {
		var arg = new Arguments(arguments, {'verbose_name': null, 'name':null, 'width_field':null, 'height_field':null});
		var kwargs = arg.kwargs;
		this.width_field = kwargs['width_field'];
		this.height_field = kwargs['height_field'];
        super(FileField, this).__init__(verbose_name, name);
    },
    
    contribute_to_class: function(cls, name) {
    	event.subscribe('post_init', this.update_dimension_fields);
        super(FileField, this).contribute_to_class(cls, name);
    },

    update_dimension_fields: function(instance) {},
    
    formfield: function() {
        var arg = new Arguments(arguments);
        var kwargs = arg.kwargs;
        var defaults = {'form_class': forms.ImageField};
        extend(defaults, kwargs);
        return super(FileField, this).formfield(defaults);
    }
});

publish({
    FileField: FileField,
    ImageField: ImageField
});
