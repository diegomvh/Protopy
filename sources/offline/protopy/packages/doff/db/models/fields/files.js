/*import datetime
import os

from django.conf import settings
from django.db.models.fields import Field
from django.core.files.base import File, ContentFile
from django.core.files.storage import default_storage
from django.core.files.images import ImageFile, get_image_dimensions
from django.core.files.uploadedfile import UploadedFile
from django.utils.functional import curry
from django.db.models import signals
from django.utils.encoding import force_unicode, smart_str
from django.utils.translation import ugettext_lazy, ugettext as _
from django import forms
from django.db.models.loading import cache
*/

//TODO: ver el tipo file para gears
var FieldFile = type('FieldFile', [ File ], {
    __init__: function(instance, field, name) {
        this.instance = instance;
        this.field = field;
        this.storage = field.storage;
        this._name = name || '';
        this._closed = false;
    },

    __eq__: function(other) {
        // Older code may be expecting FileField values to be simple strings.
        // By overriding the == operator, it can remain backwards compatibility.
        if (hasattr(other, 'name'))
            return this.name == other.name;
        return this.name == other;
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
        if (!hasattr(this, '_file'))
            this._file = this.storage.open(this.name, 'rb');
        return this._file;
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
        this._require_file();
        return this.storage.size(this.name);
    },

    open: function(mode) {
        mode = mode || 'rb';
        this._require_file();
        return super(File, this).open(mode);
    // open() doesn't alter the file's contents, but it does reset the pointer
    },
    open.alters_data = true

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
    save.alters_data = true

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
    delete.alters_data = true

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

    __get__: function(instance, owner) {
            //TODO: hacer los enlaces que correspondan
        if (isundefined(instance))
            throw new AttributeError("%s can only be accessed from %s instances.".subs(this.field.name(this.owner.__name__)));
        var file = instance.__dict__[this.field.name];
        if (!isinstance(file, FieldFile)) {
            // Create a new instance of FieldFile, based on a given file name
            instance.__dict__[this.field.name] = this.field.attr_class(instance, this.field, file);
        } else if (!hasattr(file, 'field'))
            // The FieldFile was pickled, so some attributes need to be reset.
            file.instance = instance;
            file.field = this.field;
            file.storage = this.field.storage;
        return instance.__dict__[this.field.name];
    },

    __set__: function(instance, value) {
        //TODO: hacer los enlaces que correspondan
        instance.__dict__[this.field.name] = value;
    }
});

var FileField = type('FileField', [ Field ], {
    attr_class: FieldFile,
    descriptor_class: FileDescriptor,

    __init__: function(verbose_name, name, upload_to, storage) {
        verbose_name = verbose_name || null;
        name = name || null;
        upload_to = upload_to || '';
        storage = storage || null;
        var arg = new Arguments(arguments);
        for each (var a in ['primary_key', 'unique']) {
            if (a in arg.kwargs)
                throw new TypeError("'%s' is not a valid argument for %s.".subs(arg, this.__class__));
        }

        this.storage = storage || default_storage;
        this.upload_to = upload_to;
        if (callable(upload_to))
            this.generate_filename = upload_to;

        arg.kwargs['max_length'] = arg.kwargs['max_length'] || 100;
        super(Field, this).__init__(verbose_name, name, arg.kwargs);
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
        if (isundefined(value) || value is null)
            return null;
        return string(value);
    },
    
    contribute_to_class: function(cls, name) {
        //TODO: Hacer los enlaces con los descriptores
        super(Field, this).contribute_to_class(cls, name)
        setattr(cls, this.name, this.descriptor_class(this))
        signals.post_delete.connect(this.delete_file, sender=cls)
    }

    delete_file: function(instance, sender) {
        var arg = new Arguments(arguments);
        var file = getattr(instance, this.attname);
        // If no other object of this type references the file,
        // and it's not the default value for future objects,
        // delete it from the backend.
        //TODO: no se puede filtar asi, hay que armar el objeto
        if (file && file.name != this.default && !sender._default_manager.filter({this.name: file.name})
            file.delete(false);
        else if (file)
            // Otherwise, just close the file, so it doesn't tie up resources.
            file.close();
    },
    
    get_directory_name: function() {
        return os.path.normpath(force_unicode(datetime.datetime.now().strftime(smart_str(this.upload_to))));
    }

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

var ImageFieldFile = type('ImageFieldFile', [ ImageFile, FieldFile ], {
    save: function(name, content, save) {
        save = save || true;
        // Repopulate the image dimension cache.
        this._dimensions_cache = get_image_dimensions(content);

        // Update width/height fields, if needed
        if (this.field.width_field)
            setattr(this.instance, this.field.width_field, this.width);
        if (this.field.height_field)
            setattr(this.instance, this.field.height_field, this.height);

        super(FieldFile, this).save(name, content, save);
    }

    delete: function(save) {
        // Clear the image dimensions cache
        save = save || true;
        if (hasattr(this, '_dimensions_cache'))
            delete this._dimensions_cache;
        super(ImageFieldFile, this).delete(save);
    }
});

var ImageField = type('ImageField', [ FileField ], {
    attr_class: ImageFieldFile,
    descriptor_class: ImageFileDescriptor,

    __init__: function(verbose_name=None, name=None, width_field=None, height_field=None, **kwargs):
        [ this.width_field, this.height_field ] = [ width_field, height_field ];
        FileField.__init__(verbose_name, name, **kwargs);
    },

    formfield: function() {
        var arg = new Arguments(arguments);
        var kwargs = arg.kwargs;
        var defaults = {'form_class': forms.ImageField};
        extend(defaults, kwargs);
        return super(ImageField, this).formfield(defaults);
    }
});

publish({
    FileField: FileField,
    ImageField: ImageField,
});
