#!/bin/bash

# Este es el script para compilar automáticamente
# mediante el makefile
INOTIFYWAIT="inotifywait"


if ! which $INOTIFYWAIT 1>/dev/null; then
    echo "No encuentro $INOTIFYWAIT"
    echo "Por favor instalelo desde inotifytools".
    exit
fi



