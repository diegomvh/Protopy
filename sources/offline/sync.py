'''
Simple XML-RPC Server.
 
This module can be used to create simple XML-RPC servers
by creating a server and either installing functions, a
class instance, or by extending the SimpleXMLRPCServer
class.
 
It can also be used to handle XML-RPC requests in a CGI
environment using CGIXMLRPCRequestHandler.
 
A list of possible usage patterns follows:
 
1. Install functions:
 
server = SimpleXMLRPCServer(("localhost", 8000))
server.register_function(pow)
server.register_function(lambda x,y: x+y, 'add')
server.serve_forever()
 
2. Install an instance:
 
class MyFuncs:
    def __init__(self):
        # make all of the string functions available through
        # string.func_name
        import string
        self.string = string
    def _listMethods(self):
        # implement this method so that system.listMethods
        # knows to advertise the strings methods
        return list_public_methods(self) +                 ['string.' + method for method in list_public_methods(self.string)]
    def pow(self, x, y): return pow(x, y)
    def add(self, x, y) : return x + y
 
server = SimpleXMLRPCServer(("localhost", 8000))
server.register_introspection_functions()
server.register_instance(MyFuncs())
server.serve_forever()
 
3. Install an instance with custom dispatch method:
 
class Math:
    def _listMethods(self):
        # this method must be present for system.listMethods
        # to work
        return ['add', 'pow']
    def _methodHelp(self, method):
        # this method must be present for system.methodHelp
        # to work
        if method == 'add':
            return "add(2,3) => 5"
        elif method == 'pow':
            return "pow(x, y[, z]) => number"
        else:
            # By convention, return empty
            # string if no help is available
            return ""
    def _dispatch(self, method, params):
        if method == 'pow':
            return pow(*params)
        elif method == 'add':
            return params[0] + params[1]
        else:
            raise 'bad method'
 
server = SimpleXMLRPCServer(("localhost", 8000))
server.register_introspection_functions()
server.register_instance(Math())
server.serve_forever()
 
4. Subclass SimpleXMLRPCServer:
 
class MathServer(SimpleXMLRPCServer):
    def _dispatch(self, method, params):
        try:
            # We are forcing the 'export_' prefix on methods that are
            # callable through XML-RPC to prevent potential security
            # problems
            func = getattr(self, 'export_' + method)
        except AttributeError:
            raise Exception('method "%s" is not supported' % method)
        else:
            return func(*params)
 
    def export_add(self, x, y):
        return x + y
 
server = MathServer(("localhost", 8000))
server.serve_forever()
'''

from rpc.SimpleJSONRPCServer import SimpleJSONRPCDispatcher
from django.http import HttpResponse

# Create a Dispatcher; this handles the calls and translates info to function maps
#dispatcher = SimpleJSONRPCDispatcher() # Python 2.4
dispatcher = SimpleJSONRPCDispatcher(allow_none=False, encoding=None) # Python 2.5

def rpc_handler(request):
	"""
	the actual handler:
	if you setup your urls.py properly, all calls to the xml-rpc service
	should be routed through here.
	If post data is defined, it assumes it's XML-RPC and tries to process as such
	Empty post assumes you're viewing from a browser and tells you about the service.
	"""

	response = HttpResponse()
	if len(request.POST):
		response.write(dispatcher._marshaled_dispatch(request.raw_post_data))
	else:
		response.write("<b>This is an JSON-RPC Service.</b><br>")
		response.write("You need to invoke it using an JSON-RPC Client!<br>")
		response.write("The following methods are available:<ul>")
		methods = dispatcher.system_listMethods()

		for method in methods:
			# right now, my version of SimpleXMLRPCDispatcher always
			# returns "signatures not supported"... :(
			# but, in an ideal world it will tell users what args are expected
			sig = dispatcher.system_methodSignature(method)

			# this just reads your docblock, so fill it in!
			help =  dispatcher.system_methodHelp(method)

			response.write("<li><b>%s</b>: [%s] %s" % (method, sig, help))

		response.write("</ul>")
		response.write('<a href="http://www.djangoproject.com/"> <img src="http://media.djangoproject.com/img/badges/djangomade124x25_grey.gif" border="0" alt="Made with Django." title="Made with Django."></a>')

	response['Content-length'] = str(len(response.content))
	return response

class MyFuncs:
    def _listMethods(self):
        # this method must be present for system.listMethods
        # to work
        return ['add', 'pow']
    def _methodHelp(self, method):
        # this method must be present for system.methodHelp
        # to work
        if method == 'add':
            return "add(2,3) => 5"
        elif method == 'pow':
            return "pow(x, y[, z]) => number"
        else:
            # By convention, return empty
            # string if no help is available
            return ""
    def _dispatch(self, method, params):
        if method == 'pow':
            return pow(*params)
        elif method == 'add':
            return params[0] + params[1]
        else:
            raise 'bad method'
 
#server = SimpleXMLRPCServer(("localhost", 8000))
dispatcher.register_introspection_functions()
dispatcher.register_instance(MyFuncs())
#dispatcher.serve_forever()