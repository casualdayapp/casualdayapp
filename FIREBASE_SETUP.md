# Firebase + GitHub Pages setup

La app ahora es estatica: GitHub Pages sirve `index.html`, `app.js`, `data/` y `assets/`, y el navegador lee/escribe directo en Firebase Firestore usando Firebase Auth.

## 1. Activar Authentication

En Firebase Console:

1. Entrar en `Build > Authentication`.
2. Click en `Get started`.
3. En `Sign-in method`, activar `Email/Password`.
4. En `Users`, crear manualmente el usuario que va a usar la app.

La app no tiene registro publico. Solo muestra login.

## 2. Crear Firestore

En Firebase Console:

1. Entrar en `Build > Firestore Database`.
2. Crear la base en `Production mode`.
3. Elegir la region.

La app guarda todo en:

```text
casualdayInventoryState/main
```

Ese documento contiene:

```text
products      -> productos del inventario
transactions  -> historial de entradas/salidas
priceLists    -> listas/categorias de precio
revision      -> version del snapshot para evitar pisar cambios entre dispositivos
updatedAt     -> fecha del ultimo guardado
```

Si el documento no existe, el primer usuario autorizado que entre crea el documento usando los datos seed de `data/products.js`, `data/transactions.js` y `data/price-lists.js`.

## 3. Publicar reglas de Firestore

`firebase/firestore.rules` ya esta configurado para el usuario:

Ejemplo:

```js
request.auth.token.email in [
  "casualdayapp@gmail.com"
]
```

Luego pegar esas reglas en `Firestore Database > Rules` y publicarlas.

## 4. Autorizar GitHub Pages

Cuando tengas la URL de GitHub Pages:

1. Ir a `Authentication > Settings > Authorized domains`.
2. Agregar el dominio de GitHub Pages, por ejemplo `tuusuario.github.io`.

## 5. Subir a GitHub Pages

Subir estos archivos/carpetas:

```text
index.html
app.js
assets/
data/
FIREBASE_SETUP.md
```

`firebase/firestore.rules` es una referencia para copiar reglas en Firebase Console. No hace falta subirlo a GitHub Pages; si le pusiste tu email real y el repo es publico, mejor no publicarlo.

No subir:

```text
.env
node_modules/
server.js
firebase/firestore.rules con emails privados
firebase-service-account*.json
*-firebase-adminsdk-*.json
```

El archivo de service account ya no se usa en este flujo y nunca debe ir al frontend.
