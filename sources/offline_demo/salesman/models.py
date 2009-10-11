# coding: utf-8
'''
Modelo de prueba
'''
from django.db import models
from django.db.models import signals





# Some useful things
   
mod_name = __name__.split('.')[-2]
abs_url = lambda inst: '/%s' % '/'.join( [mod_name, inst._meta.module_name, str(inst.id)])


class Pais(models.Model):
    nombre = models.CharField(max_length = 45)
    simbolo_moneda = models.CharField(max_length = 8, default = '$')
    
    def __unicode__(self):
        return self.nombre
    
    class Meta:
        verbose_name = u"País"
        verbose_name_plural = u"Paises"
    
    get_absolute_url = abs_url

class Provincia(models.Model):
    pais = models.ForeignKey(Pais)
    nombre = models.CharField(max_length = 140)
    
    def __unicode__(self):
        return self.nombre
    
    get_absolute_url = abs_url

class Ciudad(models.Model):
    nombre = models.CharField(max_length = 50)
    cp = models.CharField(max_length = 40)
    provincia = models.ForeignKey(Provincia)
    
    class Meta:
        verbose_name_plural = "Ciudades"

    def __unicode__(self):
        return self.nombre
    
    get_absolute_url = abs_url

        
class Vendedor(models.Model):
    nombre = models.CharField(max_length = 50)
    apellido = models.CharField(max_length = 50)
    ciudades_asignadas = models.ManyToManyField(Ciudad)
    
    get_absolute_url = abs_url
    
    class Meta:
        verbose_name_plural = "Vendedores"
    def __unicode__(self):
        return u','.join((self.nombre, self.apellido))
        
class Cliente(models.Model):
    '''
    El cliente
    '''
    razon_social = models.CharField(max_length = 50)
    ciudad = models.ForeignKey(Ciudad)
    correo = models.EmailField()
    
    get_absolute_url = abs_url
    
    def __unicode__(self):
        return u'%s, %s' % (self.razon_social, self.ciudad)
    
class Proveedor(models.Model):
    '''
    El proveedor
    '''
    razon_social = models.CharField(max_length = 50)
    direccion = models.CharField(max_length = 200)
    correo = models.EmailField()
    
    get_absolute_url = abs_url
    
    class Meta:
        verbose_name_plural = "Proveedores"
        
    def __unicode__(self):
        return self.razon_social

class Categoria(models.Model):
    '''
    Cada producto tiene una categoria
    '''
    nombre = models.CharField(max_length = 50)
    
    get_absolute_url = abs_url
    
    class Meta:
        verbose_name = "Categoría"
        verbose_name_plural = "Categorías"

    def __unicode__(self):
        return self.nombre
    
    
class Producto(models.Model):
    '''
    Un producto es provisto por un proveedor o mas de un proveedor
    '''
    nombre = models.CharField(max_length = 50)
    descripcion = models.CharField(max_length = 500)
    categoria = models.ForeignKey(Categoria, blank = True, null = True) # Puede no tener categorias
    provisto_por = models.ManyToManyField(Proveedor, blank = True, null = True)
    precio_uniatario = models.DecimalField(default = 0.0, max_digits = 5, decimal_places = 3)
    
    get_absolute_url = abs_url
    
    def __unicode__(self):
        return self.nombre
        
class Pedido(models.Model):
    cliente = models.ForeignKey(Cliente)
    numero = models.PositiveIntegerField()
    fecha = models.DateField()

    get_absolute_url = abs_url
    
    def __unicode__(self):
        return u"%s %s" % (self.numero, self.cliente)
        
class ItemPedido(models.Model):
    cantidad = models.PositiveIntegerField()
    producto = models.ForeignKey(Producto)
    #precio = models.DecimalField(default = 0.0, max_digits = 5, decimal_places = 3)
    pedido = models.ForeignKey(Pedido)

    get_absolute_url = abs_url
    
    class Meta:
        verbose_name_plural = 'Items de Pedido'
    
        


#signals.post_syncdb.connect(receiver, sender, weak, dispatch_uid)
