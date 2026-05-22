
// VARIABLES GLOBALES


let productsMap = new Map();        // id -> producto
let categoriesSet = new Set();
let userLists = new Map();          // nombreLista -> { productos: Set<id> }
let currentFilter = "all";
let searchTerm = "";
let currentProductForList = null;   // producto que se quiere añadir a lista

// Elementos DOM
const productsContainer = document.getElementById("productsContainer");
const searchInput = document.getElementById("searchInput");
const categoryFilter = document.getElementById("categoryFilter");
const addProductBtn = document.getElementById("addProductBtn");
const resetApiBtn = document.getElementById("resetApiBtn");
const modalOverlay = document.getElementById("modalOverlay");
const productForm = document.getElementById("productForm");
const modalTitle = document.getElementById("modalTitle");
const closeModalBtn = document.getElementById("closeModalBtn");
const cancelModalBtn = document.getElementById("cancelModalBtn");
const totalProductsSpan = document.getElementById("totalProducts");
const avgPriceSpan = document.getElementById("avgPrice");
const totalStockSpan = document.getElementById("totalStock");
const loadingSpinner = document.getElementById("loadingSpinner");
// Nuevos elementos de listas
const listModalOverlay = document.getElementById("listModalOverlay");
const closeListModalBtn = document.getElementById("closeListModalBtn");
const listModalContent = document.getElementById("listModalContent");
const listsContainer = document.getElementById("listsContainer");
const createEmptyListBtn = document.getElementById("createEmptyListBtn");


// FUNCIÓN GLOBAL escapeHtml (para evitar inyección XSS)

function escapeHtml(str) {
    if (!str) return "";
    return str.replace(/[&<>]/g, function(m) {
        if (m === "&") return "&amp;";
        if (m === "<") return "&lt;";
        if (m === ">") return "&gt;";
        return m;
    });
}


// HELPER: ID ÚNICO LOCAL

function generateUniqueId() {
    return Date.now() + '-' + Math.random().toString(36).substr(2, 6);
}

function isApiId(id) {
    return typeof id === 'number' || /^\d+$/.test(id);
}


// TOAST Y LOADING

function showToast(message, type = "success") {
    const toastContainer = document.getElementById("toastContainer");
    if (!toastContainer) return;
    const toast = document.createElement("div");
    toast.className = `toast ${type}`;
    toast.innerHTML = `<i class="fas ${type === 'success' ? 'fa-check-circle' : type === 'error' ? 'fa-exclamation-circle' : 'fa-info-circle'}"></i> ${message}`;
    toastContainer.appendChild(toast);
    setTimeout(() => {
        toast.remove();
    }, 3000);
}

function setLoading(isLoading) {
    if (!loadingSpinner) return;
    if (isLoading) {
        loadingSpinner.classList.remove("hidden");
        if (productsContainer) {
            productsContainer.innerHTML = "";
            productsContainer.appendChild(loadingSpinner);
        }
    } else {
        loadingSpinner.classList.add("hidden");
    }
}


// VALIDACIONES

function validateProduct(product) {
    const errors = [];
    if (!product.title || product.title.trim() === "") errors.push("El título es obligatorio.");
    if (!product.category || product.category.trim() === "") errors.push("La categoría es obligatoria.");
    if (product.price === undefined || isNaN(product.price) || product.price < 0) errors.push("El precio debe ser un número positivo.");
    if (product.stock === undefined || isNaN(product.stock) || product.stock < 0 || !Number.isInteger(Number(product.stock))) errors.push("El stock debe ser un número entero positivo.");
    return { isValid: errors.length === 0, errors };
}


// CATEGORÍAS

function updateCategoriesSet() {
    categoriesSet.clear();
    for (const product of productsMap.values()) {
        if (product.category && product.category.trim() !== "") {
            categoriesSet.add(product.category.trim());
        }
    }
    renderCategoryFilter();
}

function renderCategoryFilter() {
    if (!categoryFilter) return;
    const currentValue = categoryFilter.value;
    categoryFilter.innerHTML = '<option value="all">Todas las categorías</option>';
    for (const cat of categoriesSet) {
        const option = document.createElement("option");
        option.value = cat;
        option.textContent = cat;
        categoryFilter.appendChild(option);
    }
    categoryFilter.value = currentValue;
}


// LOCALSTORAGE (productos y listas)

const STORAGE_KEY = "products_app_data";
const LISTS_STORAGE_KEY = "user_lists";

function saveToLocalStorage() {
    const productsArray = Array.from(productsMap.values());
    localStorage.setItem(STORAGE_KEY, JSON.stringify(productsArray));
}

function loadFromLocalStorage() {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
        const productsArray = JSON.parse(stored);
        productsMap.clear();
        productsArray.forEach(product => {
            productsMap.set(product.id, product);
        });
        updateCategoriesSet();
        return true;
    }
    return false;
}

function saveListsToLocalStorage() {
    const listsObj = {};
    for (let [name, data] of userLists.entries()) {
        listsObj[name] = { productos: Array.from(data.productos) };
    }
    localStorage.setItem(LISTS_STORAGE_KEY, JSON.stringify(listsObj));
}

function loadListsFromLocalStorage() {
    const stored = localStorage.getItem(LISTS_STORAGE_KEY);
    if (stored) {
        const listsObj = JSON.parse(stored);
        userLists.clear();
        for (let [name, data] of Object.entries(listsObj)) {
            userLists.set(name, { productos: new Set(data.productos) });
        }
        renderLists();
    } else {
        // Listas de ejemplo si no hay nada
        if (userLists.size === 0) {
            userLists.set("Favoritos", { productos: new Set() });
            userLists.set("Por comprar", { productos: new Set() });
            saveListsToLocalStorage();
            renderLists();
        }
    }
}


// ESTADÍSTICAS

function updateStats() {
    const productsArray = Array.from(productsMap.values());
    const total = productsArray.length;
    const totalStock = productsArray.reduce((acc, p) => acc + p.stock, 0);
    const avgPrice = total > 0 ? (productsArray.reduce((acc, p) => acc + p.price, 0) / total).toFixed(2) : 0;
    if (totalProductsSpan) totalProductsSpan.textContent = total;
    if (totalStockSpan) totalStockSpan.textContent = totalStock;
    if (avgPriceSpan) avgPriceSpan.textContent = avgPrice;
}


// RENDERIZADO DE PRODUCTOS

function getFilteredProducts() {
    let filtered = Array.from(productsMap.values());
    if (currentFilter !== "all") {
        filtered = filtered.filter(p => p.category === currentFilter);
    }
    if (searchTerm.trim() !== "") {
        const term = searchTerm.trim().toLowerCase();
        filtered = filtered.filter(p => 
            p.title.toLowerCase().includes(term) || 
            (p.description && p.description.toLowerCase().includes(term))
        );
    }
    return filtered;
}

function createProductCard(product) {
    const card = document.createElement("div");
    card.className = "product-card";
    card.dataset.id = product.id;
    const titleDiv = document.createElement("div");
    titleDiv.className = "product-title";
    titleDiv.innerHTML = `<span>${escapeHtml(product.title)}</span><span class="product-category">${escapeHtml(product.category)}</span>`;
    const desc = document.createElement("div");
    desc.className = "product-description";
    desc.textContent = product.description || "Sin descripción";
    const footer = document.createElement("div");
    footer.className = "product-footer";
    footer.innerHTML = `
        <div class="price-stock">
            <span class="price"><i class="fas fa-euro-sign"></i> ${product.price.toFixed(2)}</span>
            <span class="stock"><i class="fas fa-box"></i> ${product.stock}</span>
        </div>
        <div class="card-actions">
            <button class="add-to-list-btn" data-id="${product.id}" title="Añadir a lista"><i class="fas fa-plus-circle"></i></button>
            <button class="edit-btn" data-id="${product.id}" title="Editar"><i class="fas fa-edit"></i></button>
            <button class="delete-btn" data-id="${product.id}" title="Eliminar"><i class="fas fa-trash-alt"></i></button>
        </div>
    `;
    card.appendChild(titleDiv);
    card.appendChild(desc);
    card.appendChild(footer);
    
    const addToListBtn = footer.querySelector(".add-to-list-btn");
    const editBtn = footer.querySelector(".edit-btn");
    const deleteBtn = footer.querySelector(".delete-btn");
    
    addToListBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        openListModal(product);
    });
    editBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        openEditModal(product.id);
    });
    deleteBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        if (confirm("¿Estás seguro de eliminar este producto?")) {
            deleteProduct(product.id);
        }
    });
    return card;
}

function renderProducts() {
    if (!productsContainer) return;
    const filteredProducts = getFilteredProducts();
    while (productsContainer.firstChild) {
        productsContainer.removeChild(productsContainer.firstChild);
    }
    if (filteredProducts.length === 0) {
        const emptyMsg = document.createElement("div");
        emptyMsg.className = "glass-card";
        emptyMsg.style.padding = "40px";
        emptyMsg.style.textAlign = "center";
        emptyMsg.style.gridColumn = "1 / -1";
        emptyMsg.innerHTML = "<i class='fas fa-box-open'></i> No se encontraron productos.";
        productsContainer.appendChild(emptyMsg);
    } else {
        filteredProducts.forEach(product => {
            const card = createProductCard(product);
            productsContainer.appendChild(card);
        });
    }
    updateStats();
    demonstrateObjectMethods();
}


// DEMOSTRACIÓN DE MÉTODOS DE OBJETOS E ITERACIONES

function demonstrateObjectMethods() {
    if (productsMap.size === 0) return;
    const firstProduct = productsMap.values().next().value;
    console.group("📌 Object.keys() - Propiedades del primer producto");
    console.log(Object.keys(firstProduct));
    console.groupEnd();
    console.group("📌 Object.values() - Valores del primer producto");
    console.log(Object.values(firstProduct));
    console.groupEnd();
    console.group("📌 Object.entries() - Pares del primer producto");
    console.log(Object.entries(firstProduct));
    console.groupEnd();
    console.group("🔄 for...in - Propiedades del producto");
    for (let prop in firstProduct) {
        console.log(`${prop}: ${firstProduct[prop]}`);
    }
    console.groupEnd();
    console.group("🏷️ for...of - Categorías únicas");
    for (let cat of categoriesSet) {
        console.log(`Categoría: ${cat}`);
    }
    console.groupEnd();
    console.group("📊 forEach - Iterando productos (solo títulos)");
    Array.from(productsMap.values()).forEach(p => console.log(p.title));
    console.groupEnd();
}


// CRUD CON API Y SINCRONIZACIÓN DE LISTAS

const API_BASE = "https://dummyjson.com/products";

async function fetchProductsFromAPI() {
    setLoading(true);
    try {
        const response = await fetch(API_BASE);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const data = await response.json();
        productsMap.clear();
        data.products.forEach(product => {
            const normalized = {
                id: product.id,
                title: product.title,
                description: product.description || "",
                price: product.price,
                category: product.category,
                stock: product.stock
            };
            productsMap.set(normalized.id, normalized);
        });
        updateCategoriesSet();
        saveToLocalStorage();
        renderProducts();
        showToast("Productos cargados desde DummyJSON", "success");
    } catch (error) {
        console.error("Error fetching products:", error);
        showToast("Error al cargar productos desde la API", "error");
    } finally {
        setLoading(false);
    }
}

async function addProduct(productData, localId) {
    setLoading(true);
    try {
        const newProduct = {
            id: localId,
            title: productData.title,
            description: productData.description || "",
            price: productData.price,
            category: productData.category,
            stock: productData.stock
        };
        productsMap.set(localId, newProduct);
        updateCategoriesSet();
        saveToLocalStorage();
        renderProducts();
        // Llamada a la API (simulada)
        const response = await fetch(`${API_BASE}/add`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(productData)
        });
        if (!response.ok) throw new Error("Error al simular POST en API");
        showToast(`Producto "${newProduct.title}" agregado correctamente`, "success");
    } catch (error) {
        console.error(error);
        productsMap.delete(localId);
        updateCategoriesSet();
        saveToLocalStorage();
        renderProducts();
        showToast("Error al agregar producto", "error");
    } finally {
        setLoading(false);
    }
}

async function updateProduct(id, updatedData) {
    setLoading(true);
    try {
        const isFromApi = isApiId(id);
        if (isFromApi) {
            const response = await fetch(`${API_BASE}/${id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(updatedData)
            });
            if (!response.ok) throw new Error("Error al actualizar producto en API");
            const updatedProduct = await response.json();
            const normalized = {
                id: updatedProduct.id,
                title: updatedProduct.title,
                description: updatedProduct.description || "",
                price: updatedProduct.price,
                category: updatedProduct.category,
                stock: updatedProduct.stock
            };
            productsMap.set(normalized.id, normalized);
            showToast(`Producto "${normalized.title}" actualizado en API`, "success");
        } else {
            const existingProduct = productsMap.get(id);
            if (!existingProduct) throw new Error("Producto no encontrado");
            const updatedProduct = {
                ...existingProduct,
                title: updatedData.title,
                description: updatedData.description || "",
                price: updatedData.price,
                category: updatedData.category,
                stock: updatedData.stock
            };
            productsMap.set(id, updatedProduct);
            showToast(`Producto local "${updatedProduct.title}" actualizado`, "success");
        }
        updateCategoriesSet();
        saveToLocalStorage();
        renderProducts();
    } catch (error) {
        console.error(error);
        showToast("Error al actualizar producto: " + error.message, "error");
    } finally {
        setLoading(false);
    }
}

async function deleteProduct(id) {
    const productToDelete = productsMap.get(id);
    if (!productToDelete) return;
    setLoading(true);
    try {
        const isFromApi = isApiId(id);
        if (isFromApi) {
            const response = await fetch(`${API_BASE}/${id}`, { method: "DELETE" });
            if (!response.ok) throw new Error("Error al eliminar producto en API");
            await response.json();
        }
        productsMap.delete(id);
        // Eliminar de todas las listas
        for (let [listName, { productos }] of userLists.entries()) {
            if (productos.has(id)) {
                productos.delete(id);
                userLists.set(listName, { productos });
            }
        }
        updateCategoriesSet();
        saveToLocalStorage();
        saveListsToLocalStorage();
        renderProducts();
        renderLists();
        showToast(`Producto "${productToDelete.title}" eliminado`, "success");
    } catch (error) {
        console.error(error);
        showToast("Error al eliminar producto", "error");
    } finally {
        setLoading(false);
    }
}


// FUNCIONES DE LISTAS

function addProductToList(listName, productId) {
    const list = userLists.get(listName);
    if (list) {
        list.productos.add(productId);
        userLists.set(listName, list);
        saveListsToLocalStorage();
        renderLists();
    }
}

function removeProductFromList(listName, productId) {
    const list = userLists.get(listName);
    if (list && list.productos.has(productId)) {
        list.productos.delete(productId);
        userLists.set(listName, list);
        saveListsToLocalStorage();
        renderLists();
        showToast("Producto removido de la lista", "success");
    }
}

function deleteList(listName) {
    if (confirm(`¿Eliminar la lista "${listName}"?`)) {
        userLists.delete(listName);
        saveListsToLocalStorage();
        renderLists();
        showToast(`Lista "${listName}" eliminada`, "success");
    }
}

function createNewList(listName) {
    if (!listName || listName.trim() === "") {
        showToast("El nombre de la lista no puede estar vacío", "error");
        return false;
    }
    if (userLists.has(listName)) {
        showToast("Ya existe una lista con ese nombre", "error");
        return false;
    }
    userLists.set(listName, { productos: new Set() });
    saveListsToLocalStorage();
    renderLists();
    showToast(`Lista "${listName}" creada`, "success");
    return true;
}

function renderLists() {
    if (!listsContainer) return;
    listsContainer.innerHTML = "";
    if (userLists.size === 0) {
        listsContainer.innerHTML = '<div class="empty-message">No hay listas. Crea una nueva.</div>';
        return;
    }
    for (let [listName, { productos }] of userLists.entries()) {
        const listCard = document.createElement("div");
        listCard.className = "list-card";
        const titleDiv = document.createElement("div");
        titleDiv.className = "list-title";
        titleDiv.innerHTML = `<span><i class="fas fa-tag"></i> ${escapeHtml(listName)}</span>
                              <button class="delete-list-btn" data-list="${escapeHtml(listName)}"><i class="fas fa-trash-alt"></i></button>`;
        const productsDiv = document.createElement("div");
        productsDiv.className = "list-products";
        if (productos.size === 0) {
            productsDiv.innerHTML = '<div class="list-product-item" style="opacity:0.6;">Vacía</div>';
        } else {
            for (let productId of productos) {
                const product = productsMap.get(productId);
                if (!product) {
                    productos.delete(productId);
                    saveListsToLocalStorage();
                    continue;
                }
                const itemDiv = document.createElement("div");
                itemDiv.className = "list-product-item";
                itemDiv.innerHTML = `
                    <span>${escapeHtml(product.title)}</span>
                    <button class="remove-from-list" data-list="${escapeHtml(listName)}" data-product-id="${productId}"><i class="fas fa-times-circle"></i></button>
                `;
                productsDiv.appendChild(itemDiv);
            }
        }
        const actionsDiv = document.createElement("div");
        actionsDiv.className = "list-actions";
        actionsDiv.innerHTML = `<button class="add-current-to-list" data-list="${escapeHtml(listName)}"><i class="fas fa-plus"></i> Añadir producto actual</button>`;
        listCard.appendChild(titleDiv);
        listCard.appendChild(productsDiv);
        listCard.appendChild(actionsDiv);
        listsContainer.appendChild(listCard);
        
        // Eventos
        titleDiv.querySelector(".delete-list-btn").addEventListener("click", () => deleteList(listName));
        actionsDiv.querySelector(".add-current-to-list").addEventListener("click", () => {
            if (currentProductForList) {
                addProductToList(listName, currentProductForList.id);
                closeListModal();
                showToast(`Producto añadido a "${listName}"`, "success");
            } else {
                showToast("Selecciona un producto primero", "warning");
            }
        });
        // Eventos para eliminar producto de lista
        productsDiv.querySelectorAll(".remove-from-list").forEach(btn => {
            btn.addEventListener("click", (e) => {
                const list = btn.dataset.list;
                const prodId = btn.dataset.productId;
                removeProductFromList(list, prodId);
            });
        });
    }
}


// MODAL DE LISTAS

function openListModal(product) {
    currentProductForList = product;
    if (!listModalContent) return;
    listModalContent.innerHTML = `
        <div style="margin-bottom: 20px;">
            <p><strong>Producto:</strong> ${escapeHtml(product.title)}</p>
        </div>
        <div class="form-group">
            <label><i class="fas fa-list"></i> Seleccionar lista existente:</label>
            <select id="existingListSelect" class="form-control">
                <option value="">-- Elige una lista --</option>
                ${Array.from(userLists.keys()).map(name => `<option value="${escapeHtml(name)}">${escapeHtml(name)}</option>`).join('')}
            </select>
        </div>
        <div class="form-group">
            <label><i class="fas fa-plus-circle"></i> O crear nueva lista:</label>
            <input type="text" id="newListName" placeholder="Nombre de la nueva lista" class="form-control">
        </div>
        <div class="form-actions">
            <button id="addToListBtn" class="btn-primary">Añadir</button>
            <button id="cancelListModalBtn" class="btn-secondary">Cancelar</button>
        </div>
    `;
    const addBtn = listModalContent.querySelector("#addToListBtn");
    const cancelBtn = listModalContent.querySelector("#cancelListModalBtn");
    const existingSelect = listModalContent.querySelector("#existingListSelect");
    const newListInput = listModalContent.querySelector("#newListName");
    
    addBtn.addEventListener("click", () => {
        const selectedList = existingSelect.value;
        const newList = newListInput.value.trim();
        if (selectedList) {
            addProductToList(selectedList, product.id);
            closeListModal();
            showToast(`Producto añadido a "${selectedList}"`, "success");
        } else if (newList) {
            if (createNewList(newList)) {
                addProductToList(newList, product.id);
                closeListModal();
                showToast(`Producto añadido a nueva lista "${newList}"`, "success");
            }
        } else {
            showToast("Debes seleccionar o crear una lista", "warning");
        }
    });
    cancelBtn.addEventListener("click", closeListModal);
    listModalOverlay.classList.remove("hidden");
}

function closeListModal() {
    if (listModalOverlay) listModalOverlay.classList.add("hidden");
    currentProductForList = null;
}


// MODAL PARA AGREGAR/EDITAR PRODUCTO

let currentEditId = null;

function openAddModal() {
    currentEditId = null;
    modalTitle.textContent = "Agregar Producto";
    productForm.reset();
    document.getElementById("productId").value = "";
    modalOverlay.classList.remove("hidden");
}

function openEditModal(id) {
    const product = productsMap.get(id);
    if (!product) return;
    currentEditId = id;
    modalTitle.textContent = "Editar Producto";
    document.getElementById("productId").value = product.id;
    document.getElementById("title").value = product.title;
    document.getElementById("description").value = product.description || "";
    document.getElementById("price").value = product.price;
    document.getElementById("stock").value = product.stock;
    document.getElementById("category").value = product.category;
    modalOverlay.classList.remove("hidden");
}

function closeModal() {
    modalOverlay.classList.add("hidden");
    currentEditId = null;
}

productForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const title = document.getElementById("title").value.trim();
    const description = document.getElementById("description").value.trim();
    const price = parseFloat(document.getElementById("price").value);
    const stock = parseInt(document.getElementById("stock").value, 10);
    const category = document.getElementById("category").value.trim();
    const productData = { title, description, price, stock, category };
    const validation = validateProduct(productData);
    if (!validation.isValid) {
        showToast(validation.errors.join(" "), "error");
        return;
    }
    if (currentEditId) {
        await updateProduct(currentEditId, productData);
    } else {
        const newLocalId = generateUniqueId();
        await addProduct(productData, newLocalId);
    }
    closeModal();
});

addProductBtn.addEventListener("click", openAddModal);
closeModalBtn.addEventListener("click", closeModal);
cancelModalBtn.addEventListener("click", closeModal);
modalOverlay.addEventListener("click", (e) => {
    if (e.target === modalOverlay) closeModal();
});


// FILTROS Y BÚSQUEDA

if (searchInput) {
    searchInput.addEventListener("input", (e) => {
        searchTerm = e.target.value;
        renderProducts();
    });
}
if (categoryFilter) {
    categoryFilter.addEventListener("change", (e) => {
        currentFilter = e.target.value;
        renderProducts();
    });
}
if (resetApiBtn) {
    resetApiBtn.addEventListener("click", async () => {
        if (confirm("¿Reiniciar todos los datos desde la API? Se perderán los cambios locales.")) {
            await fetchProductsFromAPI();
        }
    });
}
if (closeListModalBtn) {
    closeListModalBtn.addEventListener("click", closeListModal);
}
if (listModalOverlay) {
    listModalOverlay.addEventListener("click", (e) => {
        if (e.target === listModalOverlay) closeListModal();
    });
}
if (createEmptyListBtn) {
    createEmptyListBtn.addEventListener("click", () => {
        const name = prompt("Nombre de la nueva lista:");
        if (name) createNewList(name);
    });
}


// INICIALIZACIÓN

async function init() {
    const hasLocalData = loadFromLocalStorage();
    if (hasLocalData && productsMap.size > 0) {
        renderProducts();
        showToast("Datos de productos cargados desde LocalStorage", "success");
    } else {
        await fetchProductsFromAPI();
    }
    loadListsFromLocalStorage();
    renderLists();
    demonstrateObjectMethods();
}

document.addEventListener("DOMContentLoaded", init);