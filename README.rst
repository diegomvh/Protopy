== Protopy ==

**Protopy** is a JS library that lets you write pythonic JavaScript for your web applications. It started as a Prototype JS fork, but now it's a whole new lib.
It works under JavaScript 1.7 right now, and it offers:
 
 *Modules*
    
     An easy way to mantain your code organized, when you want to add something
     to your project, just type:
     
     {{{
        require('my_module');
        my_module.my_cool_function();

     }}}
     
     You might note there's nothing pythonic up to this moment, well, we took 
     some API names form Dojo. See more in ProtopyModules.
     
     Modlues are searched in `<protopy-path>/packages`, but wait, 
     there's something Pythonic here, you can add packages this way:
     {{{
       
       // this would be something similar to sys.path.append(something)
       sys.register_path('my_package', '/my_other_package/p1');
     }}}

 *AJAX*

     The AJAX API is very similar to Protype one.
     {{{
        require('ajax');
        function myHandler () { alert('Hello') };
        var rq = new ajax.Request('my_site.html', {method: 'POST', onSuccess: myHandler});
     }}}

 *Events*
   
     This API allows you to do event subscription and dispatching.

 *DOM*

    We have a speedy CSS3 selector called [ http://jamesdonaghue.com/?p=40 Peppy ]
    If you're familiar with Prototype, you might find the same API, `$(id)` and 
    `$$(css)`.

 *Pythonic Objects*

    Protopy proviedes 2.2+ Python Object Oriented type system. Most modules are
    built on top of this OO types.
    {{{
       var Person = new type('Person', [object ], {
          __init__: function (name, age) {
              this._name = name;
              this._age = age;
          },
          __str__: function() {
              // There is a little mix here, all we wanted to add was the % operator
              return "My name is %s and I'm %d years old".subs(this._name, this._age);
          }
       });
     }}}

 *Gear wrapping*
    
    Gears is managed this way, as HTML 5 implementations becomes more mature, we'll
    add support for differents Database, Workers and LocalServer backends.

    {{{
      require('sys');
      var db = sys.gears.create('beta.database');
    }}}

 *Doff* Django Offline!  

    Doff is a Django JavaScript implementation built upon Protopy.

    Doff primary goal is to enable Django developers to port their apps offline 
    (Django,    OFFline). We tried to reduce the amount of code needed to bring you
    Django project offline (such as transparten model remoting, same templates) and
    some extra features such as data security (restrict sensible infomation to be
    transfered to the client) and a WIP mechanism for data synchronization.

= Offline Django App =

*Doff* and *Protopy* are distributed in a generic Django app that adds some commands
to facilitate existing Django apps offline [OfflineAppCommands].

== How To Start ==

The code is in alpha state right now, but it works, so feel free to clone it and watch it progress. Any contribution is highly appreciated.

== Future ==

We've been thinking about:

 * Porting Django Admin among other contib apps.

 * JavaScript 1.7 to JavaScript 1.6 compiler (soemthing like closure, but using our OO approach).

 * Some extra fields such as Data Fields (image, blob).

 * Isolate the "server" code in a Worker Pool.

 * Advanced caching, since most context does not need to be destroyed on every request.
