from offline.sites import RemoteSite
from offline.remotes import RemoteModelProxy
from salesman.apps.core.models import Ciudad, Cliente, Categoria, Producto, Proveedor
from salesman.apps.ventas.models import Pedido, ItemPedido
    
def current_user():
    from offline.middleware import threadlocals
    return threadlocals.get_current_user()
        
class RemotePedido(RemoteModelProxy):

    class Meta:
        model = Pedido
        manager = Pedido.objects.filter(vendedor = current_user())
        exclude = ['vendedor']
        
    def save(self, deserialized_object):
        ''' Asignar el vendedor como el usuario logueado '''
        deserialized_object.object.vendedor = current_user()
        obj =  RemoteModelProxy.save(self, deserialized_object)
        return obj.object
    
    
agentes_site = RemoteSite("agentes")
agentes_site.register(Ciudad)
agentes_site.register(Cliente)
agentes_site.register(Categoria)
agentes_site.register(Producto)
agentes_site.register(Proveedor)
agentes_site.register(RemotePedido)
agentes_site.register(ItemPedido)