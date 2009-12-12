#
RST2S5=$(shell which rst2s5 || which rst2s5.py)
TARGET=slides.pdf
IMGS=$(shell cat slides.txt | grep png | sed s/\.\.\ figure\:\:\ //g)
DEPS = slides.txt slides.style $(IMGS)
DPI=150
#all: $(TARGET)
#all: rst2pdf
all: $(TARGET)
	

%.png: %.svg
#	inkscape --file=$< --export-dpi=300 --export-area-drawing --export-png=$@
	inkscape --file=$< \
	--export-dpi=$(DPI) \
	--export-area-canvas \
	--export-png=$@ 2>/dev/null || \
	inkscape --file=$< \
	--export-dpi=$(DPI) \
	--export-area-page \
	--export-png=$@

html: index.html

clean_png:
	-rm *.png

index.html: pres.txt
	$(RST2S5) --theme=$(THEME) $^ $@


rst2pdf: slides.pdf

$(TARGET): $(DEPS)
	rst2pdf slides.txt -b1 -s slides.style
	
clean: clean_png
	-rm -r $(TARGET)

re: clean all