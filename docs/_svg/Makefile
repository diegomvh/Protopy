SVG_FILES = $(shell ls *.svg)
PNG_FILES = $(SVG_FILES:.svg=.png)

all: ${PNG_FILES}
	
clean:
	@ rm ${PNG_FILES}

# Crear el PNG de los archivos SVG	
%.png: %.svg
#	inkscape --file=$< --export-dpi=300 --export-area-drawing --export-png=$@
	inkscape --file=$< --export-dpi=150 --export-area-canvas --export-png=$@ 2>/dev/null || \
	inkscape --file=$< --export-dpi=150 --export-area-page --export-png=$@ 

