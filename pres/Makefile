RST2S5=rst2s5
TARGET=presentacion.html
all: $(TARGET) 


presentacion.html: presentacion.txt
	$(RST2S5) --theme=small-black $^ $@

clean:
	-rm -r $(TARGET) ui
