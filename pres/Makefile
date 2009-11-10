RST2S5=$(shell which rst2s5 || which rst2s5.py)
TARGET=index.html
all: $(TARGET) 


index.html: presentacion.txt
	$(RST2S5) --theme=small-black $^ $@

clean:
	-rm -r $(TARGET) ui
