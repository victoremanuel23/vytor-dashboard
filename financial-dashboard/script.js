// Referências
const formVenda = document.getElementById('formVenda');
const totalVendasEl = document.getElementById('totalVendas');
const receitaTotalEl = document.getElementById('receitaTotal');
const produtosVendidosEl = document.getElementById('produtosVendidos');
const toggleTemaBtn = document.getElementById('toggleTema');
const exportarPdfBtn = document.getElementById('exportarPdf');
const ctx = document.getElementById('graficoVendas').getContext('2d');

let vendas = [];
let grafico = null;

// Função para atualizar o dashboard e gráfico
function atualizarDashboard() {
  const totalVendas = vendas.length;
  const receitaTotal = vendas.reduce((acc, v) => acc + v.quantidade * v.preco, 0);
  const produtosVendidos = vendas.reduce((acc, v) => acc + v.quantidade, 0);

  totalVendasEl.textContent = totalVendas;
  receitaTotalEl.textContent = receitaTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  produtosVendidosEl.textContent = produtosVendidos;

  // Agrupar receita por produto
  const agrupado = {};
  vendas.forEach(v => {
    agrupado[v.produto] = (agrupado[v.produto] || 0) + v.quantidade * v.preco;
  });

  const labels = Object.keys(agrupado);
  const data = Object.values(agrupado);

  // Destruir gráfico antigo se existir
  if (grafico) grafico.destroy();

  // Criar gradiente para as barras
  const gradient = ctx.createLinearGradient(0, 0, 0, ctx.canvas.height);
  gradient.addColorStop(0, '#42a5f5');
  gradient.addColorStop(1, '#1e88e5');

  // Detectar tema para cores do gráfico
  const isLightMode = document.documentElement.classList.contains('light-mode');
  const textColor = isLightMode ? '#222' : '#eee';
  const datalabelColor = isLightMode ? '#111' : '#fff';

  grafico = new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [{
        label: 'Receita por Produto (R$)',
        data,
        backgroundColor: gradient,
        borderRadius: 10,
        barPercentage: 0.6
      }]
    },
    options: {
      responsive: true,
      scales: {
        x: {
          ticks: {
            color: textColor,
            font: { weight: 'bold' }
          },
          grid: { color: 'rgba(200,200,200,0.1)' }
        },
        y: {
          beginAtZero: true,
          ticks: {
            color: textColor,
            callback: value => `R$ ${value}`
          },
          grid: { color: 'rgba(200,200,200,0.1)' }
        }
      },
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: ctx => `R$ ${ctx.parsed.y.toFixed(2)}`
          }
        },
        datalabels: {
          color: datalabelColor,
          anchor: 'end',
          align: 'top',
          formatter: value => `R$ ${value.toFixed(2)}`,
          font: { weight: 'bold' }
        }
      }
    },
    plugins: [ChartDataLabels]
  });
}

// Evento do formulário de venda
formVenda.addEventListener('submit', e => {
  e.preventDefault();
  const produto = document.getElementById('produto').value.trim();
  const quantidade = Number(document.getElementById('quantidade').value);
  const preco = Number(document.getElementById('preco').value);

  if (!produto || quantidade <= 0 || preco <= 0) return;

  vendas.push({ produto, quantidade, preco });

  formVenda.reset();
  atualizarDashboard();
});

// Alternar tema claro/escuro na tag <html>
toggleTemaBtn.addEventListener('click', () => {
  document.documentElement.classList.toggle('light-mode');
  atualizarDashboard(); // Atualiza cores do gráfico
});

// Exportar PDF da nota fiscal
exportarPdfBtn.addEventListener('click', () => {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();

  // Cabeçalho
  doc.setFontSize(18);
  doc.text('NOTA FISCAL DE VENDAS', 105, 15, null, null, 'center');

  doc.setFontSize(12);
  doc.text('VYTOR Plataforma', 105, 25, null, null, 'center');
  doc.text(`Data: ${new Date().toLocaleDateString('pt-BR')}`, 105, 32, null, null, 'center');

  // Linha separadora
  doc.setLineWidth(0.5);
  doc.line(10, 38, 200, 38);

  // Cabeçalho da tabela
  doc.setFontSize(11);
  doc.text('Produto', 15, 48);
  doc.text('Qtd', 90, 48, null, null, 'right');
  doc.text('Preço Unit.', 130, 48, null, null, 'right');
  doc.text('Subtotal', 190, 48, null, null, 'right');

  // Linha da tabela
  doc.setLineWidth(0.2);
  doc.line(10, 50, 200, 50);

  // Conteúdo da tabela
  let posY = 58;
  const linhaMax = 270;
  vendas.forEach(v => {
    const subtotal = v.quantidade * v.preco;

    if (posY > linhaMax) {
      doc.addPage();
      posY = 20;

      // Repetir cabeçalho da tabela na nova página
      doc.setFontSize(11);
      doc.text('Produto', 15, posY);
      doc.text('Qtd', 90, posY, null, null, 'right');
      doc.text('Preço Unit.', 130, posY, null, null, 'right');
      doc.text('Subtotal', 190, posY, null, null, 'right');
      doc.line(10, posY + 2, 200, posY + 2);
      posY += 10;
    }

    doc.setFontSize(11);
    doc.text(v.produto, 15, posY);
    doc.text(v.quantidade.toString(), 90, posY, null, null, 'right');
    doc.text(`R$ ${v.preco.toFixed(2)}`, 130, posY, null, null, 'right');
    doc.text(`R$ ${subtotal.toFixed(2)}`, 190, posY, null, null, 'right');

    posY += 10;
  });

  // Linha final da tabela
  doc.setLineWidth(0.5);
  doc.line(10, posY - 5, 200, posY - 5);

  // Total geral
  const receitaTotal = vendas.reduce((acc, v) => acc + v.quantidade * v.preco, 0);
  doc.setFontSize(13);
  doc.text('Total:', 135, posY + 12);
  doc.text(`R$ ${receitaTotal.toFixed(2)}`, 190, posY + 12, null, null, 'right');

  // Rodapé
  doc.setFontSize(9);
  doc.setTextColor('#555');
  doc.text('Obrigado pela preferência! VYTOR Plataforma', 105, 290, null, null, 'center');

  // Salvar PDF
  doc.save(`nota_fiscal_${new Date().toISOString().slice(0, 10)}.pdf`);
});

// Atualiza dashboard ao carregar
atualizarDashboard();
