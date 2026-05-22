
## 🛠️ Tecnologías utilizadas

- **HTML5 semántico** + **CSS3** (Flexbox, Grid, variables CSS, animaciones)
- **JavaScript ES6+** (Fetch API, async/await, módulos implícitos)
- **DummyJSON API** (endpoints REST simulados pero reales)
- **LocalStorage** para persistencia de productos y listas

## ⚙️ Instalación y uso

1. **Clona o descarga** los cuatro archivos en una misma carpeta.
2. **Asegúrate de usar un servidor local** (Live Server de VS Code, `http-server`, etc.) para evitar problemas de CORS (aunque DummyJSON permite peticiones desde `file://`, se recomienda servidor local).
3. **Abre `index.html`** en tu navegador.
4. Interactúa con la aplicación:
   - Los productos se cargan inicialmente desde la API y se guardan en LocalStorage.
   - Usa el botón **"Nuevo producto"** para agregar (POST a DummyJSON + ID local único).
   - Edita o elimina productos desde las tarjetas.
   - Haz clic en el botón **"+"** de una tarjeta para añadir el producto a una lista existente o crear una nueva lista.
   - Gestiona tus listas en la sección inferior: crea listas vacías, añade el producto actual, elimina productos de una lista o elimina la lista completa.
   - Filtra por categoría o busca por texto.
   - Recarga la página y verás los cambios persistentes (productos y listas).
   - Presiona **"Reiniciar desde API"** para volver a los datos originales de productos (las listas se mantienen, pero los productos añadidos localmente se pierden).

## 🔍 Demostración de requisitos académicos

| Requisito | Dónde se evidencia |
|-----------|---------------------|
| `let` / `const` | Todo el código, sin `var`. |
| Objetos, Arrays, Sets, Maps | `productsMap` (Map), `categoriesSet` (Set), `userLists` (Map con Sets internos), arrays en filtros. |
| `for...in` | Función `demonstrateObjectMethods()` recorre propiedades del producto. |
| `for...of` | Recorre el Set de categorías y las listas. |
| `forEach` | En `renderProducts()`, `demonstrateObjectMethods()`, y al iterar sobre listas. |
| `Object.keys/values/entries` | Dentro de `demonstrateObjectMethods()` con salida en consola. |
| Validaciones | `validateProduct()` antes de cada guardado. |
| Fetch API + Async/Await | Todas las funciones CRUD (`fetchProductsFromAPI`, `addProduct`, `updateProduct`, `deleteProduct`). |
| LocalStorage | `saveToLocalStorage()`, `loadFromLocalStorage()`, `saveListsToLocalStorage()`, `loadListsFromLocalStorage()`. |
| DOM dinámico | `createProductCard()` y `renderLists()` usan `createElement/appendChild`. |

## 📌 Notas importantes

- Los endpoints de DummyJSON **no persisten** los cambios en su servidor, pero la aplicación simula correctamente el flujo y mantiene el estado en memoria + LocalStorage.
- Los productos creados localmente reciben un ID único (timestamp + random) para evitar colisiones con los IDs numéricos de la API.
- Las listas almacenan solo los IDs de los productos. Si un producto se elimina del catálogo principal, desaparece automáticamente de todas las listas.
- El proyecto cumple con **arquitectura limpia**: separación de responsabilidades (validaciones, persistencia, renderizado, API, gestión de listas).
- **npx json-server --watch db.json --port 3000** para iniciar el sevidor
