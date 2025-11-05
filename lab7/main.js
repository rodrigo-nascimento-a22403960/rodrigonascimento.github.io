// ===========================
//  Constantes e “estado”
// ===========================

// URL base da API pública (endpoints: /categories/, /products/, /buy/)
const BASE   = 'https://deisishop.pythonanywhere.com';

// Chave que vamos usar no localStorage para guardar os IDs do cesto
const LS_KEY = 'produtos-selecionados-ids';

// Array em memória com TODOS os produtos vindos da API (/products/)
// (Usamos isto para filtrar/ordenar/pesquisar sem voltar a pedir à API)
let produtos = [];


// ===========================
//  Utilitários (helpers)
// ===========================

// Lê do localStorage a lista de IDs colocados no cesto.
// Se a chave não existir, devolve um array vazio "[]".
function lerCarrinho() {
  return JSON.parse(localStorage.getItem(LS_KEY) || '[]');
}

// Guarda no localStorage a lista de IDs do cesto (serializada em JSON).
function gravarCarrinho(a) {
  localStorage.setItem(LS_KEY, JSON.stringify(a));
}

// Formata um número em euros com 2 casas decimais e vírgula como separador.
function eur(n) {
  return `${Number(n).toFixed(2).replace('.', ',')} €`;
}


// ===========================
//  Feedback de “carregar…”
// ===========================

// Mostra/oculta um pequeno estado de “A carregar…” na grelha de produtos.
function setLoadingProdutos(on = true) {
  const pai = document.querySelector('#lista-produtos'); // nó “pai” da grelha
  pai.textContent = on ? 'A carregar…' : '';
}


// ===========================
//  Dados de apoio (categorias)
// ===========================

// Pede as categorias à API e preenche o <select id="filtro">.
// Mantemos sempre a primeira opção “Todas as categorias”.
function carregarCategorias() {
  const sel = document.querySelector('#filtro');
  sel.innerHTML = '<option value="">Todas as categorias</option>';

  fetch(`${BASE}/categories/`)
    .then(r => r.json())              // converte resposta em JSON (array de strings)
    .then(arr => {
      arr.forEach(c => {              // cria <option> por cada categoria
        const o = document.createElement('option');
        o.value = c;
        o.textContent = c;
        sel.append(o);
      });
    })
    .catch(() => {
      // Em caso de falha, mantemos o select com a opção padrão.
      // (Poderias também mostrar uma mensagem ao utilizador, se quiseres.)
    });
}


// ===========================
//  Dados principais (produtos)
// ===========================

// Pede os produtos à API e guarda em memória (variável global `produtos`).
// Depois aplica filtros/ordenção/pesquisa e atualiza o cesto.
function carregarProdutos() {
  setLoadingProdutos(true); // mostra “A carregar…”

  fetch(`${BASE}/products/`)
    .then(r => r.ok ? r.json() : Promise.reject(r)) // valida HTTP 200..299
    .then(arr => {
      produtos = arr;                         // cache local para trabalhar em client-side
      aplicarFiltrosOrdenacaoPesquisa();      // mostra lista (filtrada/ordenada/pesquisada)
      renderCesto();                          // e também atualiza o cesto (preços/quantidades)
    })
    .catch(() => {
      // Se a API falhar, informamos o utilizador na área de produtos.
      const pai = document.querySelector('#lista-produtos');
      pai.textContent = 'Falha a obter produtos da API.';
    })
    .finally(() => setLoadingProdutos(false)); // remove “A carregar…”
}


// =====================================================
//  Filtro + Ordenação + Pesquisa (apenas no lado do cliente)
// =====================================================

function aplicarFiltrosOrdenacaoPesquisa() {
  // 1) Ler valores dos controlos da barra (selects e input)
  const cat = document.querySelector('#filtro').value;        // categoria
  const ord = document.querySelector('#ordem').value;         // critério de ordenação
  const q   = document.querySelector('#pesquisa').value       // termo de pesquisa
                    .toLowerCase().trim();

  // 2) Começamos de uma cópia dos produtos originais (para não mutar o array global)
  let lista = produtos.slice();

  // 3) Filtro por categoria (se houver)
  if (cat) lista = lista.filter(p => p.category === cat);

  // 4) Pesquisa por texto em título + descrição (case-insensitive)
  if (q)   lista = lista.filter(p => (p.title + ' ' + p.description).toLowerCase().includes(q));

  // 5) Ordenação (mutável sobre a lista filtrada)
  if (ord === 'preco-desc') lista.sort((a, b) => b.price - a.price);
  if (ord === 'preco-asc')  lista.sort((a, b) => a.price - b.price);
  if (ord === 'titulo-asc') lista.sort((a, b) => a.title.localeCompare(b.title, 'pt'));

  // 6) Render final na grelha
  renderProdutos(lista);
}


// =======================================
//  Renderização da grelha de produtos
// =======================================

function renderProdutos(arr) {
  const pai = document.querySelector('#lista-produtos');
  pai.textContent = ''; // limpa o conteúdo atual

  // cria um <article> por produto com imagem, título, preço, descrição, rating e botão
  arr.forEach(p => {
    const art   = document.createElement('article');

    const h3    = document.createElement('h3');  h3.textContent = p.title;
    const img   = document.createElement('img'); img.src = p.image; img.alt = p.title;
    const preco = document.createElement('p');   preco.textContent = `Custo total: ${eur(p.price)}`;
    const desc  = document.createElement('p');   desc.textContent  = p.description;
    const info  = document.createElement('p');   // mostra categoria e rating (se existir)
    info.textContent = `Categoria: ${p.category} • ⭐ ${p.rating?.rate ?? '-'}`;

    const btn   = document.createElement('button');
    btn.textContent = '+ Adicionar ao Cesto';
    btn.addEventListener('click', () => {
      // Lógica do “Adicionar”: lemos os IDs atuais, juntamos o id do produto e gravamos.
      const ids = lerCarrinho();
      ids.push(p.id);
      gravarCarrinho(ids);
      renderCesto(); // atualizamos imediatamente o cesto na UI
    });

    art.append(h3, img, preco, desc, info, btn);
    pai.append(art);
  });
}


// =======================================
//  Renderização do CESTO (localStorage)
// =======================================

function renderCesto() {
  const pai = document.querySelector('#lista-cesto');
  pai.textContent = ''; // limpa a grelha do cesto

  const ids = lerCarrinho(); // array de IDs (pode conter repetidos)
  if (!ids.length) {
    // Estado vazio do cesto
    const p = document.createElement('p');
    p.textContent = 'Nada no cesto.';
    p.style.gridColumn = '1 / -1'; // ocupa a largura toda da grelha
    pai.append(p);

    // Zera os totais/mensagens do checkout
    document.querySelector('#total').textContent  = '0,00 €';
    document.querySelector('#final').textContent  = 'Valor final a pagar (com eventuais descontos): 0,00 €';
    document.querySelector('#ref').textContent    = 'Referência de pagamento: —';
    document.querySelector('#msg').textContent    = '';
    return;
  }

  // Agrupa os IDs iguais para obter quantidades por produto:
  // cont = { '3': 2, '7': 1, ... }
  const cont = ids.reduce((m, id) => (m[id] = (m[id] || 0) + 1, m), {});
  let total = 0; // acumulador do custo total

  // Para cada (id, quantidade) cria um card no cesto
  Object.entries(cont).forEach(([id, qty]) => {
    // Encontrar o objeto produto (a partir do array `produtos` carregado da API)
    const p = produtos.find(x => x.id === Number(id));

    // Elementos do card
    const art   = document.createElement('article');
    const h3    = document.createElement('h3'); h3.textContent = p.title;
    const img   = document.createElement('img'); img.src = p.image; img.alt = p.title;
    const preco = document.createElement('p');  preco.textContent = `Custo total: ${eur(p.price * qty)}`;
    const meta  = document.createElement('p');  meta.textContent  = `Qtd: ${qty}`;

    // Botões de quantidade e remoção
    const menos = document.createElement('button'); menos.textContent = '–';
    const mais  = document.createElement('button'); mais.textContent  = '+';
    const rm    = document.createElement('button'); rm.textContent   = '– Remover do Cesto';

    // “–” remove UMA unidade (primeira ocorrência desse id)
    menos.addEventListener('click', () => {
      const a = lerCarrinho();
      const i = a.indexOf(Number(id));
      if (i > -1) {
        a.splice(i, 1);
        gravarCarrinho(a);
        renderCesto();
      }
    });

    // “+” adiciona MAIS uma unidade
    mais.addEventListener('click', () => {
      const a = lerCarrinho();
      a.push(Number(id));
      gravarCarrinho(a);
      renderCesto();
    });

    // “Remover do Cesto” elimina TODAS as unidades desse produto
    rm.addEventListener('click', () => {
      const a = lerCarrinho().filter(x => x !== Number(id));
      gravarCarrinho(a);
      renderCesto();
    });

    // Monta o card e adiciona ao cesto
    art.append(h3, img, preco, meta, menos, mais, rm);
    pai.append(art);

    // Atualiza total
    total += p.price * qty;
  });

  // Mostra o total acumulado na área do cesto
  document.querySelector('#total').textContent = eur(total);
}


// =======================================
//  Checkout (POST /buy/)
// =======================================

function comprar() {
  // Corpo do pedido (conforme documentação da API):
  // - products: array de IDs (do localStorage)
  // - student : boolean (checkbox)
  // - coupon  : string (texto do cupão)
  const body = {
    products: lerCarrinho(),
    student : document.querySelector('#student').checked,
    coupon  : document.querySelector('#coupon').value.trim()
  };

  // Envio do POST com JSON. Aceitamos e pedimos JSON (“Accept”).
  fetch(`${BASE}/buy/`, {
    method : 'POST',
    headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
    body   : JSON.stringify(body)
  })
  // Transformamos a resposta em { ok, status, data } para tratar erros uniformemente
  .then(r => r.json().then(d => ({ ok: r.ok, status: r.status, data: d })))
  .then(({ ok, status, data }) => {
    // Em caso de erro da API (ex.: sem produtos, cupão inválido, etc.)
    if (!ok || data.error) {
      document.querySelector('#msg').textContent =
        data.error || `Erro HTTP ${status}`;
      return;
    }

    // Sucesso: a API devolve totalCost (string), reference e uma mensagem “example”
    document.querySelector('#final').textContent =
      `Valor final a pagar (com eventuais descontos): ${eur(Number(data.totalCost))}`;
    document.querySelector('#ref').textContent =
      `Referência de pagamento: ${data.reference} €`;
    document.querySelector('#msg').textContent = data.example || '';
  })
  .catch(() => {
    // Falha de rede/ligação
    document.querySelector('#msg').textContent = 'Falha na ligação.';
  });
}


// =======================================
//  Ligação de eventos e arranque da app
// =======================================

document.addEventListener('DOMContentLoaded', () => {
  // 1) Povoar filtro de categorias e carregar a lista de produtos
  carregarCategorias();
  carregarProdutos();

  // 2) Ligar controlos da barra à função de atualização da lista
  document.querySelector('#filtro')  .addEventListener('change', aplicarFiltrosOrdenacaoPesquisa);
  document.querySelector('#ordem')   .addEventListener('change', aplicarFiltrosOrdenacaoPesquisa);
  document.querySelector('#pesquisa').addEventListener('input',  aplicarFiltrosOrdenacaoPesquisa);

  // 3) Botão de compra (checkout)
  document.querySelector('#buy').addEventListener('click', comprar);
});
