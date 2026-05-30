async function carregarCotacoes() {
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
            const resHist = await fetch('https://economia.awesomeapi.com.br/json/daily/USD-BRL/7');
            const dataHist = await resHist.json();

            const labels = dataHist.map(item => {
                const d = new Date(item.timestamp * 1000);
                return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
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