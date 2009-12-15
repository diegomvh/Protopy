# coding: utf-8
'''
Modelo de prueba
'''
from django.db import models
from django.contrib.auth.models import User

# Some useful things
mod_name = __name__.split('.')[-2]
abs_url = lambda inst: '/%s' % '/'.join( [inst._meta.module_name, str(inst.pk)])

class Provincia(models.Model):
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

class Cliente(models.Model):
    cuit = models.PositiveIntegerField(primary_key = True)
    razon_social = models.CharField(max_length = 50)
    direccion = models.CharField(max_length = 200)
    correo = models.EmailField(null= True, blank = True)
    ciudad = models.ForeignKey(Ciudad)
    
    get_absolute_url = abs_url
    
    def __unicode__(self):
        return u'%s, %s' % (self.cuit, self.razon_social)
    
class Proveedor(models.Model):
    cuit = models.PositiveIntegerField(primary_key = True)
    razon_social = models.CharField(max_length = 50)
    direccion = models.CharField(max_length = 200)
    ciudad = models.ForeignKey(Ciudad)
    correo = models.EmailField()
    
    get_absolute_url = abs_url
    
    class Meta:
        verbose_name_plural = "Proveedores"
        
    def __unicode__(self):
        return self.razon_social

class Categoria(models.Model):
    nombre = models.CharField(max_length = 50, unique = True)
    super = models.ForeignKey('self', null = True, blank = True)
    
    get_absolute_url = abs_url
    
    class Meta:
        verbose_name = "Categoria"
        verbose_name_plural = "Categorias"

    def __unicode__(self):
        return self.super and "%s - %s " % (unicode(self.super), self.nombre) or self.nombre
    
class Producto(models.Model):
    nombre = models.CharField(max_length = 50)
    imagen = models.ImageField(upload_to='productos', null = True, blank = True)
    descripcion = models.TextField()
    categoria = models.ForeignKey(Categoria)
    precio = models.DecimalField(default = 0.0, max_digits = 10, decimal_places = 3)
    
    get_absolute_url = abs_url
    
    def __unicode__(self):
        return self.nombre

class UserProfile(models.Model):
    user = models.ForeignKey(User, unique=True)
    cliente = models.ForeignKey(Cliente)
    