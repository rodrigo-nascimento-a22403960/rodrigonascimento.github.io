const BASE   = 'https://deisishop.pythonanywhere.com';
const LS_KEY = 'produtos-selecionados-ids';
let produtos = [];

/* localStorage helpers */
function lerCarrinho(){ return JSON.parse(localStorage.getItem(LS_KEY) || '[]'); }
function gravarCarrinho(a){ localStorage.setItem(LS_KEY, JSON.stringify(a)); }
function eur(n){ return `${Number(n).toFixed(2).replace('.', ',')} €`; }

/* UI helpers */
function setLoadingProdutos(on=true){
  const pai = document.querySelector('#lista-produtos');
  pai.textContent = on ? 'A carregar…' : '';
}

/* API: categorias */
function carregarCategorias(){
  const sel = document.querySelector('#filtro');
  sel.innerHTML = '<option value="">Todas as categorias</option>';
  fetch(`${BASE}/categories/`)
    .then(r=>r.json())
    .then(arr=>{
      arr.forEach(c=>{
        const o=document.createElement('option');
        o.value=c; o.textContent=c;
        sel.append(o);
      });
    })
    .catch(()=>{  });
}

/* API: produtos */
function carregarProdutos(){
  setLoadingProdutos(true);
  fetch(`${BASE}/products/`)
    .then(r=>r.ok ? r.json() : Promise.reject(r))
    .then(arr=>{ produtos = arr; aplicarFiltrosOrdenacaoPesquisa(); renderCesto(); })
    .catch(()=>{ const pai=document.querySelector('#lista-produtos'); pai.textContent='Falha a obter produtos da API.'; })
    .finally(()=> setLoadingProdutos(false));
}

/* filtros, ordenação, pesquisa */
function aplicarFiltrosOrdenacaoPesquisa(){
  const cat = document.querySelector('#filtro').value;
  const ord = document.querySelector('#ordem').value;
  const q   = document.querySelector('#pesquisa').value.toLowerCase().trim();

  let lista = produtos.slice();
  if (cat) lista = lista.filter(p=>p.category===cat);
  if (q)   lista = lista.filter(p=>(p.title+' '+p.description).toLowerCase().includes(q));

  if (ord==='preco-desc') lista.sort((a,b)=>b.price-a.price);
  if (ord==='preco-asc')  lista.sort((a,b)=>a.price-b.price);
  if (ord==='titulo-asc') lista.sort((a,b)=>a.title.localeCompare(b.title,'pt'));

  renderProdutos(lista);
}

/* render lista de produtos */
function renderProdutos(arr){
  const pai = document.querySelector('#lista-produtos');
  pai.textContent = '';

  arr.forEach(p=>{
    const art = document.createElement('article');

    const h3  = document.createElement('h3');  h3.textContent = p.title;
    const img = document.createElement('img');  img.src = p.image; img.alt = p.title;
    const preco = document.createElement('p');  preco.textContent = `Custo total: ${eur(p.price)}`;
    const desc  = document.createElement('p');  desc.textContent  = p.description;
    const info  = document.createElement('p');  info.textContent  = `Categoria: ${p.category} • ⭐ ${p.rating?.rate ?? '-'}`;

    const btn = document.createElement('button');
    btn.textContent = '+ Adicionar ao Cesto';
    btn.addEventListener('click',()=>{
      const ids = lerCarrinho(); ids.push(p.id);
      gravarCarrinho(ids); renderCesto();
    });

    art.append(h3,img,preco,desc,info,btn);
    pai.append(art);
  });
}

/* render cesto */
function renderCesto(){
  const pai = document.querySelector('#lista-cesto');
  pai.textContent = '';

  const ids = lerCarrinho();
  if(!ids.length){
    const p=document.createElement('p');
    p.textContent='Nada no cesto.'; p.style.gridColumn='1 / -1';
    pai.append(p);
    document.querySelector('#total').textContent='0,00 €';
    document.querySelector('#final').textContent='Valor final a pagar (com eventuais descontos): 0,00 €';
    document.querySelector('#ref').textContent='Referência de pagamento: —';
    document.querySelector('#msg').textContent='';
    return;
  }

  const cont = ids.reduce((m,id)=>(m[id]=(m[id]||0)+1,m),{});
  let total=0;

  Object.entries(cont).forEach(([id,qty])=>{
    const p = produtos.find(x=>x.id===Number(id));

    const art = document.createElement('article');
    const h3  = document.createElement('h3'); h3.textContent=p.title;
    const img = document.createElement('img'); img.src=p.image; img.alt=p.title;
    const preco = document.createElement('p'); preco.textContent=`Custo total: ${eur(p.price*qty)}`;
    const meta  = document.createElement('p'); meta.textContent = `Qtd: ${qty}`;

    const menos=document.createElement('button'); menos.textContent='–';
    const mais =document.createElement('button'); mais.textContent='+';
    const rm   =document.createElement('button'); rm.textContent='– Remover do Cesto';

    menos.addEventListener('click',()=>{ const a=lerCarrinho(); const i=a.indexOf(Number(id)); if(i>-1){a.splice(i,1); gravarCarrinho(a); renderCesto();} });
    mais.addEventListener('click',()=>{ const a=lerCarrinho(); a.push(Number(id)); gravarCarrinho(a); renderCesto(); });
    rm.addEventListener('click',()=>{ const a=lerCarrinho().filter(x=>x!==Number(id)); gravarCarrinho(a); renderCesto(); });

    art.append(h3,img,preco,meta,menos,mais,rm);
    pai.append(art);

    total += p.price*qty;
  });

  document.querySelector('#total').textContent = eur(total);
}

/* checkout: POST /buy/ */
function comprar(){
  const body = {
    products: lerCarrinho(),
    student:  document.querySelector('#student').checked,
    coupon:   document.querySelector('#coupon').value.trim()
  };

  fetch(`${BASE}/buy/`, {
    method:'POST',
    headers:{'Content-Type':'application/json','Accept':'application/json'},
    body: JSON.stringify(body)
  })
  .then(r=>r.json().then(d=>({ok:r.ok,status:r.status,data:d})))
  .then(({ok,status,data})=>{
    if(!ok || data.error){
      document.querySelector('#msg').textContent = data.error || `Erro HTTP ${status}`;
      return;
    }
    document.querySelector('#final').textContent =
      `Valor final a pagar (com eventuais descontos): ${eur(Number(data.totalCost))}`;
    document.querySelector('#ref').textContent = `Referência de pagamento: ${data.reference} €`;
    document.querySelector('#msg').textContent = data.example || '';
  })
  .catch(()=>{ document.querySelector('#msg').textContent='Falha na ligação.'; });
}

/* wire-up */
document.addEventListener('DOMContentLoaded', ()=>{


  carregarCategorias();
  carregarProdutos();


  document.querySelector('#filtro').addEventListener('change', aplicarFiltrosOrdenacaoPesquisa);
  document.querySelector('#ordem').addEventListener('change', aplicarFiltrosOrdenacaoPesquisa);
  document.querySelector('#pesquisa').addEventListener('input', aplicarFiltrosOrdenacaoPesquisa);
  document.querySelector('#buy').addEventListener('click', comprar);
});
