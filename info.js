// Escuta o evento de ativação da aba para carregar os dados
// Usamos delegação de evento no documento para garantir que funcione após o fetch do HTML
document.addEventListener('abaAtivada', (e) => {
    if (e.target.id === 'aba-info') {
        carregarCotacoes();
    }
});

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

        if (canvasUSD && canvasEUR) {
            const [resUSD, resEUR] = await Promise.all([
                fetch(`https://economia.awesomeapi.com.br/json/daily/USD-BRL/${dias}`),
                fetch(`https://economia.awesomeapi.com.br/json/daily/EUR-BRL/${dias}`)
            ]);
            
            const dataHistUSD = await resUSD.json();
            const dataHistEUR = await resEUR.json();

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
        }
    } catch (error) {
        console.error("Erro ao buscar cotações:", error);
    }
}