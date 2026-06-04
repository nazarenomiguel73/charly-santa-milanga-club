# Charly Santa Milanga Club — Menú Digital

Sitio web mobile-first para consultar menú, promociones y contacto desde el código QR en mesas y barra.

**Sitio publicado:** [https://nazarenomiguel73.github.io/charly-santa-milanga-club/](https://nazarenomiguel73.github.io/charly-santa-milanga-club/)

**Perfil GitHub:** [https://github.com/nazarenomiguel73](https://github.com/nazarenomiguel73)

## Publicar en GitHub Pages

1. Creá el repositorio `charly-santa-milanga-club` en tu cuenta [nazarenomiguel73](https://github.com/nazarenomiguel73).
2. Subí este proyecto a la rama `main`.
3. En el repo: **Settings → Pages → Build and deployment → Source: GitHub Actions**.
4. El workflow `.github/workflows/pages.yml` desplegará automáticamente en cada push.

### Código QR

Generá un QR que apunte a:

```text
https://nazarenomiguel73.github.io/charly-santa-milanga-club/
```

## Actualizar menú y datos

- **Productos y promociones:** editá `data/menu.json`
- **Contacto, horarios, WhatsApp:** editá `data/config.json`

No hace falta tocar HTML para cambios de precios o platos.

## Estructura

```text
├── index.html
├── css/main.css
├── js/app.js
├── data/
│   ├── config.json
│   └── menu.json
├── assets/logo.svg
└── .github/workflows/pages.yml
```

## Desarrollo local

```bash
# Con Python
python -m http.server 8080

# O con npx
npx serve .
```

Abrí `http://localhost:8080` (los JSON requieren servidor HTTP, no `file://`).

## Licencia

Proyecto privado del local. Todos los derechos reservados.
