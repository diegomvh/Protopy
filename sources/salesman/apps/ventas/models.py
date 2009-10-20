# coding: utf-8
'''
Modelo de prueba
'''
from django.db import models
from salesman.apps.core.models import abs_url, Cliente, Producto 
        
class Pedido(models.Model):
    '''
    El número de pedido se toma de la primary key
    '''
    cliente = models.ForeignKey(Cliente)
    fecha = models.DateField(auto_now = True)

    get_absolute_url = abs_url
    
    def __unicode__(self):
        return u"%s %s" % (self.pk, self.cliente)
        
class ItemPedido(models.Model):
    producto = models.ForeignKey(Producto)
    cantidad = models.PositiveIntegerField()
    precio = models.DecimalField(default = "0.0", max_digits = 10, decimal_places = 3, editable = False)
    pedido = models.ForeignKey(Pedido)

    get_absolute_url = abs_url
    
    def save(self, *largs, **kwargs):
        self.precio = self.producto.precio_uniatario
        return  super(ItemPedido, self).save(*largs, **kwargs)
    
    class Meta:
        verbose_name_plural = 'Items de Pedido'
