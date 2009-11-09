# Creación de gráficos con Django Extensions

TARGETS=../../docs/_svg/modelo_salesman.png  ../../docs/_svg/modelo_offline.png
DOTS=$(TARGETS:.png=.dot)
GRAPHVIZ=dot
GRAPHVIZ_PARAM=-Gdpi=150 -Tpng

all: $(TARGETS)
	echo "Construi el" $(TARGETS)
    
../../docs/_svg/modelo_salesman.dot: ./apps/core/models.py ./apps/ventas/models.py
	manage.py graph_models -g core ventas $(GRAPHIZ_PARAM) -o $@
    
../../docs/_svg/modelo_offline.dot: ../offline/models.py
	manage.py graph_models -g offline contenttypes $(GRAPHIZ_PARAM) -o $@

../../docs/_svg/modelo_offline.png: ../../docs/_svg/modelo_offline.dot
	$(GRAPHVIZ) $(GRAPHVIZ_PARAM) -o $@ $^

../../docs/_svg/modelo_salesman.png: ../../docs/_svg/modelo_salesman.dot	
	$(GRAPHVIZ) $(GRAPHVIZ_PARAM) -o $@ $^
		
	
clean:
	-rm -f $(TARGETS) $(DOTS)
