# Estas son las ilustraciones de Inkscape
SVG_FILES = $(shell ls *.svg)
SVG2PNG_FILES = $(SVG_FILES:.svg=.png)
# Estos son los gráficos de modelos de Django
DOT_FILES = $(shell ls *.dot)
DOT2PNG_FILES = $(DOT_FILES:.dot=.png)


all: ${SVG2PNG_FILES}
	
clean:
	@ rm ${SVG2PNG_FILES}

# Crear el PNG de los archivos SVG	
%.png: %.svg
#	inkscape --file=$< --export-dpi=300 --export-area-drawing --export-png=$@
	inkscape --file=$< \
	--export-dpi=150 \
	--export-area-canvas \
	--export-png=$@ 2>/dev/null || \
inkscape --file=$< \
	--export-dpi=150 \
	--export-area-page \
	--export-png=$@ 

