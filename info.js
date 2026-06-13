// Escuta o evento de ativação da aba para carregar os dados
// Usamos delegação de evento no documento para garantir que funcione após o fetch do HTML
document.addEventListener('abaAtivada', (e) => {
    if (e.target.id === 'aba-info') {
        carregarCotacoes();
    }
    if (e.target.id === 'aba-acoes') {
        carregarDadosAcoes();
    }
});

async function carregarDadosAcoes() {
    const corpoTabela = document.getElementById('acoes-table-body');
    const spanData = document.getElementById('data-acoes-update');
    const btn = document.querySelector('.btn-refresh-data');
    
    if (!corpoTabela) return;

    try {
        if (btn) { btn.disabled = true; btn.innerHTML = '<span>⌛</span> Carregando...'; }
        corpoTabela.innerHTML = '<tr><td colspan="5" class="loading-row">Buscando dados do mercado...</td></tr>';

        // Brapi.dev - PETR4, MGLU3, VALE3 e ITUB4
        const response = await fetch(`https://brapi.dev/api/quote/PETR4,MGLU3,VALE3,ITUB4`); 

        if (!response.ok) throw new Error(`Erro na API: ${response.status}`);

        const data = await response.json();

        if (!data || !data.results || data.results.length === 0) {
            throw new Error('Nenhum dado retornado.');
        }

        let html = '';
        data.results.forEach(acao => {
            const preco = acao.regularMarketPrice || 0;
            const variacaoPct = acao.regularMarketChangePercent || 0;
            const variacaoReal = acao.regularMarketChange || 0;
            const volume = acao.regularMarketVolume || 0;
            const classeVar = variacaoPct >= 0 ? 'subida' : 'descida';
            const nomeEmpresa = acao.longName || acao.shortName || '';

            html += `
                <tr>
                    <td>
                        <div style="display:flex; align-items:center; gap:8px;">
                            <img src="${acao.logourl}" width="24" height="24" style="border-radius:4px;" onerror="this.style.display='none'">
                            <div style="display:flex; flex-direction:column;">
                                <strong>${acao.symbol}</strong>
                                <small style="font-size:0.75em; color:#64748b;" class="hide-mobile">${nomeEmpresa}</small>
                            </div>
                        </div>
                    </td>
                    <td>R$ ${preco.toFixed(2)}</td>
                    <td><span class="badge-variacao ${classeVar}">${(variacaoPct > 0 ? '+' : '') + variacaoPct.toFixed(2)}%</span></td>
                    <td class="${classeVar}">${(variacaoReal > 0 ? '+' : '') + variacaoReal.toFixed(2)}</td>
                    <td>${(volume / 1000000).toFixed(1)}M</td>
                </tr>
            `;
        });

        corpoTabela.innerHTML = html;
        spanData.innerText = new Date().toLocaleString('pt-BR');

    } catch (error) {
        console.error("Erro Ações API:", error);
        let mensagemErro = "Erro ao conectar com a API.";
        
        corpoTabela.innerHTML = `<tr><td colspan="5" class="loading-row" style="color:red">${mensagemErro}</td></tr>`;
    } finally {
        if (btn) { btn.disabled = false; btn.innerHTML = '<span>🔄</span> Atualizar Ações'; }
    }
}

async function carregarCotacoes(dias = 7) {
    // Atualiza estado visual dos botões de período
    const botoes = document.querySelectorAll('.btn-periodo');
    botoes.forEach(btn => {
        btn.classList.toggle('active', parseInt(btn.getAttribute('data-dias')) === dias);
    });

    // Atualiza SELIC e CDI com os valores já obtidos pelo simulador (window.taxaSelicAtual)
    const infoSelic = document.getElementById('info-selic');
    const infoCdi = document.getElementById('info-cdi');
    if (window.taxaSelicAtual && infoSelic && infoCdi) {
        infoSelic.innerText = window.taxaSelicAtual.toFixed(2).replace('.', ',') + '% a.a.';
        infoCdi.innerText = (window.taxaSelicAtual - 0.1).toFixed(2).replace('.', ',') + '% a.a.';
    }

    // Busca IPCA acumulado 12 meses (SGS 13522)
    try {
        const resIpca = await fetch('https://api.bcb.gov.br/dados/serie/bcdata.sgs.13522/dados/ultimos/1?formato=json');
        const dataIpca = await resIpca.json();
        const infoIpca = document.getElementById('info-ipca');
        if (dataIpca && dataIpca[0] && infoIpca) {
            infoIpca.innerText = parseFloat(dataIpca[0].valor).toFixed(2).replace('.', ',') + '% (12m)';
        }
    } catch (error) {
        console.error("Erro ao buscar IPCA:", error);
    }

    // Busca IGP-M acumulado 12 meses (SGS 7306)
    try {
        const resIgpm = await fetch('https://api.bcb.gov.br/dados/serie/bcdata.sgs.7306/dados/ultimos/1?formato=json');
        const dataIgpm = await resIgpm.json();
        const infoIgpm = document.getElementById('info-igpm');
        if (dataIgpm && dataIgpm[0] && infoIgpm) {
            const valorIgpm = parseFloat(dataIgpm[0].valor);
            const taxaFormatada = valorIgpm.toFixed(2).replace('.', ',') + '%';
            infoIgpm.innerText = taxaFormatada + ' (12m)';

            // Atualiza o exemplo de reajuste de aluguel
            const containerEx = document.getElementById('container-exemplo-igpm');
            const exTaxa = document.getElementById('ex-igpm-taxa');
            const exFator = document.getElementById('ex-igpm-fator');
            const exResultado = document.getElementById('ex-igpm-resultado');

            if (containerEx && exTaxa && exFator && exResultado) {
                const aluguelBase = 2000;
                const fator = valorIgpm / 100;
                const novoAluguel = aluguelBase * (1 + fator);

                exTaxa.innerText = taxaFormatada;
                exFator.innerText = fator.toFixed(4).replace('.', ',');
                exResultado.innerText = novoAluguel.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
                containerEx.style.display = 'block';
            }
        }
    } catch (error) {
        console.error("Erro ao buscar IGP-M:", error);
    }

    try {
        // Cotação Atual
        const resAtual = await fetch('https://economia.awesomeapi.com.br/last/USD-BRL,BTC-BRL,EUR-BRL');
        const dataAtual = await resAtual.json();
        
        const atualizarCard = (prefix, data) => {
            const valEl = document.getElementById(`${prefix}-val`);
            const pctEl = document.getElementById(`${prefix}-pct`);
            if (valEl && data) {
                valEl.innerText = parseFloat(data.bid).toLocaleString('pt-BR', { 
                    style: 'currency', 
                    currency: 'BRL' 
                });
                if (pctEl) {
                    const pct = parseFloat(data.pctChange);
                    pctEl.innerText = (pct > 0 ? '+' : '') + pct.toFixed(2) + '%';
                    pctEl.className = `cotacao-variacao ${pct >= 0 ? 'subida' : 'descida'}`;
                }
            }
        };

        atualizarCard('usd', dataAtual.USDBRL);
        atualizarCard('eur', dataAtual.EURBRL);
        atualizarCard('btc', dataAtual.BTCBRL);

        // Histórico de 7 dias para o gráfico
        const canvasUSD = document.getElementById('graficoUSDHist');
        const canvasEUR = document.getElementById('graficoEURHist');
        const canvasBTC = document.getElementById('graficoBTCHist');

        if (canvasUSD && canvasEUR && canvasBTC) {
            const [resUSD, resEUR, resBTC] = await Promise.all([
                fetch(`https://economia.awesomeapi.com.br/json/daily/USD-BRL/${dias}`),
                fetch(`https://economia.awesomeapi.com.br/json/daily/EUR-BRL/${dias}`),
                fetch(`https://economia.awesomeapi.com.br/json/daily/BTC-BRL/${dias}`)
            ]);
            
            const dataHistUSD = await resUSD.json();
            const dataHistEUR = await resEUR.json();
            const dataHistBTC = await resBTC.json();

            const extrairDados = (data) => {
                const labels = data.map(item => {
                const d = new Date(item.timestamp * 1000);
                return d.toLocaleDateString('pt-BR', { 
                    day: '2-digit', 
                        month: '2-digit'
                });
                }).reverse();
                const valores = data.map(item => parseFloat(item.bid)).reverse();
                return { labels, valores };
            };

            const usd = extrairDados(dataHistUSD);
            const eur = extrairDados(dataHistEUR);
            const btc = extrairDados(dataHistBTC);

            const criarGrafico = (canvas, label, dados, cor, chartKey) => {
                if (window[chartKey]) window[chartKey].destroy();
                window[chartKey] = new Chart(canvas.getContext('2d'), {
                    type: 'line',
                    data: {
                        labels: dados.labels,
                        datasets: [{
                            label: label,
                            data: dados.valores,
                            borderColor: cor,
                            backgroundColor: cor + '1a', // 10% de opacidade
                            fill: true,
                            tension: 0.3,
                            pointRadius: dias > 30 ? 1 : 3
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: { legend: { display: false } },
                        scales: { y: { beginAtZero: false, ticks: { callback: v => 'R$ ' + v.toFixed(2).replace('.', ',') } } }
                    }
                });
            };

            criarGrafico(canvasUSD, 'Dólar (R$)', usd, '#2F5597', 'chartUSD');
            criarGrafico(canvasEUR, 'Euro (R$)', eur, '#f59e0b', 'chartEUR');
            criarGrafico(canvasBTC, 'Bitcoin (R$)', btc, '#f7931a', 'chartBTC');
        }
    } catch (error) {
        console.error("Erro ao buscar cotações:", error);
    }
}