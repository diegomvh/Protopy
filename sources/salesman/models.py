'''
Modelo de prueba
'''
from django.db import models

class Ciudad(models.Model):
    nombre = models.CharField(max_length = 50)
    cp = models.CharField(max_length = 40)

class Vendedor(models.Model):
    nombre = models.CharField(max_length = 50)
    apellido = models.CharField(max_length = 50)
    ciudades_asignadas = models.ManyToManyField(Ciudad)


class Cliente(models.Model):
    '''
    El cliente
    '''
    razon_social = models.CharField(max_length = 50)
    ciudad = models.ForeignKey(Ciudad)
    correo = models.EmailField()

class Proveedor(models.Model):
    '''
    El proveedor
    '''
    razon_social = models.CharField(max_length = 50)
    direccion = models.CharField(max_length = 200)
    correo = models.EmailField()

class Categoria(models.Model):
    '''
    Cada producto tiene una categoria
    '''
    nombre = models.CharField(max_length = 50)
    
    
class Producto(models.Model):
    '''
    Un producto es provisto por un proveedor o mas de un proveedor
    '''
    nombre = models.CharField(max_length = 50)
    descripcion = models.CharField(max_length = 500)
    categoria = models.ForeignKey(Categoria, blank = True)
    provisto_por = models.ManyToManyField(Proveedor)
    precio_uniatario = models.DecimalField(default = 0.0)
    
class Pedido(models.CharField):
    cliente = models.ForeignKey(Cliente)
    numero = models.PositiveIntegerField()
    fecha = models.DateField()
    
class ItemPedido(models.CharField):
    cantidad = models.PositiveIntegerField()
    producto = models.ForeignKey(Producto)
    precio = models.DecimalField()
    
    
    


    