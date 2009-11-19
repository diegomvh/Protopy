# coding: utf-8
'''
Modelo de prueba
'''
from django.db import models

# Some useful things
mod_name = __name__.split('.')[-2]
abs_url = lambda inst: '/%s' % '/'.join( [mod_name, inst._meta.module_name, str(inst.id)])

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
    razon_social = models.CharField(max_length = 50)
    direccion = models.TextField()
    ciudad = models.ForeignKey(Ciudad)
    correo = models.EmailField()
    
    get_absolute_url = abs_url
    
    def __unicode__(self):
        return u'%s, %s' % (self.razon_social, self.ciudad)
    
class Proveedor(models.Model):
    razon_social = models.CharField(max_length = 50)
    direccion = models.CharField(max_length = 200)
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
    #imagen = models.ImageField(upload_to='productos', null = True, blank = True)
    descripcion = models.TextField()
    categoria = models.ForeignKey(Categoria)
    precio_uniatario = models.DecimalField(default = 0.0, max_digits = 10, decimal_places = 3)
    
    get_absolute_url = abs_url
    
    def __unicode__(self):
        return self.nombre
