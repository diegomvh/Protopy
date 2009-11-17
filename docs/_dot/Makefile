# Creación de PNGs medinte GraphViz

DOTS=$(shell ls *.dot)
GENERATED_DOTS=django_models.dot offline_models.dot
DOT_FILES=$(DOTS) $(GENERATED_DOTS)
PNG_FILES=$(DOT_FILES:.dot=.png)
PDF_FILES=$(DOT_FILES:.dot=.pdf)
DOT = dot
GRAPHVIZ_PNG_OPTS = -Tpng -Gdpi=300
# Paths
SALESMAN_SOURCE=../../sources/salesman
OFFLINE_SOURCE=$(SALESMAN_SOURCE)/../offline

all: dots pngs pdfs

pdfs: $(PDF_FILES)

pngs: $(PNG_FILES)
	
dots: $(GENERATED_DOTS)
	
%.png: %.dot
	$(DOT) -Tpng -Gdpi=150 -o $@ $^
	@ file $@
	@ ./reframe.py $@

%.pdf: %.dot
	$(DOT) -Tpdf $(GRAPHVIZ_PDF_OPTS) -o $@ $^
		
clean:
	-rm -rf $(PNG_FILES) $(GENERATED_DOTS)
	
	
re: clean all

django_models.dot: $(SALESMAN_SOURCE)/apps/core/models.py $(SALESMAN_SOURCE)/apps/ventas/models.py
	# -file $(SALESMAN_SOURCE)
	
	$(SALESMAN_SOURCE)/manage.py graph_models ventas core > $@
	
offline_models.dot: $(OFFLINE_SOURCE)/models.py
	
	$(SALESMAN_SOURCE)/manage.py graph_models offline > $@