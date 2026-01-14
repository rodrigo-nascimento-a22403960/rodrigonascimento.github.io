// ===========================
//  Constantes e “estado”
// ===========================
const BASE = "https://deisishop.pythonanywhere.com";
const LS_KEY = "produtos-selecionados-ids";
let produtos = [];
const LS_LIKES = "produtos-liked-ids";
const LS_UNDO = "cesto-undo";



// ===========================
//  Utilitários
// ===========================
function lerCarrinho() {
  return JSON.parse(localStorage.getItem(LS_KEY) || "[]"); // JSON.parse
}

function gravarCarrinho(a) {
  localStorage.setItem(LS_KEY, JSON.stringify(a)); // JSON.stringify
}
//funçoes para ler e guardar likes
function lerLikes() {
  return JSON.parse(localStorage.getItem(LS_LIKES) || "[]");
}

function gravarLikes(a) {
  localStorage.setItem(LS_LIKES, JSON.stringify(a));
}

//funçoes para guradar e desfazer a ultima alteraçao no cesto
function guardarUndo() {
  localStorage.setItem(LS_UNDO, JSON.stringify(lerCarrinho()));
}

function onUndoClick() {
  const prev = JSON.parse(localStorage.getItem(LS_UNDO) || "null");
  if (!prev) return;
  // opcional: permitir “undo” alternado (guarda o atual como undo)
  localStorage.setItem(LS_UNDO, JSON.stringify(lerCarrinho()));
  gravarCarrinho(prev);
  renderCesto();
}

//funçao para limpar filtros
function onLimparFiltrosClick() {
  document.querySelector("#filtro").value = "";
  document.querySelector("#ordem").value = "preco-desc";
  document.querySelector("#pesquisa").value = "";

  
  aplicarFiltrosOrdenacaoPesquisa();
}



function toggleLike(id) {
  let a = lerLikes();
  a = a.includes(id) ? a.filter((x) => x !== id) : [...a, id];
  gravarLikes(a);
  return a.includes(id);
}


function eur(n) {
  return `${Number(n).toFixed(2).replace(".", ",")} €`;
}

// Se o image vier relativo, converte para URL absoluta
function imgUrl(u) {
  if (!u) return "";
  if (u.startsWith("http://") || u.startsWith("https://")) return u;
  if (u.startsWith("/")) return `${BASE}${u}`;
  return `${BASE}/${u}`;
}

// ===========================
//  Loading (usa innerHTML)
// ===========================
function setLoadingProdutos(on = true) {
  const pai = document.querySelector("#lista-produtos");

  if (on) {
    pai.innerHTML =
      '<p class="loading" style="grid-column:1/-1;text-align:center">A carregar…</p>';
    return;
  }

  const loading = pai.querySelector(".loading");
  if (loading) loading.remove();
}

// ===========================
//  Categorias (evita [object Object])
// ===========================
function labelCategoria(c) {
  if (typeof c === "string") return c;
  return c?.name ?? c?.title ?? c?.category ?? c?.label ?? String(c);
}

async function carregarCategorias() {
  const sel = document.querySelector("#filtro");
  sel.innerHTML = '<option value="">Todas as categorias</option>';

  try {
    const r = await fetch(`${BASE}/categories/`);
    const arr = await r.json();

    arr.forEach((c) => {
      const nome = labelCategoria(c);
      const o = document.createElement("option");
      o.value = nome;
      o.textContent = nome;
      sel.append(o);
    });
  } catch (e) {
    // fica com a opção default
  }
}

// ===========================
//  Produtos (GET) + cache
// ===========================
async function carregarProdutos() {
  setLoadingProdutos(true);

  try {
    const r = await fetch(`${BASE}/products/`);
    if (!r.ok) throw new Error(`HTTP ${r.status}`);

    produtos = await r.json();

    aplicarFiltrosOrdenacaoPesquisa(); // mostra logo os produtos
    renderCesto(); // atualiza o cesto com os produtos carregados
  } catch (e) {
    document.querySelector("#lista-produtos").textContent =
      "Falha a obter produtos da API.";
  } finally {
    setLoadingProdutos(false);
  }
}

// ===========================
//  Filtro + Ordenação + Pesquisa
// ===========================
function aplicarFiltrosOrdenacaoPesquisa() {
  const cat = document.querySelector("#filtro").value;
  const ord = document.querySelector("#ordem").value;
  const q = document.querySelector("#pesquisa").value.toLowerCase().trim();

  let lista = produtos.slice();

  if (cat) lista = lista.filter((p) => p.category === cat);

  if (q) {
    lista = lista.filter((p) =>
      (p.title + " " + p.description).toLowerCase().includes(q)
    );
  }

  if (ord === "preco-desc") lista.sort((a, b) => b.price - a.price);
  if (ord === "preco-asc") lista.sort((a, b) => a.price - b.price);
  if (ord === "titulo-asc") lista.sort((a, b) => a.title.localeCompare(b.title, "pt"));

  const rate = (p) => Number(p.rating?.rate?? 0);
  if (ord === "rating-desc") lista.sort((a, b) => rate(b) - rate(a));
if (ord === "rating-asc")  lista.sort((a, b) => rate(a) - rate(b));


  renderProdutos(lista);
}

function limparCesto(){
  gravarCarrinho([]);
  renderCesto();

}

// ===========================
//  Produtos (render)
//  - createElement + append
//  - data-attribute
// ===========================
function renderProdutos(arr) {
  const pai = document.querySelector("#lista-produtos");
  pai.textContent = "";

  arr.forEach((p) => {
    const art = document.createElement("article");

    const h3 = document.createElement("h3");
    h3.textContent = p.title;

    const img = document.createElement("img");
    img.src = imgUrl(p.image);
    img.alt = p.title;

    const preco = document.createElement("p");
    preco.textContent = `Custo total: ${eur(p.price)}`;

    const desc = document.createElement("p");
    desc.textContent = p.description;

    const info = document.createElement("p");
    info.textContent = `Categoria: ${p.category} • ⭐ ${p.rating?.rate ?? "-"}`;

    const btn = document.createElement("button");
    btn.textContent = "+ Adicionar ao Cesto";
    btn.dataset.action = "add"; // data-attribute
    btn.dataset.id = String(p.id);
//adicionar coraçao favoritos
const likes = lerLikes();
const liked = likes.includes(p.id); // guardar no localStorage
    const heart = document.createElement("button");
heart.type = "button";
heart.textContent = "♡";
heart.className = "heart";
heart.dataset.action = "heart";
heart.dataset.id = String(p.id);


    art.append(h3, img, preco, desc, info, btn, heart);
    pai.append(art);
  });
}

// ===========================
//  Event handler (event delegation)
// ===========================
function onListaProdutosClick(e) {
  const h = e.target.closest('button[data-action="heart"]');
if (h) {
  h.classList.toggle("is-liked");
  h.textContent = h.classList.contains("is-liked") ? "♥" : "♡";
  return;
}

  const btn = e.target.closest('button[data-action="add"]');
  if (!btn) return;

  const id = Number(btn.dataset.id);
  const ids = lerCarrinho();
  guardarUndo();
  ids.push(id);
  gravarCarrinho(ids);
  renderCesto();
}

// ===========================
//  Cesto (localStorage)
// ===========================
function resetCheckoutUI() {
  document.querySelector("#total").textContent = "0,00 €";
  document.querySelector("#final").textContent =
    "Valor final a pagar (com eventuais descontos): 0,00 €";
  document.querySelector("#ref").textContent = "Referência de pagamento: —";
  document.querySelector("#msg").textContent = "";
}

function renderCesto() {

  document.querySelector("#undo")?.toggleAttribute(
  "disabled",
  !localStorage.getItem(LS_UNDO)
);

  const pai = document.querySelector("#lista-cesto");
  pai.textContent = "";

  const ids = lerCarrinho();

  if (!ids.length) {
    pai.innerHTML =
      '<p style="grid-column:1/-1;text-align:center">Nada no cesto.</p>';
    resetCheckoutUI();
    return;
  }

  // reduce + map
  const cont = ids.reduce((m, id) => ((m[id] = (m[id] || 0) + 1), m), {});
  const itens = Object.entries(cont).map(([id, qty]) => ({
    id: Number(id),
    qty,
  }));

  let total = 0;

  itens.forEach(({ id, qty }) => {
    const p = produtos.find((x) => x.id === id);
    if (!p) return;

    const art = document.createElement("article");

    const h3 = document.createElement("h3");
    h3.textContent = p.title;

    const img = document.createElement("img");
    img.src = imgUrl(p.image);
    img.alt = p.title;

    const preco = document.createElement("p");
    preco.textContent = `Custo total: ${eur(p.price * qty)}`;

    const meta = document.createElement("p");
    meta.textContent = `Qtd: ${qty}`;

    const menos = document.createElement("button");
    menos.textContent = "–";

    const mais = document.createElement("button");
    mais.textContent = "+";

    const rm = document.createElement("button");
    rm.textContent = "– Remover do Cesto";

    menos.addEventListener("click", () => {
      const a = lerCarrinho();
      const i = a.indexOf(id);
      guardarUndo();

      if (i > -1) {
        a.splice(i, 1);
        gravarCarrinho(a);
        renderCesto();
      }
    });

    mais.addEventListener("click", () => {
      const a = lerCarrinho();
      guardarUndo();

      a.push(id);
      gravarCarrinho(a);
      renderCesto();
    });

    rm.addEventListener("click", () => {
      guardarUndo();

      const a = lerCarrinho().filter((x) => x !== id);
      gravarCarrinho(a);
      renderCesto();
    });

    art.append(h3, img, preco, meta, menos, mais, rm);
    pai.append(art);

    total += p.price * qty;
  });

  document.querySelector("#total").textContent = eur(total);
}

// ===========================
//  Checkout (POST /buy/) com async/await
// ===========================


function toText(v) {
  if (v === null || v === undefined) return "";
  if (typeof v === "string") return v;
  if (typeof v === "number" || typeof v === "boolean") return String(v);

  if (Array.isArray(v)) {
    return v.map(toText).filter(Boolean).join(" | ");
  }

  if (typeof v === "object") {
    if (typeof v.msg === "string") return v.msg;
    if (typeof v.message === "string") return v.message;
    return JSON.stringify(v);
  }

  return String(v);
}

function getApiError(data, status) {
  if (!data) return `Erro HTTP ${status}`;

  if (data.error) return toText(data.error);

  // FastAPI / Pydantic costuma usar "detail"
  if (data.detail) {
    if (Array.isArray(data.detail)) {
      return data.detail.map((x) => x?.msg ?? JSON.stringify(x)).join(" | ");
    }
    return toText(data.detail);
  }

  if (data.message) return toText(data.message);

  return `Erro HTTP ${status}`;
}

async function comprar() {
  const msgEl = document.querySelector("#msg");
  msgEl.textContent = "";

  const name = document.querySelector("#name").value.trim();
  if (!name) {
    msgEl.textContent = "Tens de indicar o teu nome.";
    return;
  }

  const body = {
    products: lerCarrinho(),
    student: document.querySelector("#student").checked,
    coupon: document.querySelector("#coupon").value.trim(),
    name: name
  };

  try {
    const r = await fetch(`${BASE}/buy/`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Accept": "application/json" },
      body: JSON.stringify(body)
    });

    const data = await r.json();

    if (!r.ok || data.error) {
      msgEl.textContent = data.error || `Erro HTTP ${r.status}`;
      return;
    }

    document.querySelector("#final").textContent =
      `Valor final a pagar (com eventuais descontos): ${eur(Number(data.totalCost))}`;

    document.querySelector("#ref").textContent =
      `Referência de pagamento: ${data.reference}`;

    // ✅ a API usa "message"
    msgEl.textContent = data.message || "";
  } catch (e) {
    msgEl.textContent = "Falha na ligação.";
  }
}



// ===========================
//  Arranque + listeners
// ===========================
document.addEventListener("DOMContentLoaded", async () => {
  // impedir submit do form ao carregar Enter na pesquisa
  document.querySelector("#toolbar").addEventListener("submit", (e) => e.preventDefault());

  // listeners dos filtros
  document.querySelector("#filtro").addEventListener("change", aplicarFiltrosOrdenacaoPesquisa);
  document.querySelector("#ordem").addEventListener("change", aplicarFiltrosOrdenacaoPesquisa);
  document.querySelector("#pesquisa").addEventListener("input", aplicarFiltrosOrdenacaoPesquisa);

  // LISTENER que faltava (Adicionar ao Cesto)
  document.querySelector("#lista-produtos").addEventListener("click", onListaProdutosClick);

  // LISTENER do Comprar que faltava
  document.querySelector("#buy").addEventListener("click", comprar);

  //botao limpar cesto
  const clearBtn = document.querySelector("#clear");
  if(clearBtn) clearBtn.addEventListener("click", ()=> {
    gravarCarrinho([]);
      renderCesto();
    

  });

  await carregarCategorias();
  await carregarProdutos();
});
