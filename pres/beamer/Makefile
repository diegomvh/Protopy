SVGS=$(shell ls *.svg)
PDF_FROM_SVG=$(SVGS:.svg=.pdf)

all: imagenes pres.pdf 
	

show_svgs:
	@echo ${PDF_FROM_SVG}

imagenes: ${PDF_FROM_SVG}

%.pdf: %.tex
	pdflatex $^

%.pdf: %.svg
	inkscape --file=$< -C --export-pdf=$@

clean:
	-rm -rf *.pdf *.snm *.toc *.nav *.aux *.out

re: clean all