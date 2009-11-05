# Creación de gráficos con Django Extensions

TARGETS=../../docs/_svg/modelo_salesman.png  ../../docs/_svg/modelo_offline.png

all: $(TARGETS)

    
../../docs/_svg/modelo_salesman.png: ./apps/core/models.py ./apps/ventas/models.py
	echo "Creacion de modelos de salesman"
	manage.py graph_models -g core ventas -o $@
    
../../docs/_svg/modelo_offline.png: ../offline/models.py
	echo "Creando grafica de modelo"
	manage.py graph_models -g offline contenttypes -o $@
	
clean:
	-rm -f $(TARGETS)