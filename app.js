import { initializeApp } from "https://www.gstatic.com/firebasejs/12.14.0/firebase-app.js";
import {
  browserLocalPersistence,
  getAuth,
  onAuthStateChanged,
  setPersistence,
  signInWithEmailAndPassword,
  signOut
} from "https://www.gstatic.com/firebasejs/12.14.0/firebase-auth.js";
import {
  doc,
  getDoc,
  getFirestore,
  runTransaction,
  serverTimestamp,
  setDoc
} from "https://www.gstatic.com/firebasejs/12.14.0/firebase-firestore.js";

const FIREBASE_CONFIG = {
  apiKey: "AIzaSyAegleek_r7ra4JH7pEiNpOA2ZO_0uhRXs",
  authDomain: "casualdayapp-11d20.firebaseapp.com",
  projectId: "casualdayapp-11d20",
  storageBucket: "casualdayapp-11d20.firebasestorage.app",
  messagingSenderId: "495952956389",
  appId: "1:495952956389:web:cea2b63b2c64d966e37d0c"
};
const FIREBASE_STATE_COLLECTION = "casualdayInventoryState";
const FIREBASE_STATE_DOC_ID = "main";
const firebaseApp = initializeApp(FIREBASE_CONFIG);
const firebaseAuth = getAuth(firebaseApp);
const firestoreDb = getFirestore(firebaseApp);
const inventoryStateRef = doc(firestoreDb, FIREBASE_STATE_COLLECTION, FIREBASE_STATE_DOC_ID);
const PRODUCT_FIELDS = [
  { key: "marca", label: "Marca" },
  { key: "codigo", label: "Código" },
  { key: "prenda", label: "Prenda" },
  { key: "talle", label: "Talle" },
  { key: "color", label: "Color" },
  { key: "stock", label: "Stock" },
  { key: "costo", label: "Costo" },
  { key: "precio", label: "Precio Minorista" },
  { key: "precioMayorista", label: "Precio Mayorista" },
  { key: "estanteria", label: "Estanteria" },
  { key: "lugar", label: "Lugar" }
];
const DERIVED_PRODUCT_FIELD_KEYS = new Set(["precio", "precioMayorista"]);
const PRODUCT_INPUT_FIELDS = PRODUCT_FIELDS.filter((field) => !DERIVED_PRODUCT_FIELD_KEYS.has(field.key));
const MAX_SALE_SEARCH_RESULTS = 25;
const PRICE_LIST_TYPES = {
  minorista: "Minorista",
  mayorista: "Mayorista general",
  empresa: "Empresa concreta"
};
const DEFAULT_PRICE_LISTS = [
  {
    id: "default-minorista",
    nombre: "Minorista",
    tipoCliente: "minorista",
    empresa: "",
    ajuste: "sobreprecio",
    porcentaje: 0,
    locked: true
  },
  {
    id: "default-mayorista",
    nombre: "Mayorista",
    tipoCliente: "mayorista",
    empresa: "",
    ajuste: "descuento",
    porcentaje: 0,
    locked: true
  }
];

let allProducts = [];
let transactionHistory = [];
let priceLists = [];
let stateRevision = 0;
let saleCart = [];
let selectedSaleProductIndex = null;
let selectedSalePriceListId = "default-minorista";
let editingPriceListId = null;
let isLoading = false;
let isPriceListSaving = false;
let isAddProductSaving = false;
let isSaleSignSaving = false;
const activeFilters = new Map();

const firebaseGate = document.querySelector("#firebase-gate");
const firebaseGateTitle = document.querySelector("#firebase-gate-title");
const firebaseGateMessage = document.querySelector("#firebase-gate-message");
const firebaseAuthForm = document.querySelector("#firebase-auth-form");
const firebaseEmailInput = document.querySelector("#firebase-email");
const firebasePasswordInput = document.querySelector("#firebase-password");
const firebaseAuthError = document.querySelector("#firebase-auth-error");
const currentUserLabel = document.querySelector("#current-user-label");
const signOutButton = document.querySelector("#sign-out");
const productList = document.querySelector("#product-list");
const productCount = document.querySelector("#product-count");
const searchInput = document.querySelector("#product-search");
const filterOptions = document.querySelector("#filter-options");
const activeFiltersContainer = document.querySelector("#active-filters");
const priceListOpenButton = document.querySelector("#price-list-open");
const priceListCloseButton = document.querySelector("#price-list-close");
const priceListModal = document.querySelector("#price-list-modal");
const priceListForm = document.querySelector("#price-list-form");
const priceListNameInput = document.querySelector("#price-list-name");
const priceListTypeInput = document.querySelector("#price-list-type");
const priceListCompanyInput = document.querySelector("#price-list-company");
const priceListPercentLabel = document.querySelector("label[for='price-list-discount']");
const priceListPercentInput = document.querySelector("#price-list-discount");
const priceListError = document.querySelector("#price-list-error");
const priceListItems = document.querySelector("#price-list-items");
const priceListCancelEditButton = document.querySelector("#price-list-cancel-edit");
const priceListSubmitButton = document.querySelector("#price-list-submit");
const historyOpenButton = document.querySelector("#history-open");
const historyCloseButton = document.querySelector("#history-close");
const historyModal = document.querySelector("#history-modal");
const transactionList = document.querySelector("#transaction-list");
const addProductOpenButton = document.querySelector("#add-product-open");
const addProductCloseButton = document.querySelector("#add-product-close");
const addProductCancelButton = document.querySelector("#add-product-cancel");
const addProductModal = document.querySelector("#add-product-modal");
const addProductForm = document.querySelector("#add-product-form");
const addProductError = document.querySelector("#add-product-error");
const addProductSubmitButton = addProductForm.querySelector("button[type='submit']");
const saleOpenButton = document.querySelector("#sale-open");
const saleCloseButton = document.querySelector("#sale-close");
const saleCancelButton = document.querySelector("#sale-cancel");
const saleModal = document.querySelector("#sale-modal");
const saleItemForm = document.querySelector("#sale-item-form");
const saleProductSearchInput = document.querySelector("#sale-product-search");
const saleSearchResults = document.querySelector("#sale-search-results");
const saleSelectedProduct = document.querySelector("#sale-selected-product");
const saleQuantityInput = document.querySelector("#sale-quantity");
const saleError = document.querySelector("#sale-error");
const saleItemsList = document.querySelector("#sale-items-list");
const salePriceListSelect = document.querySelector("#sale-price-list");
const saleTotalAmount = document.querySelector("#sale-total-amount");
const saleTotalDetail = document.querySelector("#sale-total-detail");
const saleFinishButton = document.querySelector("#sale-finish");
const saleSignModal = document.querySelector("#sale-sign-modal");
const saleSignForm = document.querySelector("#sale-sign-form");
const saleSignerInput = document.querySelector("#sale-signer");
const saleSignError = document.querySelector("#sale-sign-error");
const saleSignCloseButton = document.querySelector("#sale-sign-close");
const saleSignCancelButton = document.querySelector("#sale-sign-cancel");
const saleSignSubmitButton = saleSignForm.querySelector("button[type='submit']");

function getStateRevision(value) {
  const revision = Number(value);
  return Number.isSafeInteger(revision) && revision >= 0 ? revision : 0;
}

function getFirestoreLoadErrorMessage(error) {
  switch (error?.code) {
    case "permission-denied":
      return "Tu usuario no tiene permiso para leer el inventario. Revisá el email permitido en las reglas de Firestore.";
    case "unavailable":
      return "Firebase no está disponible en este momento. Revisá la conexión a internet y volvé a intentar.";
    default:
      return "No se pudo cargar el inventario desde Firebase.";
  }
}

async function loadInitialState() {
  try {
    const snapshot = await getDoc(inventoryStateRef);

    if (snapshot.exists()) {
      return normalizeStateRecord(snapshot.data());
    }

    const seedState = getSeedState();
    const revision = 1;
    await setDoc(inventoryStateRef, createFirestoreStateDocument(seedState, revision));

    return {
      ...seedState,
      revision
    };
  } catch (error) {
    throw new Error(getFirestoreLoadErrorMessage(error));
  }
}

function allowAppLoad() {
  document.body.classList.remove("firebase-checking", "firebase-blocked");

  if (firebaseGate) {
    firebaseGate.hidden = true;
  }
}

function blockAppLoad(message) {
  document.body.classList.remove("firebase-checking");
  document.body.classList.add("firebase-blocked");

  if (firebaseGateTitle) {
    firebaseGateTitle.textContent = "No se pudo abrir el inventario";
  }

  if (firebaseGateMessage) {
    firebaseGateMessage.textContent = message;
  }

  if (firebaseAuthForm) {
    firebaseAuthForm.hidden = false;
  }

  if (firebaseGate) {
    firebaseGate.hidden = false;
  }
}

function showFirebaseChecking(message = "Cargando inventario...") {
  document.body.classList.remove("firebase-blocked");
  document.body.classList.add("firebase-checking");

  if (firebaseGateTitle) {
    firebaseGateTitle.textContent = "Conectando con Firebase";
  }

  if (firebaseGateMessage) {
    firebaseGateMessage.textContent = message;
  }

  if (firebaseAuthForm) {
    firebaseAuthForm.hidden = true;
  }

  if (firebaseGate) {
    firebaseGate.hidden = false;
  }
}

function showFirebaseSignIn() {
  document.body.classList.remove("firebase-checking");
  document.body.classList.add("firebase-blocked");

  if (firebaseGateTitle) {
    firebaseGateTitle.textContent = "Ingresar al inventario";
  }

  if (firebaseGateMessage) {
    firebaseGateMessage.textContent = "";
  }

  if (firebaseAuthError) {
    firebaseAuthError.textContent = "";
  }

  if (firebaseAuthForm) {
    firebaseAuthForm.hidden = false;
  }

  if (firebaseGate) {
    firebaseGate.hidden = false;
  }
}

function cloneRecords(records) {
  return Array.isArray(records) ? records.map((record) => ({ ...record })) : [];
}

function getSeedState() {
  return {
    products: [],
    transactions: [],
    priceLists: cloneRecords(DEFAULT_PRICE_LISTS)
  };
}

function normalizeStateRecord(state = {}) {
  return {
    products: Array.isArray(state.products) ? state.products : [],
    transactions: Array.isArray(state.transactions) ? state.transactions : [],
    priceLists: Array.isArray(state.priceLists) ? state.priceLists : [],
    revision: getStateRevision(state.revision)
  };
}

function createFirestoreStateDocument(state, revision) {
  return {
    products: cloneRecords(state.products).map(serializeProduct),
    transactions: cloneRecords(state.transactions).map(serializeTransaction),
    priceLists: ensureDefaultPriceLists(cloneRecords(state.priceLists)).map(serializePriceList),
    revision,
    updatedAt: serverTimestamp()
  };
}

function normalizeProduct(product = {}, index) {
  const rawCost = String(product.costo || "$0").trim();

  return {
    marca: normalizeProductTextField(product.marca, "Sin marca"),
    codigo: normalizeProductTextField(product.codigo, `CD-${String(index + 1).padStart(3, "0")}`),
    prenda: normalizeProductTextField(product.prenda, "Prenda sin nombre"),
    talle: normalizeProductTextField(product.talle, "-"),
    color: normalizeProductTextField(product.color, "-"),
    stock: parseStockValue(product.stock) ?? 0,
    costo: parseProductCostAmount(rawCost) !== null ? rawCost : "$0",
    estanteria: normalizeProductTextField(product.estanteria, "-"),
    lugar: normalizeProductTextField(product.lugar, "-")
  };
}

function serializeProduct(product) {
  return {
    marca: product.marca,
    codigo: product.codigo,
    prenda: product.prenda,
    talle: product.talle,
    color: product.color,
    stock: product.stock,
    costo: product.costo,
    estanteria: product.estanteria,
    lugar: product.lugar
  };
}

function normalizeTransaction(transaction = {}) {
  const cantidad = Number(transaction.cantidad ?? 0);
  const stockAnterior = Number(transaction.stockAnterior ?? NaN);
  const stockFinal = Number(transaction.stockFinal ?? NaN);
  const tipo = transaction.tipo === "salida" ? "salida" : "entrada";

  return {
    fecha: String(transaction.fecha || "-"),
    tipo,
    codigo: String(transaction.codigo || "-"),
    prenda: String(transaction.prenda || "Prenda sin nombre"),
    talle: String(transaction.talle || "-"),
    color: String(transaction.color || "-"),
    cantidad: Number.isFinite(cantidad) ? cantidad : 0,
    stockAnterior: Number.isFinite(stockAnterior) ? stockAnterior : null,
    stockFinal: Number.isFinite(stockFinal) ? stockFinal : null,
    firma: String(transaction.firma || "-"),
    detalle: String(transaction.detalle || "-")
  };
}

function serializeTransaction(transaction) {
  return {
    fecha: transaction.fecha,
    tipo: transaction.tipo,
    codigo: transaction.codigo,
    prenda: transaction.prenda,
    talle: transaction.talle,
    color: transaction.color,
    cantidad: transaction.cantidad,
    stockAnterior: transaction.stockAnterior,
    stockFinal: transaction.stockFinal,
    firma: transaction.firma,
    detalle: transaction.detalle
  };
}

function createPriceListId() {
  if (window.crypto?.randomUUID) {
    return window.crypto.randomUUID();
  }

  return `price-list-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function getPriceListTypeLabel(type) {
  return PRICE_LIST_TYPES[type] || PRICE_LIST_TYPES.minorista;
}

function normalizeComparableText(value) {
  return String(value || "").trim().toLowerCase();
}

function findDefaultPriceList(priceList) {
  const priceListId = String(priceList.id || "");

  return DEFAULT_PRICE_LISTS.find((defaultList) => {
    if (priceListId) {
      return priceListId === defaultList.id;
    }

    const hasDefaultName = normalizeComparableText(priceList.nombre) === normalizeComparableText(defaultList.nombre);

    return hasDefaultName && priceList.tipoCliente === defaultList.tipoCliente;
  });
}

function normalizePriceList(priceList = {}) {
  const defaultList = findDefaultPriceList(priceList);
  const rawType = String(priceList.tipoCliente || "minorista");
  const tipoCliente = PRICE_LIST_TYPES[rawType] ? rawType : "minorista";
  const rawAdjustment = String(priceList.ajuste || "");
  const ajuste = defaultList?.ajuste || (rawAdjustment === "sobreprecio" || tipoCliente === "minorista" ? "sobreprecio" : "descuento");
  const porcentaje = Number(priceList.porcentaje ?? priceList.descuento ?? 0);

  return {
    id: String(defaultList?.id || priceList.id || createPriceListId()),
    nombre: String(defaultList?.nombre || priceList.nombre || "Lista sin nombre"),
    tipoCliente: defaultList?.tipoCliente || tipoCliente,
    empresa: defaultList ? "" : String(priceList.empresa || ""),
    ajuste,
    porcentaje: Number.isFinite(porcentaje) ? porcentaje : 0,
    locked: Boolean(defaultList || priceList.locked)
  };
}

function serializePriceList(priceList) {
  return {
    id: priceList.id,
    nombre: priceList.nombre,
    tipoCliente: priceList.tipoCliente,
    empresa: priceList.empresa,
    ajuste: priceList.ajuste,
    porcentaje: priceList.porcentaje,
    locked: priceList.locked
  };
}

function ensureDefaultPriceLists(records) {
  const normalizedRecords = records.map(normalizePriceList);
  const defaultIds = new Set(DEFAULT_PRICE_LISTS.map((defaultList) => defaultList.id));
  const defaultRecords = DEFAULT_PRICE_LISTS.map((defaultList) => {
    const existingDefault = normalizedRecords.find((priceList) => priceList.id === defaultList.id);
    return normalizePriceList(existingDefault || defaultList);
  });
  const customRecords = normalizedRecords.filter((priceList) => !defaultIds.has(priceList.id));

  return [...defaultRecords, ...customRecords];
}

function setButtonDisabled(button, disabled) {
  if (button) {
    button.disabled = disabled;
  }
}

function normalizeProductTextField(value, fallback) {
  const text = String(value ?? "").trim();
  return text || fallback;
}

function parseStockValue(value) {
  const stock = Number(value);

  return Number.isInteger(stock) && stock >= 0 ? stock : null;
}

function parseCurrencyValue(value) {
  const amount = parseCurrencyAmount(value);

  return amount !== null && amount >= 0 ? amount : null;
}

function getProductCostAmount(product) {
  return parseCurrencyValue(product.costo) ?? 0;
}

function parseProductCostAmount(value) {
  const amount = parseCurrencyAmount(value);

  return amount !== null && amount > 0 ? amount : null;
}

function parseCurrencyAmount(value) {
  const text = String(value || "").trim();

  if (!text) {
    return null;
  }

  const normalizedText = text
    .replace(/\s+/g, "")
    .replace(/^ARS/i, "")
    .replace(/^\$/, "");

  const amountText = normalizedText.startsWith("-") ? normalizedText.slice(1) : normalizedText;
  const hasValidFormat = /^\d+$/.test(amountText)
    || /^\d{1,3}(\.\d{3})+(,\d{1,2})?$/.test(amountText)
    || /^\d+,\d{1,2}$/.test(amountText);

  if (!hasValidFormat) {
    return null;
  }

  const normalized = normalizedText.includes(",")
    ? normalizedText.replace(/\./g, "").replace(",", ".")
    : normalizedText.replace(/\./g, "");
  const amount = Number(normalized);

  return Number.isFinite(amount) ? amount : null;
}

function formatCurrency(value) {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0
  }).format(value);
}

function createTransactionTimestamp(date = new Date()) {
  return date.toLocaleString("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function getDefaultSalePriceListId() {
  return priceLists.find((priceList) => priceList.id === "default-minorista")?.id || priceLists[0]?.id || "";
}

function getSelectedSalePriceList() {
  return priceLists.find((priceList) => priceList.id === selectedSalePriceListId)
    || priceLists.find((priceList) => priceList.id === getDefaultSalePriceListId())
    || priceLists[0]
    || null;
}

function getMinoristaPriceList(lists = priceLists) {
  return lists.find((priceList) => priceList.id === "default-minorista")
    || lists.find((priceList) => priceList.tipoCliente === "minorista")
    || DEFAULT_PRICE_LISTS[0];
}

function getMayoristaPriceList(lists = priceLists) {
  return lists.find((priceList) => priceList.id === "default-mayorista")
    || lists.find((priceList) => priceList.tipoCliente === "mayorista")
    || DEFAULT_PRICE_LISTS[1];
}

function getProductRetailAmount(product, lists = priceLists) {
  const cost = getProductCostAmount(product);
  const minoristaList = getMinoristaPriceList(lists);
  const percent = Number(minoristaList?.porcentaje || 0);

  return cost * (1 + percent / 100);
}

function getComputedRetailPriceLabel(product, lists = priceLists) {
  return formatCurrency(getProductRetailAmount(product, lists));
}

function getProductWholesaleAmount(product, lists = priceLists) {
  const mayoristaList = getMayoristaPriceList(lists);
  const retailPrice = getProductRetailAmount(product, lists);
  const percent = Number(mayoristaList?.porcentaje || 0);

  if (usesMarkupOverCost(mayoristaList)) {
    const cost = getProductCostAmount(product);
    return cost * (1 + percent / 100);
  }

  return Math.max(retailPrice * (1 - percent / 100), 0);
}

function getComputedWholesalePriceLabel(product, lists = priceLists) {
  return formatCurrency(getProductWholesaleAmount(product, lists));
}

function getProductFieldValue(product, fieldKey) {
  if (fieldKey === "precio") {
    return getComputedRetailPriceLabel(product);
  }

  if (fieldKey === "precioMayorista") {
    return getComputedWholesalePriceLabel(product);
  }

  return String(product[fieldKey]);
}

function getSaleUnitPrice(product, priceList) {
  if (!priceList) {
    return getProductRetailAmount(product);
  }

  const retailPrice = getProductRetailAmount(product);
  const cost = getProductCostAmount(product);
  const percent = Number(priceList.porcentaje || 0);

  if (usesMarkupOverCost(priceList)) {
    return cost * (1 + percent / 100);
  }

  return Math.max(retailPrice * (1 - percent / 100), 0);
}

async function persistState(nextProducts, nextTransactions, nextPriceLists = priceLists) {
  const nextState = {
    products: nextProducts.map(serializeProduct),
    transactions: nextTransactions.map(serializeTransaction),
    priceLists: nextPriceLists.map(serializePriceList)
  };

  try {
    const nextRevision = await runTransaction(firestoreDb, async (transaction) => {
      const snapshot = await transaction.get(inventoryStateRef);
      const storedRevision = snapshot.exists() ? getStateRevision(snapshot.data().revision) : 0;

      if (storedRevision !== stateRevision) {
        throw new Error("El inventario cambió en otro dispositivo. Recargá la página para ver la última versión antes de guardar de nuevo.");
      }

      const revision = storedRevision + 1;
      transaction.set(inventoryStateRef, {
        ...nextState,
        revision,
        updatedAt: serverTimestamp()
      });

      return revision;
    });

    stateRevision = nextRevision;
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("El inventario cambió")) {
      throw error;
    }

    throw new Error("No se pudo guardar en Firebase. Revisá que hayas iniciado sesión y que las reglas de Firestore permitan tu email.");
  }
}

function showLoadingState() {
  const state = document.createElement("div");
  const spinner = document.createElement("span");
  const label = document.createElement("span");

  state.className = "loading-state";
  spinner.className = "loading-spinner";
  spinner.setAttribute("aria-hidden", "true");
  label.textContent = "Buscando productos...";
  state.append(spinner, label);

  productCount.textContent = "0";
  productList.replaceChildren(state);
}

function createOption(value, label) {
  const option = document.createElement("option");
  option.value = value;
  option.textContent = label;
  return option;
}

function getUniqueFieldValues(fieldKey) {
  return [...new Set(allProducts.map((product) => getProductFieldValue(product, fieldKey)))]
    .filter(Boolean)
    .sort((first, second) => first.localeCompare(second, "es", { numeric: true }));
}

function renderFilterControls() {
  const controls = PRODUCT_FIELDS.map((field) => {
    const wrapper = document.createElement("div");
    const label = document.createElement("label");
    const select = document.createElement("select");
    const values = getUniqueFieldValues(field.key);
    const activeValue = activeFilters.get(field.key) || "";

    if (activeValue && !values.includes(activeValue)) {
      values.push(activeValue);
      values.sort((first, second) => first.localeCompare(second, "es", { numeric: true }));
    }

    wrapper.className = "filter-control";
    label.textContent = field.label;
    label.setAttribute("for", `filter-${field.key}`);

    select.id = `filter-${field.key}`;
    select.dataset.filterKey = field.key;
    select.append(createOption("", "Todos"));

    values.forEach((value) => {
      select.append(createOption(value, value));
    });

    select.value = activeValue;
    select.disabled = !values.length;
    wrapper.append(label, select);

    return wrapper;
  });

  filterOptions.replaceChildren(...controls);
}

function renderActiveFilters() {
  const chips = [...activeFilters.entries()].map(([fieldKey, value]) => {
    const field = PRODUCT_FIELDS.find((item) => item.key === fieldKey);
    const chip = document.createElement("div");
    const label = document.createElement("span");
    const removeButton = document.createElement("button");

    chip.className = "active-filter-chip";
    label.textContent = `${field?.label || fieldKey}: ${value}`;
    removeButton.className = "remove-filter";
    removeButton.type = "button";
    removeButton.dataset.filterKey = fieldKey;
    removeButton.setAttribute("aria-label", `Quitar filtro ${field?.label || fieldKey}`);
    removeButton.textContent = "X";
    chip.append(label, removeButton);

    return chip;
  });

  activeFiltersContainer.replaceChildren(...chips);
}

function createEmptyState(message) {
  const state = document.createElement("div");
  state.className = "empty-state";
  state.textContent = message;
  return state;
}

function createTransactionRow(transaction) {
  const row = document.createElement("article");
  row.className = "transaction-row";

  row.append(
    createTransactionCell(transaction.fecha),
    createTransactionTypeCell(transaction.tipo),
    createTransactionCell(transaction.codigo),
    createTransactionCell(transaction.prenda),
    createTransactionCell(transaction.talle),
    createTransactionCell(transaction.color),
    createTransactionCell(`${transaction.cantidad} u.`),
    createTransactionCell(getTransactionStockLabel(transaction)),
    createTransactionSignatureCell(transaction),
    createTransactionCell(transaction.detalle)
  );

  return row;
}

function createTransactionCell(value) {
  const cell = document.createElement("div");
  cell.className = "transaction-cell";
  cell.textContent = value;
  return cell;
}

function createTransactionTypeCell(tipo) {
  const cell = document.createElement("div");
  const pill = document.createElement("span");

  cell.className = "transaction-cell";
  pill.className = `transaction-type ${tipo}`;
  pill.textContent = tipo === "salida" ? "Salida" : "Entrada";
  cell.append(pill);

  return cell;
}

function createTransactionSignatureCell(transaction) {
  const cell = document.createElement("div");
  const signer = document.createElement("span");
  const timestamp = document.createElement("span");
  const signerName = transaction.firma || "-";
  const transactionDate = transaction.fecha || "-";

  cell.className = "transaction-cell transaction-signature";
  cell.title = `${signerName} - ${transactionDate}`;
  signer.className = "transaction-signature-name";
  signer.textContent = signerName;
  timestamp.className = "transaction-signature-date";
  timestamp.textContent = transactionDate;
  cell.append(signer, timestamp);

  return cell;
}

function getTransactionStockLabel(transaction) {
  const hasPreviousStock = transaction.stockAnterior !== null;
  const hasFinalStock = transaction.stockFinal !== null;

  if (hasPreviousStock && hasFinalStock) {
    return `${transaction.stockAnterior} -> ${transaction.stockFinal}`;
  }

  if (hasFinalStock) {
    return String(transaction.stockFinal);
  }

  return "-";
}

function createProductRow(product) {
  const row = document.createElement("article");
  row.className = "product-row";

  row.append(
    createTextCell("marca primary", product.marca),
    createTextCell("codigo", product.codigo),
    createTextCell("prenda primary", product.prenda),
    createTextCell("talle", product.talle),
    createTextCell("color", product.color),
    createStockCell(product.stock),
    createTextCell("costo", product.costo),
    createTextCell("precio", getComputedRetailPriceLabel(product)),
    createTextCell("precioMayorista", getComputedWholesalePriceLabel(product)),
    createTextCell("estanteria", product.estanteria),
    createTextCell("lugar", product.lugar)
  );

  return row;
}

function createTextCell(type, value) {
  const cell = document.createElement("div");
  cell.className = `cell ${type}`;
  cell.textContent = value;
  return cell;
}

function createStockCell(stock) {
  const cell = document.createElement("div");
  const pill = document.createElement("span");

  cell.className = "cell stock";
  pill.className = `stock-pill${stock <= 5 ? " low" : ""}`;
  pill.textContent = `${stock} u.`;
  cell.append(pill);

  return cell;
}

function productMatchesSearch(product, searchTerm) {
  if (!searchTerm) {
    return true;
  }

  return [
    product.marca,
    product.codigo,
    product.prenda,
    product.talle,
    product.color,
    String(product.stock),
    product.costo,
    getComputedRetailPriceLabel(product),
    getComputedWholesalePriceLabel(product),
    product.estanteria,
    product.lugar
  ].some((value) => value.toLowerCase().includes(searchTerm));
}

function productMatchesFilters(product) {
  return [...activeFilters.entries()].every(([fieldKey, value]) => {
    return getProductFieldValue(product, fieldKey) === value;
  });
}

function getVisibleProducts() {
  const searchTerm = searchInput.value.trim().toLowerCase();
  return allProducts.filter((product) => {
    return productMatchesSearch(product, searchTerm) && productMatchesFilters(product);
  });
}

function renderInventory(products) {
  productCount.textContent = products.length;

  if (!allProducts.length) {
    productList.replaceChildren(createEmptyState("No hay productos cargados aún"));
    return;
  }

  if (!products.length) {
    productList.replaceChildren(createEmptyState("No hay resultados para esa busqueda"));
    return;
  }

  productList.replaceChildren(...products.map(createProductRow));
}

function renderTransactionHistory() {
  if (!transactionHistory.length) {
    transactionList.replaceChildren(createEmptyState("No hay transacciones registradas aún"));
    return;
  }

  transactionList.replaceChildren(...transactionHistory.map(createTransactionRow));
}

function refreshInventoryView() {
  renderFilterControls();
  renderActiveFilters();
  renderInventory(getVisibleProducts());
}

function openHistoryModal() {
  historyModal.hidden = false;
  renderTransactionHistory();
  historyCloseButton.focus();
}

function closeHistoryModal() {
  historyModal.hidden = true;
  historyOpenButton.focus();
}

function formatPercent(percent) {
  return new Intl.NumberFormat("es-AR", {
    maximumFractionDigits: 2
  }).format(percent);
}

function usesMarkupOverCost(priceList) {
  return priceList?.ajuste === "sobreprecio" || priceList?.tipoCliente === "minorista";
}

function getPriceListPercentLabel(priceList) {
  const suffix = usesMarkupOverCost(priceList) ? "sobre costo" : "desc.";
  return `${formatPercent(priceList.porcentaje)}% ${suffix}`;
}

function updatePriceListPercentFieldContext(priceList = null) {
  const usesMarkup = priceList
    ? usesMarkupOverCost(priceList)
    : priceListTypeInput.value === "minorista";

  priceListPercentLabel.textContent = usesMarkup
    ? "Sobreprecio sobre costo (%)"
    : "Descuento sobre minorista (%)";
  priceListPercentInput.max = usesMarkup ? "" : "100";
}

function setPriceListIdentityFieldsDisabled(disabled) {
  priceListNameInput.disabled = disabled;
  priceListTypeInput.disabled = disabled;
  priceListCompanyInput.disabled = disabled;
}

function updatePriceListCompanyState() {
  updatePriceListPercentFieldContext();

  if (priceListNameInput.disabled || priceListTypeInput.disabled) {
    priceListCompanyInput.disabled = true;
    priceListCompanyInput.required = false;
    return;
  }

  const isCompanyList = priceListTypeInput.value === "empresa";

  priceListCompanyInput.disabled = !isCompanyList;
  priceListCompanyInput.required = isCompanyList;
  priceListCompanyInput.placeholder = isCompanyList ? "Nombre de la empresa" : "Solo para empresa concreta";

  if (!isCompanyList) {
    priceListCompanyInput.value = "";
  }
}

function resetPriceListForm() {
  editingPriceListId = null;
  setPriceListIdentityFieldsDisabled(false);
  priceListForm.reset();
  priceListError.textContent = "";
  priceListCancelEditButton.hidden = true;
  priceListSubmitButton.textContent = "Guardar categoría";
  updatePriceListCompanyState();
}

function createPriceListRow(priceList) {
  const row = document.createElement("article");
  const copy = document.createElement("div");
  const title = document.createElement("strong");
  const meta = document.createElement("span");
  const percent = document.createElement("span");
  const editButton = document.createElement("button");
  const clientLabel = priceList.tipoCliente === "empresa" && priceList.empresa
    ? `${getPriceListTypeLabel(priceList.tipoCliente)}: ${priceList.empresa}`
    : getPriceListTypeLabel(priceList.tipoCliente);

  row.className = "price-list-row";
  copy.className = "price-list-copy";
  title.textContent = priceList.nombre;
  meta.textContent = clientLabel;
  percent.className = "price-percent-pill";
  percent.textContent = getPriceListPercentLabel(priceList);
  editButton.className = "price-list-edit";
  editButton.type = "button";
  editButton.dataset.priceListId = priceList.id;
  editButton.textContent = "Editar";

  copy.append(title, meta);
  row.append(copy, percent, editButton);

  return row;
}

function renderPriceLists() {
  if (!priceLists.length) {
    priceListItems.replaceChildren(createEmptyState("No hay listas de precio cargadas aún"));
    return;
  }

  priceListItems.replaceChildren(...priceLists.map(createPriceListRow));
}

function openPriceListModal() {
  resetPriceListForm();
  renderPriceLists();
  priceListModal.hidden = false;
  priceListNameInput.focus();
}

function closePriceListModal() {
  priceListModal.hidden = true;
  resetPriceListForm();
  priceListOpenButton.focus();
}

function getPriceListFromForm() {
  const formData = new FormData(priceListForm);
  const currentPriceList = editingPriceListId
    ? priceLists.find((priceList) => priceList.id === editingPriceListId)
    : null;
  const isLocked = Boolean(currentPriceList?.locked);
  const nombre = isLocked
    ? currentPriceList.nombre
    : String(formData.get("nombre") || "").trim();
  const tipoCliente = isLocked
    ? currentPriceList.tipoCliente
    : String(formData.get("tipoCliente") || "").trim();
  const empresa = isLocked
    ? currentPriceList.empresa
    : String(formData.get("empresa") || "").trim();
  const ajuste = tipoCliente === "minorista" ? "sobreprecio" : "descuento";
  const percentText = String(formData.get("porcentaje") || formData.get("descuento") || "").trim().replace(",", ".");
  const porcentaje = Number(percentText);
  const percentName = ajuste === "sobreprecio" ? "sobreprecio" : "descuento";

  if (!nombre || !tipoCliente || !percentText) {
    priceListError.textContent = `Completá categoría, tipo de cliente y porcentaje de ${percentName}.`;
    return null;
  }

  if (!PRICE_LIST_TYPES[tipoCliente]) {
    priceListError.textContent = "Seleccioná un tipo de cliente válido.";
    return null;
  }

  const reservedDefaultList = DEFAULT_PRICE_LISTS.find((defaultList) => {
    return normalizeComparableText(defaultList.nombre) === normalizeComparableText(nombre);
  });

  if (!isLocked && reservedDefaultList) {
    priceListError.textContent = `${reservedDefaultList.nombre} es una lista predeterminada. Usá otro nombre para listas nuevas.`;
    return null;
  }

  if (tipoCliente === "empresa" && !empresa) {
    priceListError.textContent = "Escribí el nombre de la empresa concreta.";
    return null;
  }

  if (!Number.isFinite(porcentaje) || porcentaje < 0) {
    priceListError.textContent = `El ${percentName} debe ser un numero igual o mayor a 0.`;
    return null;
  }

  if (ajuste === "descuento" && porcentaje > 100) {
    priceListError.textContent = "El descuento debe ser un numero entre 0 y 100.";
    return null;
  }

  priceListError.textContent = "";

  return normalizePriceList({
    id: editingPriceListId || createPriceListId(),
    nombre,
    tipoCliente,
    empresa: tipoCliente === "empresa" ? empresa : "",
    ajuste,
    porcentaje,
    locked: isLocked
  });
}

async function handlePriceListSubmit(event) {
  event.preventDefault();

  if (isPriceListSaving) {
    return;
  }

  const nextPriceList = getPriceListFromForm();

  if (!nextPriceList) {
    return;
  }

  const nextPriceLists = editingPriceListId
    ? priceLists.map((priceList) => (priceList.id === editingPriceListId ? nextPriceList : priceList))
    : [...priceLists, nextPriceList];
  const nextProducts = allProducts.map((product, index) => normalizeProduct(product, index));

  isPriceListSaving = true;
  setButtonDisabled(priceListSubmitButton, true);

  try {
    await persistState(nextProducts, transactionHistory, nextPriceLists);
  } catch (error) {
    priceListError.textContent = error.message;
    return;
  } finally {
    isPriceListSaving = false;
    setButtonDisabled(priceListSubmitButton, false);
  }

  priceLists = nextPriceLists;
  allProducts = nextProducts;
  resetPriceListForm();
  renderPriceLists();
  refreshInventoryView();
  renderSalePriceListOptions();
  renderSaleCart();
}

function editPriceList(priceListId) {
  const priceList = priceLists.find((item) => item.id === priceListId);

  if (!priceList) {
    return;
  }

  editingPriceListId = priceList.id;
  priceListForm.elements.nombre.value = priceList.nombre;
  priceListForm.elements.tipoCliente.value = priceList.tipoCliente;
  priceListForm.elements.empresa.value = priceList.empresa;
  priceListForm.elements.porcentaje.value = String(priceList.porcentaje);
  priceListError.textContent = "";
  priceListCancelEditButton.hidden = false;
  priceListSubmitButton.textContent = usesMarkupOverCost(priceList)
    ? "Guardar sobreprecio"
    : "Guardar descuento";
  setPriceListIdentityFieldsDisabled(Boolean(priceList.locked));
  updatePriceListPercentFieldContext(priceList);
  updatePriceListCompanyState();
  if (priceList.locked) {
    priceListForm.elements.porcentaje.focus();
  } else {
    priceListNameInput.focus();
  }
}

function openAddProductModal() {
  addProductError.textContent = "";
  addProductModal.hidden = false;
  addProductForm.elements.marca.focus();
}

function closeAddProductModal({ resetForm = false } = {}) {
  addProductModal.hidden = true;
  addProductError.textContent = "";

  if (resetForm) {
    addProductForm.reset();
  }

  addProductOpenButton.focus();
}

function getRequiredFieldLabels(values) {
  return PRODUCT_INPUT_FIELDS
    .filter((field) => !values[field.key])
    .map((field) => field.label);
}

function getProductFromForm() {
  const formData = new FormData(addProductForm);
  const values = Object.fromEntries(
    PRODUCT_INPUT_FIELDS.map((field) => [field.key, String(formData.get(field.key) || "").trim()])
  );
  const missingFields = getRequiredFieldLabels(values);
  const stock = parseStockValue(values.stock);
  const costAmount = parseProductCostAmount(values.costo);

  if (missingFields.length) {
    addProductError.textContent = `Completá todos los campos: ${missingFields.join(", ")}.`;
    return null;
  }

  if (stock === null) {
    addProductError.textContent = "Stock debe ser un numero entero igual o mayor a 0.";
    return null;
  }

  if (costAmount === null) {
    addProductError.textContent = "Costo debe ser un importe valido mayor a 0. Ej: $18.900.";
    return null;
  }

  addProductError.textContent = "";

  return normalizeProduct({ ...values, stock }, allProducts.length);
}

function createAddProductTransaction(product) {
  return normalizeTransaction({
    fecha: createTransactionTimestamp(),
    tipo: "entrada",
    codigo: product.codigo,
    prenda: product.prenda,
    talle: product.talle,
    color: product.color,
    cantidad: product.stock,
    stockAnterior: 0,
    stockFinal: product.stock,
    firma: "-",
    detalle: `Producto agregado en ${product.lugar} / ${product.estanteria}`
  });
}

async function handleAddProductSubmit(event) {
  event.preventDefault();

  if (isAddProductSaving) {
    return;
  }

  const product = getProductFromForm();

  if (!product) {
    return;
  }

  const nextProducts = [...allProducts, product];
  const nextTransactions = [createAddProductTransaction(product), ...transactionHistory];

  isAddProductSaving = true;
  setButtonDisabled(addProductSubmitButton, true);

  try {
    await persistState(nextProducts, nextTransactions);
  } catch (error) {
    addProductError.textContent = error.message;
    return;
  } finally {
    isAddProductSaving = false;
    setButtonDisabled(addProductSubmitButton, false);
  }

  allProducts = nextProducts;
  transactionHistory = nextTransactions;
  addProductForm.reset();
  closeAddProductModal();
  refreshInventoryView();
  renderTransactionHistory();
}

function getSaleCartQuantity(productIndex) {
  return saleCart
    .filter((item) => item.productIndex === productIndex)
    .reduce((total, item) => total + item.quantity, 0);
}

function getRemainingStock(productIndex) {
  const product = allProducts[productIndex];

  if (!product) {
    return 0;
  }

  return Math.max(product.stock - getSaleCartQuantity(productIndex), 0);
}

function getSaleProductLabel(product, productIndex) {
  const remainingStock = getRemainingStock(productIndex);
  return `${product.codigo} - ${product.prenda} - ${product.talle} - ${product.color} (${remainingStock} disponibles)`;
}

function getSaleProductSearchText(product) {
  return [
    product.marca,
    product.codigo,
    product.prenda,
    product.talle,
    product.color,
    product.stock,
    product.costo,
    getComputedRetailPriceLabel(product),
    product.estanteria,
    product.lugar
  ].join(" ").toLowerCase();
}

function renderSalePriceListOptions() {
  const currentValue = selectedSalePriceListId || getDefaultSalePriceListId();
  const options = priceLists.map((priceList) => {
    const option = createOption(priceList.id, priceList.nombre);
    const label = usesMarkupOverCost(priceList) ? "sobre costo" : "descuento";
    option.textContent = `${priceList.nombre} (${formatPercent(priceList.porcentaje)}% ${label})`;
    return option;
  });

  salePriceListSelect.replaceChildren(...options);

  if (priceLists.some((priceList) => priceList.id === currentValue)) {
    selectedSalePriceListId = currentValue;
  } else {
    selectedSalePriceListId = getDefaultSalePriceListId();
  }

  salePriceListSelect.value = selectedSalePriceListId;
}

function getSaleCartTotal(priceList) {
  return saleCart.reduce((total, item) => {
    const product = allProducts[item.productIndex];

    if (!product) {
      return total;
    }

    return total + getSaleUnitPrice(product, priceList) * item.quantity;
  }, 0);
}

function renderSaleTotal() {
  const priceList = getSelectedSalePriceList();
  const total = getSaleCartTotal(priceList);

  saleTotalAmount.textContent = formatCurrency(total);
  saleTotalDetail.textContent = priceList
    ? `${priceList.nombre} | ${usesMarkupOverCost(priceList) ? "sobre costo" : "descuento sobre minorista"}`
    : "Sin lista de precios";
}

function createSaleSearchMessage(message) {
  const state = document.createElement("div");
  state.className = "sale-empty";
  state.textContent = message;
  return state;
}

function getSaleSearchMatches() {
  const searchTerm = saleProductSearchInput.value.trim().toLowerCase();

  if (!searchTerm) {
    return [];
  }

  return allProducts
    .map((product, index) => ({ product, index }))
    .filter(({ product, index }) => {
      return getRemainingStock(index) > 0 && getSaleProductSearchText(product).includes(searchTerm);
    })
    .slice(0, MAX_SALE_SEARCH_RESULTS);
}

function createSaleSearchResult(product, productIndex) {
  const button = document.createElement("button");
  const title = document.createElement("strong");
  const meta = document.createElement("span");

  button.className = `sale-result-button${selectedSaleProductIndex === productIndex ? " selected" : ""}`;
  button.type = "button";
  button.dataset.productIndex = String(productIndex);
  button.setAttribute("role", "option");
  button.setAttribute("aria-selected", selectedSaleProductIndex === productIndex ? "true" : "false");
  title.textContent = `${product.codigo} - ${product.prenda}`;
  meta.textContent = `${product.marca} | Talle ${product.talle} | ${product.color} | ${product.lugar} / ${product.estanteria} | ${getRemainingStock(productIndex)} disponibles`;
  button.append(title, meta);

  return button;
}

function renderSaleSearchResults() {
  const searchTerm = saleProductSearchInput.value.trim();

  if (!searchTerm) {
    saleSearchResults.replaceChildren(createSaleSearchMessage("Escribí para buscar productos con stock."));
    return;
  }

  const matches = getSaleSearchMatches();

  if (!matches.length) {
    saleSearchResults.replaceChildren(createSaleSearchMessage("No hay productos en stock para esa búsqueda."));
    return;
  }

  saleSearchResults.replaceChildren(
    ...matches.map(({ product, index }) => createSaleSearchResult(product, index))
  );
}

function renderSelectedSaleProduct() {
  if (selectedSaleProductIndex === null) {
    saleSelectedProduct.hidden = true;
    saleSelectedProduct.textContent = "";
    return;
  }

  const product = allProducts[selectedSaleProductIndex];

  if (!product) {
    selectedSaleProductIndex = null;
    saleSelectedProduct.hidden = true;
    saleSelectedProduct.textContent = "";
    return;
  }

  saleSelectedProduct.textContent = `Seleccionado: ${getSaleProductLabel(product, selectedSaleProductIndex)}`;
  saleSelectedProduct.hidden = false;
}

function selectSaleProduct(productIndex) {
  selectedSaleProductIndex = productIndex;
  const product = allProducts[productIndex];

  saleProductSearchInput.value = `${product.codigo} - ${product.prenda}`;
  saleSearchResults.replaceChildren();
  renderSelectedSaleProduct();
  updateSaleQuantityLimit();
  saleQuantityInput.focus();
}

function updateSaleQuantityLimit() {
  const remainingStock = selectedSaleProductIndex !== null ? getRemainingStock(selectedSaleProductIndex) : 0;

  saleQuantityInput.max = remainingStock ? String(remainingStock) : "";
  saleQuantityInput.disabled = !remainingStock;

  if (remainingStock && Number(saleQuantityInput.value) > remainingStock) {
    saleQuantityInput.value = String(remainingStock);
  }
}

function renderSaleCart() {
  const priceList = getSelectedSalePriceList();

  if (!saleCart.length) {
    const empty = document.createElement("div");
    empty.className = "sale-empty";
    empty.textContent = "Todavía no seleccionaste productos.";
    saleItemsList.replaceChildren(empty);
    saleFinishButton.disabled = true;
    renderSaleTotal();
    return;
  }

  const items = saleCart.map((item, cartIndex) => {
    const product = allProducts[item.productIndex];
    const unitPrice = getSaleUnitPrice(product, priceList);
    const lineTotal = unitPrice * item.quantity;
    const row = document.createElement("article");
    const copy = document.createElement("div");
    const title = document.createElement("strong");
    const meta = document.createElement("span");
    const removeButton = document.createElement("button");

    row.className = "sale-item";
    title.textContent = `${product.codigo} - ${product.prenda}`;
    meta.textContent = `${product.marca} | Talle ${product.talle} | ${product.color} | ${item.quantity} u. | ${formatCurrency(unitPrice)} c/u | ${formatCurrency(lineTotal)}`;
    removeButton.className = "sale-item-remove";
    removeButton.type = "button";
    removeButton.dataset.cartIndex = String(cartIndex);
    removeButton.setAttribute("aria-label", `Quitar ${product.prenda} de la salida`);
    removeButton.textContent = "X";
    copy.append(title, meta);
    row.append(copy, removeButton);

    return row;
  });

  saleItemsList.replaceChildren(...items);
  saleFinishButton.disabled = false;
  renderSaleTotal();
}

function refreshSaleBuilder() {
  renderSalePriceListOptions();
  renderSaleSearchResults();
  renderSelectedSaleProduct();
  updateSaleQuantityLimit();
  renderSaleCart();
}

function resetSaleBuilder({ clearCart = true } = {}) {
  saleItemForm.reset();
  saleError.textContent = "";
  selectedSaleProductIndex = null;

  if (clearCart) {
    saleCart = [];
    selectedSalePriceListId = getDefaultSalePriceListId();
  }

  refreshSaleBuilder();
}

function openSaleModal() {
  resetSaleBuilder({ clearCart: true });
  saleModal.hidden = false;
  saleProductSearchInput.focus();
}

function closeSaleModal({ resetCart = true } = {}) {
  saleModal.hidden = true;
  saleError.textContent = "";

  if (resetCart) {
    resetSaleBuilder({ clearCart: true });
  }

  saleOpenButton.focus();
}

function getSaleItemFromForm() {
  const productIndex = selectedSaleProductIndex;
  const quantity = Number(saleQuantityInput.value);
  const remainingStock = productIndex !== null ? getRemainingStock(productIndex) : 0;

  if (productIndex === null || !allProducts[productIndex]) {
    saleError.textContent = "Seleccioná un producto para la salida.";
    return null;
  }

  if (!Number.isInteger(quantity) || quantity <= 0) {
    saleError.textContent = "La cantidad debe ser un numero entero mayor a 0.";
    return null;
  }

  if (quantity > remainingStock) {
    saleError.textContent = `No hay stock suficiente. Disponible para esta salida: ${remainingStock} u.`;
    return null;
  }

  saleError.textContent = "";
  return { productIndex, quantity };
}

function handleSaleItemSubmit(event) {
  event.preventDefault();

  const saleItem = getSaleItemFromForm();

  if (!saleItem) {
    return;
  }

  const existingItem = saleCart.find((item) => item.productIndex === saleItem.productIndex);

  if (existingItem) {
    existingItem.quantity += saleItem.quantity;
  } else {
    saleCart.push(saleItem);
  }

  saleItemForm.reset();
  selectedSaleProductIndex = null;
  refreshSaleBuilder();
  saleProductSearchInput.focus();
}

function removeSaleCartItem(cartIndex) {
  saleCart.splice(cartIndex, 1);
  refreshSaleBuilder();
}

function openSaleSignModal() {
  if (!saleCart.length) {
    saleError.textContent = "Agregá al menos un producto para terminar la salida.";
    return;
  }

  saleError.textContent = "";
  saleSignError.textContent = "";
  saleSignForm.reset();
  saleModal.hidden = true;
  saleSignModal.hidden = false;
  saleSignerInput.focus();
}

function closeSaleSignModal({ returnToSale = true } = {}) {
  saleSignModal.hidden = true;
  saleSignError.textContent = "";

  if (returnToSale) {
    saleModal.hidden = false;
    saleFinishButton.focus();
  } else {
    saleOpenButton.focus();
  }
}

function buildSaleState(signature) {
  const fecha = createTransactionTimestamp();
  const nextProducts = allProducts.map((product) => ({ ...product }));
  const priceList = getSelectedSalePriceList();

  const transactions = saleCart.map((item) => {
    const product = nextProducts[item.productIndex];
    const previousStock = product.stock;
    const finalStock = previousStock - item.quantity;
    const lineTotal = getSaleUnitPrice(product, priceList) * item.quantity;

    if (finalStock < 0) {
      throw new Error(`No hay stock suficiente para ${product.codigo} - ${product.prenda}.`);
    }

    product.stock = finalStock;

    return normalizeTransaction({
      fecha,
      tipo: "salida",
      codigo: product.codigo,
      prenda: product.prenda,
      talle: product.talle,
      color: product.color,
      cantidad: item.quantity,
      stockAnterior: previousStock,
      stockFinal: finalStock,
      firma: signature,
      detalle: `Salida/Venta ${priceList?.nombre || "Sin lista"} | ${formatCurrency(lineTotal)} desde ${product.lugar} / ${product.estanteria}`
    });
  });

  return {
    nextProducts,
    nextTransactions: [...transactions, ...transactionHistory]
  };
}

async function handleSaleSignSubmit(event) {
  event.preventDefault();

  if (isSaleSignSaving) {
    return;
  }

  const signature = saleSignerInput.value.trim();

  if (!signature) {
    saleSignError.textContent = "Escribí el nombre de quien firma esta Salida/Venta.";
    return;
  }

  let saleState;

  isSaleSignSaving = true;
  setButtonDisabled(saleSignSubmitButton, true);

  try {
    saleState = buildSaleState(signature);
    await persistState(saleState.nextProducts, saleState.nextTransactions);
  } catch (error) {
    saleSignError.textContent = error.message;
    return;
  } finally {
    isSaleSignSaving = false;
    setButtonDisabled(saleSignSubmitButton, false);
  }

  allProducts = saleState.nextProducts;
  transactionHistory = saleState.nextTransactions;
  saleCart = [];
  saleSignForm.reset();
  saleSignModal.hidden = true;
  saleModal.hidden = true;
  refreshInventoryView();
  renderTransactionHistory();
  saleOpenButton.focus();
}

async function initializeInventory() {
  isLoading = true;
  showLoadingState();

  try {
    const {
      products: loadedProducts,
      transactions: loadedTransactions,
      priceLists: loadedPriceLists,
      revision: loadedRevision
    } = await loadInitialState();

    stateRevision = loadedRevision;
    priceLists = ensureDefaultPriceLists(loadedPriceLists);
    allProducts = loadedProducts.map(normalizeProduct);
    transactionHistory = loadedTransactions.map(normalizeTransaction);
    isLoading = false;
    refreshInventoryView();
    renderTransactionHistory();
    renderPriceLists();
    renderSalePriceListOptions();
    allowAppLoad();
  } catch (error) {
    isLoading = false;
    blockAppLoad(error.message || "No se pudo cargar el inventario desde Firebase.");
  }
}

function getAuthErrorMessage(error) {
  switch (error?.code) {
    case "auth/unauthorized-domain":
      return "Este dominio no está autorizado en Firebase. Agregá casualdayapp.github.io en Authentication > Configuración > Dominios autorizados.";
    case "auth/operation-not-allowed":
      return "El acceso con email y contraseña no está habilitado en Firebase Authentication.";
    case "auth/invalid-email":
      return "El email ingresado no tiene un formato válido.";
    case "auth/user-disabled":
      return "Este usuario está deshabilitado en Firebase Authentication.";
    case "auth/invalid-credential":
    case "auth/user-not-found":
    case "auth/wrong-password":
      return "Email o contraseña incorrectos.";
    case "auth/too-many-requests":
      return "Firebase bloqueó temporalmente los intentos. Probá de nuevo más tarde.";
    case "auth/network-request-failed":
      return "No se pudo conectar con Firebase. Revisá la conexión a internet.";
    default:
      return `No se pudo iniciar sesión${error?.code ? ` (${error.code})` : ""}.`;
  }
}

async function handleFirebaseSignIn(event) {
  event.preventDefault();

  if (!firebaseEmailInput || !firebasePasswordInput || !firebaseAuthError) {
    return;
  }

  const email = firebaseEmailInput.value.trim();
  const password = firebasePasswordInput.value;

  firebaseAuthError.textContent = "";

  try {
    await signInWithEmailAndPassword(firebaseAuth, email, password);
  } catch (error) {
    firebaseAuthError.textContent = getAuthErrorMessage(error);
  }
}

async function handleFirebaseSignOut() {
  try {
    await signOut(firebaseAuth);
  } catch {
    blockAppLoad("No se pudo cerrar la sesión de Firebase.");
  }
}

async function startFirebaseSession() {
  showFirebaseChecking("Verificando sesión...");

  try {
    await setPersistence(firebaseAuth, browserLocalPersistence);
  } catch {
    // La app puede seguir funcionando aunque el navegador no permita persistencia local.
  }

  onAuthStateChanged(
    firebaseAuth,
    async (user) => {
      if (!user) {
        if (currentUserLabel) {
          currentUserLabel.textContent = "";
        }
        showFirebaseSignIn();
        return;
      }

      if (currentUserLabel) {
        currentUserLabel.textContent = user.email || "Sesión activa";
      }
      showFirebaseChecking("Cargando inventario...");
      await initializeInventory();
    },
    () => {
      blockAppLoad("No se pudo verificar la sesión de Firebase.");
    }
  );
}

searchInput.addEventListener("input", () => {
  if (isLoading) {
    return;
  }

  renderInventory(getVisibleProducts());
});

filterOptions.addEventListener("change", (event) => {
  const select = event.target.closest("select[data-filter-key]");

  if (!select || isLoading) {
    return;
  }

  if (select.value) {
    activeFilters.set(select.dataset.filterKey, select.value);
  } else {
    activeFilters.delete(select.dataset.filterKey);
  }

  renderActiveFilters();
  renderInventory(getVisibleProducts());
});

activeFiltersContainer.addEventListener("click", (event) => {
  const removeButton = event.target.closest(".remove-filter");

  if (!removeButton || isLoading) {
    return;
  }

  const fieldKey = removeButton.dataset.filterKey;
  const select = filterOptions.querySelector(`[data-filter-key="${fieldKey}"]`);

  activeFilters.delete(fieldKey);

  if (select) {
    select.value = "";
  }

  renderActiveFilters();
  renderInventory(getVisibleProducts());
});

priceListOpenButton.addEventListener("click", openPriceListModal);
priceListCloseButton.addEventListener("click", closePriceListModal);
priceListTypeInput.addEventListener("change", updatePriceListCompanyState);
priceListForm.addEventListener("submit", handlePriceListSubmit);
priceListCancelEditButton.addEventListener("click", resetPriceListForm);
priceListItems.addEventListener("click", (event) => {
  const editButton = event.target.closest(".price-list-edit");

  if (!editButton) {
    return;
  }

  editPriceList(editButton.dataset.priceListId);
});
historyOpenButton.addEventListener("click", openHistoryModal);
historyCloseButton.addEventListener("click", closeHistoryModal);
addProductOpenButton.addEventListener("click", openAddProductModal);
addProductCloseButton.addEventListener("click", () => closeAddProductModal({ resetForm: true }));
addProductCancelButton.addEventListener("click", () => closeAddProductModal({ resetForm: true }));
addProductForm.addEventListener("submit", handleAddProductSubmit);
saleOpenButton.addEventListener("click", openSaleModal);
saleCloseButton.addEventListener("click", () => closeSaleModal({ resetCart: true }));
saleCancelButton.addEventListener("click", () => closeSaleModal({ resetCart: true }));
saleItemForm.addEventListener("submit", handleSaleItemSubmit);
salePriceListSelect.addEventListener("change", () => {
  selectedSalePriceListId = salePriceListSelect.value;
  renderSaleCart();
});
saleProductSearchInput.addEventListener("input", () => {
  selectedSaleProductIndex = null;
  saleError.textContent = "";
  renderSaleSearchResults();
  renderSelectedSaleProduct();
  updateSaleQuantityLimit();
});
saleProductSearchInput.addEventListener("focus", renderSaleSearchResults);
saleFinishButton.addEventListener("click", openSaleSignModal);
saleSignForm.addEventListener("submit", handleSaleSignSubmit);
saleSignCloseButton.addEventListener("click", () => closeSaleSignModal({ returnToSale: true }));
saleSignCancelButton.addEventListener("click", () => closeSaleSignModal({ returnToSale: true }));

saleSearchResults.addEventListener("click", (event) => {
  const resultButton = event.target.closest(".sale-result-button");

  if (!resultButton) {
    return;
  }

  saleError.textContent = "";
  selectSaleProduct(Number(resultButton.dataset.productIndex));
});

saleItemsList.addEventListener("click", (event) => {
  const removeButton = event.target.closest(".sale-item-remove");

  if (!removeButton) {
    return;
  }

  removeSaleCartItem(Number(removeButton.dataset.cartIndex));
});

priceListModal.addEventListener("click", (event) => {
  if (event.target === priceListModal) {
    closePriceListModal();
  }
});

historyModal.addEventListener("click", (event) => {
  if (event.target === historyModal) {
    closeHistoryModal();
  }
});

addProductModal.addEventListener("click", (event) => {
  if (event.target === addProductModal) {
    closeAddProductModal({ resetForm: true });
  }
});

saleModal.addEventListener("click", (event) => {
  if (event.target === saleModal) {
    closeSaleModal({ resetCart: true });
  }
});

saleSignModal.addEventListener("click", (event) => {
  if (event.target === saleSignModal) {
    closeSaleSignModal({ returnToSale: true });
  }
});

document.addEventListener("keydown", (event) => {
  if (event.key !== "Escape") {
    return;
  }

  if (!saleSignModal.hidden) {
    closeSaleSignModal({ returnToSale: true });
    return;
  }

  if (!saleModal.hidden) {
    closeSaleModal({ resetCart: true });
    return;
  }

  if (!addProductModal.hidden) {
    closeAddProductModal({ resetForm: true });
    return;
  }

  if (!priceListModal.hidden) {
    closePriceListModal();
    return;
  }

  if (!historyModal.hidden) {
    closeHistoryModal();
  }
});

if (firebaseAuthForm) {
  firebaseAuthForm.addEventListener("submit", handleFirebaseSignIn);
}

if (signOutButton) {
  signOutButton.addEventListener("click", handleFirebaseSignOut);
}

startFirebaseSession();
