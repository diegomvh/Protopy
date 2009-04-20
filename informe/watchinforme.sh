#! /bin/bash

NOMBRE=informe.tex

while  inotifywait -e modify $NOMBRE ; do
    yes R | pdflatex $NOMBRE 
done
