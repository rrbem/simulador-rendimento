// Escuta o evento de ativação da aba para carregar os dados
// Usamos delegação de evento no documento para garantir que funcione após o fetch do HTML
document.addEventListener('abaAtivada', (e) => {
    if (e && e.target && e.target.id === 'aba-info') {
        carregarCotacoes();
        configurarCampoIr();
        atualizarGraficoIr();
        configurarCalculadoraReal();
        ajustarAlturaGraficoAsync();
    }
    if (e && e.target && e.target.id === 'aba-acoes') {
        carregarDadosAcoes();
    }
    if (e && e.target && e.target.id === 'aba-renda-fixa') {
        if (typeof atualizarRendaFixaTaxasInfo === 'function') {
            atualizarRendaFixaTaxasInfo();
        }
        if (typeof calcularComparacaoRendaFixa === 'function') {
            calcularComparacaoRendaFixa();
        }

        const camposRendaFixa = ['simulacaoValor', 'simulacaoPeriodoMeses'];
        camposRendaFixa.forEach(id => {
            const el = document.getElementById(id);
            if (el && !el.dataset.hookedMask) {
                el.addEventListener('input', function() {
                    const tipo = this.getAttribute('data-type');
                    let valor = this.value;
                    if (tipo === 'moeda' && typeof formatarMoedaInput === 'function') {
                        this.value = formatarMoedaInput(valor);
                    } else if (tipo === 'numero' && typeof formatarNumeroInput === 'function') {
                        this.value = formatarNumeroInput(valor);
                    }
                    if (typeof calcularComparacaoRendaFixa === 'function') {
                        calcularComparacaoRendaFixa();
                    }
                });
                el.dataset.hookedMask = 'true';
            }
        });

        const selUnidadeRendaFixa = document.getElementById('simulacaoPeriodoUnidade');
        if (selUnidadeRendaFixa && !selUnidadeRendaFixa.dataset.hooked) {
            selUnidadeRendaFixa.addEventListener('change', () => {
                if (typeof calcularComparacaoRendaFixa === 'function') calcularComparacaoRendaFixa();
            });
            selUnidadeRendaFixa.dataset.hooked = 'true';
        }
    }
    if (e && e.target && e.target.id === 'aba-economia') {
        const elGasto = document.getElementById('fire-gasto');
        const elRenda = document.getElementById('fire-renda');
        const elValorAtual = document.getElementById('fire-valor-atual');

        // Adiciona listeners de máscara para os campos de moeda carregados via fetch
        [elGasto, elRenda, elValorAtual].forEach(el => {
            if (el && !el.dataset.hookedMask) {
                el.addEventListener('input', function() {
                    if (typeof formatarMoedaInput === 'function') {
                        this.value = formatarMoedaInput(this.value);
                    }
                });
                el.dataset.hookedMask = "true";
            }
        });

        // População automática com Salário Mínimo se disponível e não editado manualmente
        if (window.salarioMinimoAtual) {
            [elGasto, elRenda, elValorAtual].forEach(el => {
                if (el && !el.dataset.manual) {
                    if (typeof formatarMoedaInput === 'function') {
                        el.value = formatarMoedaInput((window.salarioMinimoAtual * 100).toFixed(0));
                    }
                    if (!el.dataset.hooked) {
                        el.addEventListener('input', () => el.dataset.manual = "true");
                        el.dataset.hooked = "true";
                    }
                }
            });
        }

        if (typeof Chart !== 'undefined') {
            initFireChart();
        }
        calcularFIRE();
        calcularAlocacao();
    }
    if (e && e.target && e.target.id === 'aba-amortizacao') {
        inicializarInputsAmort();
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
            window.ipcaAtual = parseFloat(dataIpca[0].valor);
            infoIpca.innerText = window.ipcaAtual.toFixed(2).replace('.', ',') + '% (12m)';
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

function parseBRLCurrency(valor) {
    if (!valor) return 0;
    const texto = String(valor)
        .replace(/[R$\s]/g, '')
        .replace(/\./g, '')
        .replace(/,/g, '.');
    const num = parseFloat(texto);
    return Number.isFinite(num) ? num : 0;
}

function configurarCampoIr() {
    const inputIr = document.getElementById('ir-sim-valor');
    const resetIr = document.getElementById('ir-sim-reset');
    if (!inputIr || inputIr.dataset.hooked) return;

    inputIr.addEventListener('input', () => {
        atualizarGraficoIr();
    });
    if (resetIr) {
        resetIr.addEventListener('click', () => {
            inputIr.value = 'R$ 1.000,00';
            atualizarGraficoIr();
        });
    }
    inputIr.dataset.hooked = 'true';
}

function ajustarAlturaGrafico() {
    const tabela = document.querySelector('.ir-table-side');
    const grafico = document.querySelector('.ir-chart-card');
    if (!tabela || !grafico) return;

    // Remove as restrições de altura para deixar o conteúdo respirar
    grafico.style.height = 'auto';
    grafico.style.maxHeight = 'none';
    grafico.style.minHeight = 'auto';
    
    const alturaTabela = tabela.getBoundingClientRect().height;
    const alturaGrafico = grafico.getBoundingClientRect().height;
    
    // Se o gráfico cabe na altura da tabela, força a altura
    if (alturaGrafico <= alturaTabela) {
        grafico.style.height = `${alturaTabela}px`;
        grafico.style.maxHeight = `${alturaTabela}px`;
    }
}

function ajustarAlturaGraficoAsync() {
    requestAnimationFrame(() => ajustarAlturaGrafico());
    setTimeout(() => ajustarAlturaGrafico(), 50);
}

window.addEventListener('resize', () => {
    ajustarAlturaGraficoAsync();
});

function atualizarGraficoIr() {
    const elBruto = document.getElementById('ir-sim-valor');
    const title = document.getElementById('ir-sim-title');
    const barras = document.querySelectorAll('.ir-sim-bar');
    const bruto = parseBRLCurrency(elBruto ? elBruto.value : '');
    if (title) {
        title.innerText = `Simulação de IR sobre ${bruto.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`;
    }

    const valores = Array.from(barras).map(bar => {
        const taxa = parseFloat(bar.dataset.taxa) || 0;
        return bruto * (taxa / 100);
    });
    const maxValor = Math.max(...valores, 1);

    barras.forEach((bar, idx) => {
        const valor = valores[idx] || 0;
        const taxa = parseFloat(bar.dataset.taxa) || 0;
        const pct = Math.round((valor / maxValor) * 100);
        const fillEl = bar.querySelector('.ir-sim-fill');

        bar.style.setProperty('--bar-percent', `${pct}%`);
        if (fillEl) {
            fillEl.innerText = valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
        }
    });
}

/**
 * Lógica da Aba Economia Criativa (FIRE)
 */
window.calcularFIRE = function() {
    const elGasto = document.getElementById('fire-gasto');
    const elInflacao = document.getElementById('fire-inflacao');
    const elAnos = document.getElementById('fire-anos');
    const elValorAtual = document.getElementById('fire-valor-atual');

    // Se temos o IPCA global e o usuário ainda não mexeu no campo, atualiza automaticamente
    if (elInflacao && window.ipcaAtual !== undefined && !elInflacao.dataset.manual) {
        elInflacao.value = window.ipcaAtual.toFixed(2);
        // Se o usuário digitar manualmente, marcamos como manual para não sobrescrever mais
        if (!elInflacao.dataset.hooked) {
            elInflacao.addEventListener('input', () => elInflacao.dataset.manual = "true");
            elInflacao.dataset.hooked = "true";
        }
    }

    if (elGasto) {
        const gastoMensal = typeof obterValorNumerico === 'function' ? obterValorNumerico(elGasto.value) : 0;
        const fireNumero = (gastoMensal * 12) * 25;
        document.getElementById('fire-resultado').innerText = fireNumero.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    }

    if (elInflacao && elAnos && elValorAtual) {
        const inflacaoAnual = parseFloat(elInflacao.value) || 0;
        const anos = parseFloat(elAnos.value) || 0;
        const valorPresente = typeof obterValorNumerico === 'function' ? obterValorNumerico(elValorAtual.value) : 0;
        const valorFuturo = valorPresente / Math.pow(1 + (inflacaoAnual / 100), anos);
        document.getElementById('inflacao-resultado').innerText = valorFuturo.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    }
}

window.calcularAlocacao = function() {
    const elRenda = document.getElementById('fire-renda');
    if (!elRenda) return;

    const renda = typeof obterValorNumerico === 'function' ? obterValorNumerico(elRenda.value) : 0;
    const v50 = renda * 0.5;
    const v30 = renda * 0.3;
    const v20 = renda * 0.2;

    const fmt = (v) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

    const el50 = document.getElementById('aloc-50');
    const el30 = document.getElementById('aloc-30');
    const el20 = document.getElementById('aloc-20');

    if (el50) el50.innerText = fmt(v50);
    if (el30) el30.innerText = fmt(v30);
    if (el20) el20.innerText = fmt(v20);
}

window.initFireChart = function() {
    const canvas = document.getElementById('firePieChart');
    if (!canvas || typeof Chart === 'undefined') return;
    
    const ctx = canvas.getContext('2d');
    if (window.fireChartObj) window.fireChartObj.destroy();
    
    window.fireChartObj = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Necessidades', 'Desejos', 'Investimento'],
            datasets: [{
                data: [50, 30, 20],
                backgroundColor: ['#2F5597', '#94a3b8', '#10b981'],
                borderWidth: 0
            }]
        },
        options: {
            responsive: false,
            plugins: { legend: { display: false } }
        }
    });
}

window.inicializarInputsAmort = function() {
    const elSaldo = document.getElementById('amort-saldo');
    const elTaxaFinanc = document.getElementById('amort-taxa-financ');
    const elPrazo = document.getElementById('amort-prazo');
    const elSistema = document.getElementById('amort-sistema');
    const elExtra = document.getElementById('amort-extra');
    const elTipoAporte = document.getElementById('amort-tipo-aporte');
    const elTaxaInvest = document.getElementById('amort-taxa-invest');

    const inputs = [elSaldo, elTaxaFinanc, elPrazo, elSistema, elExtra, elTipoAporte, elTaxaInvest];

    inputs.forEach(el => {
        if (!el) return;
        
        // Aplica máscaras nos inputs de texto
        if (el.tagName === 'INPUT' && !el.dataset.hookedMask) {
            el.addEventListener('input', function() {
                const tipo = this.getAttribute('data-type');
                let valor = this.value;
                if (tipo === 'moeda' && typeof formatarMoedaInput === 'function') {
                    this.value = formatarMoedaInput(valor);
                } else if (tipo === 'percentual' && typeof formatarPercentualInput === 'function') {
                    this.value = formatarPercentualInput(valor);
                } else if (tipo === 'numero' && typeof formatarNumeroInput === 'function') {
                    this.value = formatarNumeroInput(valor);
                }
            });
            el.dataset.hookedMask = "true";
        }

        // Executa o cálculo ao alterar
        if (!el.dataset.hookedCalc) {
            el.addEventListener('input', () => window.calcularAmortizacao());
            el.addEventListener('change', () => window.calcularAmortizacao());
            el.dataset.hookedCalc = "true";
        }
    });

    window.calcularAmortizacao();
};

window.calcularAmortizacao = function() {
    function obterValor(id) {
        const el = document.getElementById(id);
        if (!el) return 0;
        const val = el.value;
        if (!val) return 0;
        if (typeof obterValorNumerico === 'function') {
            return obterValorNumerico(val);
        }
        const limpo = val.replace(/\./g, '').replace(',', '.');
        const num = parseFloat(limpo);
        return isNaN(num) ? 0 : num;
    }

    function formatarBRL(valor) {
        if (typeof formatarMoeda === 'function') {
            return formatarMoeda(valor);
        }
        return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    }

    const saldoDevedor = obterValor('amort-saldo');
    const taxaFinancAnual = obterValor('amort-taxa-financ');
    const elPrazo = document.getElementById('amort-prazo');
    const prazoMeses = Math.min(Math.max(parseInt(elPrazo ? elPrazo.value : 0) || 0, 1), 480);
    const sistema = document.getElementById('amort-sistema') ? document.getElementById('amort-sistema').value : 'sac';
    const valorExtra = obterValor('amort-extra');
    const tipoAporte = document.getElementById('amort-tipo-aporte') ? document.getElementById('amort-tipo-aporte').value : 'mensal';
    const taxaInvestAnual = obterValor('amort-taxa-invest');

    if (saldoDevedor <= 0 || prazoMeses <= 0) {
        return;
    }

    // Taxas mensais
    const iFinancMensal = (taxaFinancAnual / 100) / 12; // taxa nominal dividida por 12
    const iInvestMensal = Math.pow(1 + (taxaInvestAnual / 100), 1/12) - 1; // taxa composta

    // Cenário B: Investir o Extra (Financiamento segue normal + Investimento cresce)
    let saldoB = saldoDevedor;
    let jurosPagoB = 0;
    let investB = 0;
    const historicoB = [];

    // Cálculo da parcela no sistema Price
    let parcelaPriceB = 0;
    if (sistema === 'price') {
        if (iFinancMensal > 0) {
            parcelaPriceB = saldoDevedor * (iFinancMensal * Math.pow(1 + iFinancMensal, prazoMeses)) / (Math.pow(1 + iFinancMensal, prazoMeses) - 1);
        } else {
            parcelaPriceB = saldoDevedor / prazoMeses;
        }
    }

    for (let m = 1; m <= prazoMeses; m++) {
        let jurosM = saldoB * iFinancMensal;
        let amortM = 0;
        if (sistema === 'sac') {
            amortM = saldoDevedor / prazoMeses;
        } else {
            amortM = parcelaPriceB - jurosM;
        }

        if (amortM > saldoB) {
            amortM = saldoB;
        }

        let parcelaM = amortM + jurosM;
        saldoB -= amortM;
        if (saldoB < 0) saldoB = 0;
        jurosPagoB += jurosM;

        // Investimento cresce com os aportes extras
        let aporteInvestM = 0;
        if (tipoAporte === 'mensal') {
            aporteInvestM = valorExtra;
        } else if (tipoAporte === 'pontual' && m === 1) {
            aporteInvestM = valorExtra;
        }

        investB = (investB + aporteInvestM) * (1 + iInvestMensal);

        historicoB.push({
            mes: m,
            saldo: saldoB,
            parcela: parcelaM,
            invest: investB,
            juros: jurosM
        });
    }

    // Cenário A: Amortizar Financiamento (Amortizações extras reduzem prazo + posterior investimento)
    let saldoA = saldoDevedor;
    let jurosPagoA = 0;
    let investA = 0;
    let quitouNoMes = prazoMeses;
    let jaQuitou = false;
    const historicoA = [];

    const amortSACNormal = saldoDevedor / prazoMeses;

    for (let m = 1; m <= prazoMeses; m++) {
        let jurosM = 0;
        let amortM = 0;
        let extraM = 0;
        let parcelaTotalA = 0;

        if (!jaQuitou) {
            jurosM = saldoA * iFinancMensal;

            if (sistema === 'sac') {
                amortM = amortSACNormal;
            } else {
                amortM = parcelaPriceB - jurosM;
            }

            if (amortM > saldoA) {
                amortM = saldoA;
            }

            if (tipoAporte === 'mensal') {
                extraM = valorExtra;
            } else if (tipoAporte === 'pontual' && m === 1) {
                extraM = valorExtra;
            }

            if (amortM + extraM > saldoA) {
                extraM = Math.max(0, saldoA - amortM);
                amortM = saldoA - extraM;
            }

            saldoA -= (amortM + extraM);
            if (saldoA < 0) saldoA = 0;
            jurosPagoA += jurosM;
            parcelaTotalA = amortM + jurosM + extraM;

            const totalCashFlowRequired = historicoB[m - 1].parcela + (tipoAporte === 'mensal' ? valorExtra : (tipoAporte === 'pontual' && m === 1 ? valorExtra : 0));
            const surplus = totalCashFlowRequired - parcelaTotalA;

            if (saldoA <= 0.001) {
                saldoA = 0;
                jaQuitou = true;
                quitouNoMes = m;
                // Investe o saldo que sobrou no mês de quitação para equivalência perfeita
                if (surplus > 0) {
                    investA = surplus * (1 + iInvestMensal);
                } else {
                    investA = 0;
                }
            } else {
                investA = 0;
            }
        } else {
            // Financiamento quitado. Passamos a investir o valor integral do fluxo do Cenário B (parcela que seria paga + extra)
            const valorParaInvestir = historicoB[m - 1].parcela + (tipoAporte === 'mensal' ? valorExtra : 0);
            investA = (investA + valorParaInvestir) * (1 + iInvestMensal);
            parcelaTotalA = 0;
        }

        historicoA.push({
            mes: m,
            saldo: saldoA,
            parcela: parcelaTotalA,
            invest: investA,
            juros: jurosM
        });
    }

    // Atualização do HTML
    const spansOriginal = document.querySelectorAll('.val-prazo-original');
    spansOriginal.forEach(span => {
        span.innerText = String(prazoMeses);
    });

    const mesesEconomizados = prazoMeses - quitouNoMes;
    const elValPrazoA = document.getElementById('val-prazo-a');
    const elValEconomiaMeses = document.getElementById('val-economia-meses');
    const elValJurosA = document.getElementById('val-juros-a');
    const elValEconomiaJuros = document.getElementById('val-economia-juros');
    const elValPatrimonioA = document.getElementById('val-patrimonio-a');

    if (elValPrazoA) elValPrazoA.innerText = `${quitouNoMes} meses`;
    if (elValEconomiaMeses) elValEconomiaMeses.innerText = `${mesesEconomizados} meses`;
    if (elValJurosA) elValJurosA.innerText = formatarBRL(jurosPagoA);
    if (elValEconomiaJuros) elValEconomiaJuros.innerText = formatarBRL(Math.max(0, jurosPagoB - jurosPagoA));
    if (elValPatrimonioA) elValPatrimonioA.innerText = formatarBRL(historicoA[prazoMeses - 1].invest);

    const elValPrazoB = document.getElementById('val-prazo-b');
    const elValJurosB = document.getElementById('val-juros-b');
    const elValInvestB = document.getElementById('val-invest-acumulado-b');
    const elValPatrimonioB = document.getElementById('val-patrimonio-b');

    if (elValPrazoB) elValPrazoB.innerText = `${prazoMeses} meses`;
    if (elValJurosB) elValJurosB.innerText = formatarBRL(jurosPagoB);
    if (elValInvestB) elValInvestB.innerText = formatarBRL(investB);
    if (elValPatrimonioB) elValPatrimonioB.innerText = formatarBRL(investB);

    const bannerEl = document.getElementById('amort-banner-resultado');
    const mensagemEl = document.getElementById('amort-banner-mensagem');
    const patA = historicoA[prazoMeses - 1].invest;
    const patB = investB;
    const diferencaPat = Math.abs(patA - patB);

    const elCardA = document.getElementById('comp-card-a');
    const elCardB = document.getElementById('comp-card-b');

    if (patA > patB) {
        if (bannerEl) bannerEl.className = 'amort-result-banner';
        if (mensagemEl) mensagemEl.innerHTML = `Amortizar Financiamento! (Gera + ${formatarBRL(diferencaPat)} de patrimônio)`;
        if (elCardA) elCardA.classList.add('active-scenario');
        if (elCardB) elCardB.classList.remove('active-scenario');

        const elAdvice = document.getElementById('amort-advice');
        if (elAdvice) {
            elAdvice.innerHTML = `
                <strong>💡 Conselho Financeiro Personalizado:</strong><br>
                Para o seu caso, <strong>Amortizar o Financiamento</strong> é a melhor opção matemática. 
                Como a taxa do seu financiamento (${taxaFinancAnual.toFixed(2).replace('.', ',')}% a.a.) é superior ou muito próxima à rentabilidade líquida estimada do seu investimento (${taxaInvestAnual.toFixed(2).replace('.', ',')}% a.a.), 
                quitar a dívida funciona como um "investimento garantido" com retorno equivalente à taxa da dívida, livre de riscos e impostos. 
                Você economizará <strong>${formatarBRL(Math.max(0, jurosPagoB - jurosPagoA))}</strong> em juros e quitará a dívida <strong>${mesesEconomizados} meses</strong> mais rápido.
            `;
        }
    } else {
        if (bannerEl) bannerEl.className = 'amort-result-banner investir';
        if (mensagemEl) mensagemEl.innerHTML = `Investir o Dinheiro Extra! (Gera + ${formatarBRL(diferencaPat)} de patrimônio)`;
        if (elCardB) elCardB.classList.add('active-scenario');
        if (elCardA) elCardA.classList.remove('active-scenario');

        const elAdvice = document.getElementById('amort-advice');
        if (elAdvice) {
            elAdvice.innerHTML = `
                <strong>💡 Conselho Financeiro Personalizado:</strong><br>
                Para o seu caso, <strong>Investir o Dinheiro Extra</strong> é a melhor opção matemática. 
                Como a taxa de rentabilidade líquida do investimento (${taxaInvestAnual.toFixed(2).replace('.', ',')}% a.a.) é superior à taxa do seu financiamento (${taxaFinancAnual.toFixed(2).replace('.', ',')}% a.a.), 
                o juro composto trabalhando a seu favor nos investimentos crescerá mais rápido do que os juros cobrados pelo banco. 
                Ao final dos ${prazoMeses} meses, seu patrimônio líquido acumulado será maior em <strong>${formatarBRL(diferencaPat)}</strong> em comparação com a opção de amortizar.
            `;
        }
    }

    // Tabela detalhada
    let tableHtml = '';
    for (let i = 0; i < prazoMeses; i++) {
        const hA = historicoA[i];
        const hB = historicoB[i];
        tableHtml += `
            <tr>
                <td>${i + 1}</td>
                <td>${formatarBRL(hA.saldo)}</td>
                <td>${formatarBRL(hA.parcela)}</td>
                <td>${formatarBRL(hB.saldo)}</td>
                <td>${formatarBRL(hB.parcela)}</td>
                <td>${formatarBRL(hA.invest)}</td>
                <td>${formatarBRL(hB.invest)}</td>
            </tr>
        `;
    }
    const elTableBody = document.getElementById('amort-table-body');
    if (elTableBody) elTableBody.innerHTML = tableHtml;
};

window.alternarDetalhesAmort = function() {
    const tabela = document.getElementById('collapsible-tabela');
    const seta = document.getElementById('collapsible-arrow');
    if (!tabela) return;

    tabela.classList.toggle('expanded');
    if (tabela.classList.contains('expanded')) {
        if (seta) seta.innerText = '▲';
    } else {
        if (seta) seta.innerText = '▼';
    }
};

/**
 * Lógica da Calculadora de Rentabilidade Real
 */
function obterValorPercentual(valor) {
    if (!valor) return 0;
    const limpo = String(valor)
        .replace(/\s/g, '')
        .replace('%', '')
        .replace(/\./g, '')
        .replace(',', '.');
    const num = parseFloat(limpo);
    return isNaN(num) ? 0 : num;
}

function configurarCalculadoraReal() {
    const elNominal = document.getElementById('real-tx-nominal');
    const elInflacao = document.getElementById('real-tx-inflacao');
    const elValor = document.getElementById('real-valor');
    const elTempo = document.getElementById('real-tempo');
    const btnReset = document.getElementById('real-btn-reset');
    
    if (!elNominal || !elInflacao || !elValor || !elTempo) return;
    
    // Configura valores padrões baseados no governo se disponíveis
    if (window.taxaSelicAtual && !elNominal.dataset.initialized) {
        const defaultCDI = window.taxaSelicAtual - 0.1;
        elNominal.value = defaultCDI.toFixed(2).replace('.', ',') + '%';
        elNominal.dataset.initialized = 'true';
    }
    if (window.ipcaAtual && !elInflacao.dataset.initialized) {
        elInflacao.value = window.ipcaAtual.toFixed(2).replace('.', ',') + '%';
        elInflacao.dataset.initialized = 'true';
    }
    
    // Registra listeners nos inputs com suas respectivas formatações
    [
        { el: elNominal, fmt: typeof formatarPercentualInput === 'function' ? formatarPercentualInput : null },
        { el: elInflacao, fmt: typeof formatarPercentualInput === 'function' ? formatarPercentualInput : null },
        { el: elValor, fmt: typeof formatarMoedaInput === 'function' ? formatarMoedaInput : null },
        { el: elTempo, fmt: typeof formatarNumeroInput === 'function' ? formatarNumeroInput : null }
    ].forEach(item => {
        const el = item.el;
        const fmt = item.fmt;
        if (el && !el.dataset.hooked) {
            el.addEventListener('input', function() {
                if (fmt) {
                    this.value = fmt(this.value);
                }
                atualizarCalculadoraReal();
            });
            el.dataset.hooked = 'true';
        }
    });
    
    // Registra reset
    if (btnReset && !btnReset.dataset.hooked) {
        btnReset.addEventListener('click', () => {
            if (window.taxaSelicAtual) {
                const defaultCDI = window.taxaSelicAtual - 0.1;
                elNominal.value = defaultCDI.toFixed(2).replace('.', ',') + '%';
            } else {
                elNominal.value = '10,40%';
            }
            if (window.ipcaAtual) {
                elInflacao.value = window.ipcaAtual.toFixed(2).replace('.', ',') + '%';
            } else {
                elInflacao.value = '4,50%';
            }
            elValor.value = '1.000,00';
            elTempo.value = '5';
            atualizarCalculadoraReal();
        });
        btnReset.dataset.hooked = 'true';
    }
    
    atualizarCalculadoraReal();
}

function atualizarCalculadoraReal() {
    const elNominal = document.getElementById('real-tx-nominal');
    const elInflacao = document.getElementById('real-tx-inflacao');
    const elValor = document.getElementById('real-valor');
    const elTempo = document.getElementById('real-tempo');
    
    const elFisher = document.getElementById('real-res-fisher');
    const elLinear = document.getElementById('real-res-linear');
    const elDiferenca = document.getElementById('real-res-diferenca');
    
    const elMonNominal = document.getElementById('real-mon-nominal');
    const elMonReal = document.getElementById('real-mon-real');
    const elMonPerda = document.getElementById('real-mon-perda');
    
    const barReal = document.getElementById('yield-bar-real');
    const barInflation = document.getElementById('yield-bar-inflation');
    const warningNeg = document.getElementById('yield-warning-neg');
    
    if (!elNominal || !elInflacao || !elValor || !elTempo ||
        !elFisher || !elLinear || !elDiferenca ||
        !elMonNominal || !elMonReal || !elMonPerda) return;
    
    const nominal = obterValorPercentual(elNominal.value);
    const inflacao = obterValorPercentual(elInflacao.value);
    
    let valorSimulado = 0;
    if (typeof parseBRLCurrency === 'function') {
        valorSimulado = parseBRLCurrency(elValor.value);
    } else {
        const text = String(elValor.value).replace(/[R$\s]/g, '').replace(/\./g, '').replace(/,/g, '.');
        const parsed = parseFloat(text);
        valorSimulado = Number.isFinite(parsed) ? parsed : 0;
    }
    
    const tempoAnos = parseInt(elTempo.value.replace(/\D/g, '')) || 0;
    
    const i_nom = nominal / 100;
    const i_inf = inflacao / 100;
    
    let real_pct = 0;
    if (i_inf !== -1) {
        real_pct = (((1 + i_nom) / (1 + i_inf)) - 1) * 100;
    }
    const i_real = real_pct / 100;
    
    const linear_pct = nominal - inflacao;
    const diferenca = linear_pct - real_pct;
    
    elFisher.innerText = real_pct.toFixed(2).replace('.', ',') + '%';
    elLinear.innerText = linear_pct.toFixed(2).replace('.', ',') + '%';
    elDiferenca.innerText = Math.abs(diferenca).toFixed(2).replace('.', ',') + '%';
    
    // Cálculo do montante final acumulado (Juro Composto: M = P * (1 + i)^t)
    const monNominal = valorSimulado * Math.pow(1 + i_nom, tempoAnos);
    const monReal = valorSimulado * Math.pow(1 + i_real, tempoAnos);
    const monPerda = Math.max(0, monNominal - monReal);
    
    const formatarBRL = (val) => {
        return val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    };
    
    elMonNominal.innerText = formatarBRL(monNominal);
    elMonReal.innerText = formatarBRL(monReal);
    elMonPerda.innerText = formatarBRL(monPerda);
    
    if (real_pct >= 0) {
        elFisher.className = 'yield-result-val subida';
        elMonReal.className = 'yield-result-val subida';
        if (warningNeg) warningNeg.style.display = 'none';
        
        if (nominal > 0) {
            const pctReal = (real_pct / nominal) * 100;
            const pctInf = 100 - pctReal;
            
            if (barReal) {
                barReal.style.width = `${pctReal}%`;
                barReal.style.display = 'flex';
                barReal.className = 'yield-bar-real';
                barReal.innerText = `Ganho Real: ${real_pct.toFixed(2).replace('.', ',')}%`;
            }
            if (barInflation) {
                barInflation.style.width = `${pctInf}%`;
                barInflation.style.display = 'flex';
                barInflation.innerText = `Efeito da Inflação: ${(nominal - real_pct).toFixed(2).replace('.', ',')}%`;
            }
        } else {
            if (barReal) barReal.style.width = '0%';
            if (barInflation) {
                barInflation.style.width = '100%';
                barInflation.innerText = 'Sem Rendimento';
            }
        }
    } else {
        elFisher.className = 'yield-result-val descida';
        elMonReal.className = 'yield-result-val descida';
        if (warningNeg) warningNeg.style.display = 'block';
        
        if (barReal) {
            barReal.style.display = 'none';
        }
        if (barInflation) {
            barInflation.style.width = '100%';
            barInflation.innerText = `Perda de Poder de Compra: ${Math.abs(real_pct).toFixed(2).replace('.', ',')}%`;
            barInflation.className = 'yield-bar-lost';
        }
    }
}