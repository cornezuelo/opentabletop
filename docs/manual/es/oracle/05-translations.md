# Traducciones

Cada pack está escrito en un **idioma base**. Las traducciones son ficheros opcionales que solo sustituyen los textos; lo que falte se muestra en el idioma base.

## Traducir en el formulario

1. En la página del pack, **Añadir idioma** (p. ej. `en`).
2. En la pestaña **Editar** de una definición, elige el idioma: los campos muestran el texto base en gris; escribe la traducción.

Las entradas necesitan id para traducirse. Se pueden traducir nombres, descripciones, resultados, plantillas de generador, cartas de mazo y etiquetas de entrada de los oráculos.

## Los ficheros

Las traducciones están en `locales/<idioma>/` junto al fichero que traducen, por id de definición y de entrada. La página del pack las muestra en **Traducciones**, agrupadas por idioma (sus propios ficheros están en **Ficheros**):

```yaml
# locales/es/oracles.yaml
yes-no:
  name: ¿Sí o no?
  entries:
    yes: Sí
    no: 'No'
  inputs:
    odds:
      label: Probabilidad
      labels: { even: Igualada }
```

La aplicación muestra los textos de los packs en el idioma de la interfaz cuando el pack lo tiene.
