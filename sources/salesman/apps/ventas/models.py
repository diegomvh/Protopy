# coding: utf-8
'''
Modelo de prueba
'''
from django.db import models
from django.contrib.auth.models import User
from salesman.apps.core.models import abs_url, Cliente, Producto 
        
class Pedido(models.Model):
    '''
    El numero de pedido se toma de la primary key
    '''
    cliente = models.ForeignKey(Cliente)
    fecha = models.DateField(auto_now = True)

    get_absolute_url = abs_url
    
    def __unicode__(self):
        return u"%s %s" % (self.pk, self.cliente)
        
    def agregar_producto(self, producto, cantidad = 1):
        assert(isinstance(producto, Producto), '%s no es un producto' % producto)
        item = ItemPedido()
        item.producto = producto
        item.cantidad = cantidad
        item.precio = producto.precio * cantidad
        self.itempedido_set.add(item)
        
class ItemPedido(models.Model):
    producto = models.ForeignKey(Producto)
    cantidad = models.PositiveIntegerField()
    precio = models.DecimalField(default = "0.0", max_digits = 10, decimal_places = 3, editable = False)
    pedido = models.ForeignKey(Pedido)

    get_absolute_url = abs_url
    
    class Meta:
        verbose_name_plural = 'Items de Pedido'
