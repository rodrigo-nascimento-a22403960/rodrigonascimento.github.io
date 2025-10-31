const LS_KEY = 'produtos-selecionados';

if (!localStorage.getItem(LS_KEY)) {
  localStorage.setItem(LS_KEY, JSON.stringify([]));
}

document.addEventListener('DOMContentLoaded', () => {
  carregarProdutos(produtos);
  atualizaCesto();
});

function carregarProdutos(listaProdutos){
  const contentor = document.querySelector('#lista-produtos');
  contentor.textContent = '';
  listaProdutos.forEach(prod => {
    const artigo = criarProduto(prod);
    contentor.append(artigo);
  });
}

function criarProduto(produto){
  const art = document.createElement('article');

  const h3 = document.createElement('h3');
  h3.textContent = produto.title;

  const img = document.createElement('img');
  img.src = produto.image;
  img.alt = produto.title;

  const preco = document.createElement('p');
  preco.textContent = `Custo total: ${eu(produto.price)}`;

  const desc = document.createElement('p');
  desc.textContent = produto.description;

  const small = document.createElement('p');
  small.textContent = `Categoria: ${produto.category} • ⭐ ${produto.rating?.rate ?? '-'}`;

  const btn = document.createElement('button');
  btn.textContent = '+ Adicionar ao Cesto';
  btn.addEventListener('click', () => {
    const lista = lerLS();
    lista.push(produto);
    gravarLS(lista);
    atualizaCesto();
  });

  art.append(h3, img, preco, desc, small, btn);
  return art;
}

function atualizaCesto(){
  const contentor = document.querySelector('#lista-cesto');
  contentor.textContent = '';

  const lista = lerLS();

  if (lista.length === 0) {
    const vazio = document.createElement('p');
    vazio.textContent = 'Nada no cesto.';
    vazio.style.gridColumn = '1 / -1';
    contentor.append(vazio);
    document.querySelector('#total').textContent = '0,00 €';
    return;
  }

  lista.forEach(prod => {
    const artigo = criaProdutoCesto(prod);
    contentor.append(artigo);
  });

  const total = lista.reduce((acc,p) => acc + Number(p.price), 0);
  document.querySelector('#total').textContent = eu(total);
}

function criaProdutoCesto(produto){
  const art = document.createElement('article');

  const h3 = document.createElement('h3');
  h3.textContent = produto.title;

  const img = document.createElement('img');
  img.src = produto.image;
  img.alt = produto.title;

  const preco = document.createElement('p');
  preco.textContent = `Custo total: ${eu(produto.price)}`;

  const btn = document.createElement('button');
  btn.textContent = '– Remover do Cesto';
  btn.addEventListener('click', () => {
    const lista = lerLS();
    const idx = lista.findIndex(p => p.id === produto.id);
    if (idx !== -1) {
      lista.splice(idx,1);
      gravarLS(lista);
      atualizaCesto();
    }
  });

  art.append(h3, img, preco, btn);
  return art;
}

function lerLS(){
  return JSON.parse(localStorage.getItem(LS_KEY) || '[]');
}
function gravarLS(lista){
  localStorage.setItem(LS_KEY, JSON.stringify(lista));
}
function eu(n){
  return `${Number(n).toFixed(2).replace('.', ',')} €`;
}
