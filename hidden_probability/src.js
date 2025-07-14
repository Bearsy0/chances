const eventsInput = document.getElementById("events");
const successInput = document.getElementById("success");
const resultDiv = document.getElementById("result");
const toggleButton = document.getElementById("toggle-dark");

let chart;

function updateEstimation() {
    const events = parseInt(eventsInput.value, 10);
    const successes = parseInt(successInput.value, 10);
    const failures = events - successes;

    if (
        isNaN(events) || isNaN(successes) || isNaN(failures) ||
        events < 0 || successes < 0
    ) {
        resultDiv.innerHTML = ``;
        if (chart) {
            chart.data.labels = [];
            chart.data.datasets = [];
            chart.update();
        }
        return;
    }

    if (failures < 0) {
        resultDiv.innerHTML = `<strong>Estimated probability:</strong> <span style="color:red">Invalid input --- more successes than attempts!</span>`;
        if (chart) {
            chart.data.labels = [];
            chart.data.datasets = [];
            chart.update();
        }
        return;
    }

    const alpha = 1 + successes;
    const beta = 1 + failures;
    const mean = alpha / (alpha + beta);
    const [lower, upper] = betaCredibleInterval(alpha, beta, 0.95);

    resultDiv.innerHTML = `
        <strong>Estimated probability:</strong><br>
        Mean: <strong>${mean.toFixed(4)*100}%</strong><br>
        95% credible interval: <strong>[${lower.toFixed(4)*100}, ${upper.toFixed(4)*100}]%</strong>
    `;

    plotPosterior(alpha, beta, mean, lower, upper);
}

function plotPosterior(alpha, beta, mean, lower, upper) {
    const x = [];
    const y = [];

    for (let i = 0; i <= 1000; i++) {
        const p = i / 1000;
        x.push(p);
        y.push(jStat.beta.pdf(p, alpha, beta));
    }

    const ctx = document.getElementById("successChart").getContext("2d");
    const themeColor = getComputedStyle(document.body).getPropertyValue('--curve-any-item').trim();

    const pdf = {
        type: 'line',
        label: 'Posterior PDF of p',
        data: y,
        borderColor: themeColor,
        fill: false,
        pointRadius: 0,
        tension: 0.2
    };

    if (chart) {
        chart.data.labels = x;
        chart.data.datasets[0] = pdf;
        chart.options.scales.y.max = Math.max(...y) * 1.05;
        chart.options.scales.y.title.text = 'P(p | data)';
        chart.update();
    } else {
        chart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: x,
                datasets: [pdf]
            },
            options: {
                maintainAspectRatio: false,
                responsive: true,
                animation: false,
                scales: {
                    x: {
                        type: 'linear',
                        title: {
                            display: true,
                            text: 'Success probability p',
                            font: { size: 18, weight: 'bold' }
                        },
                        min: 0,
                        max: 1,
                        ticks: {
                            font: ctx => ({ size: ctx.chart.width < 500 ? 12 : 16, weight: 'bold' })
                        }
                    },
                    y: {
                        title: {
                            display: true,
                            text: 'P(p | data)',
                            font: { size: 18, weight: 'bold' }
                        },
                        ticks: {
                            font: ctx => ({ size: ctx.chart.width < 500 ? 12 : 16, weight: 'bold' })
                        }
                    }
                },
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        callbacks: {
                            title: ctx => `p = ${ctx[0].label}`,
                            label: ctx => `likelihood: ${ctx.raw.toFixed(4)}`
                        },
                        bodyFont: { size: 14 },
                        titleFont: { size: 16, weight: 'bold' }
                    }
                }
            }
        });
    }
}

function betaCredibleInterval(alpha, beta, level = 0.95) {
    const tail = (1 - level) / 2;
    const lower = jStat.beta.inv(tail, alpha, beta);
    const upper = jStat.beta.inv(1 - tail, alpha, beta);
    return [lower, upper];
}

const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
let theme = prefersDark ? "dark" : "light";
document.body.classList.toggle("dark", theme === "dark");

document.body.classList.toggle("dark", theme === "dark");
toggleButton.addEventListener("click", () => {
    const isDark = document.body.classList.toggle("dark");
    updateEstimation(); // update chart color
});

// Bind updates to input changes
[eventsInput, successInput].forEach(input => {
    input.addEventListener("input", updateEstimation);
});