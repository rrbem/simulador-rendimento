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

    try {
        // Cotação Atual
        const resAtual = await fetch('https://economia.awesomeapi.com.br/last/USD-BRL,BTC-BRL');
        const dataAtual = await resAtual.json();
        
        if (document.getElementById('usd-val')) {
            document.getElementById('usd-val').innerText = parseFloat(dataAtual.USDBRL.bid).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
        }
        if (document.getElementById('btc-val')) {
            document.getElementById('btc-val').innerText = parseFloat(dataAtual.BTCBRL.bid).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
        }

        // Histórico de 7 dias para o gráfico
        const canvasHist = document.getElementById('graficoDolarHist');
        if (canvasHist) {
            const resHist = await fetch(`https://economia.awesomeapi.com.br/json/daily/USD-BRL/${dias}`);
            const dataHist = await resHist.json();

            const labels = dataHist.map(item => {
                const d = new Date(item.timestamp * 1000);
                return d.toLocaleDateString('pt-BR', { 
                    day: '2-digit', 
                    month: '2-digit',
                    year: dias > 30 ? '2-digit' : undefined 
                });
            }).reverse();

            const valores = dataHist.map(item => parseFloat(item.bid)).reverse();

            if (window.chartDolarHist) window.chartDolarHist.destroy();

            window.chartDolarHist = new Chart(canvasHist.getContext('2d'), {
                type: 'line',
                data: {
                    labels: labels,
                    datasets: [{
                        label: 'Dólar (R$)',
                        data: valores,
                        borderColor: '#2F5597',
                        backgroundColor: 'rgba(47, 85, 151, 0.1)',
                        fill: true,
                        tension: 0.3,
                        pointRadius: 4
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { display: false } },
                    scales: { y: { beginAtZero: false, ticks: { callback: v => 'R$ ' + v.toFixed(2).replace('.', ',') } } }
                }
            });
        }
    } catch (error) {
        console.error("Erro ao buscar cotações:", error);
    }
}