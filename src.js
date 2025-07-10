const toggleButton = document.getElementById("toggle-dark");
const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
let theme = prefersDark ? "dark" : "light";

document.body.classList.toggle("dark", theme === "dark");
toggleButton.textContent = theme === "dark" ? "☀️" : "🌙";

toggleButton.addEventListener("click", () => {
    const isDark = document.body.classList.toggle("dark");
    toggleButton.textContent = isDark ? "☀️" : "🌙";
    updateAllResults();
});

const itemsInput = document.getElementById("items");
const eventsInput = document.getElementById("events");
const container = document.getElementById("item-container");
let maxAttempts = 100;
let chart;
Chart.defaults.font.size = 18;

itemsInput.addEventListener("input", updateItemFields);
eventsInput.addEventListener("input", updateAllResults);

function updateItemFields() {
    const n = parseInt(itemsInput.value, 10);
    if (isNaN(n) || n <= 0) return;
    if (n > maxAttempts) {
        maxAttempts = n;
    }

    container.innerHTML = "";

    for (let i = 1; i <= n; i++) {
        const label = document.createElement("label");
        label.setAttribute("for", `prob-${i}`);
        label.textContent = `Probability of success for item ${i}: `;

        const input = document.createElement("input");
        input.type = "number";
        input.id = `prob-${i}`;
        input.name = `prob-${i}`;
        input.required = true;

        const percent = document.createTextNode("% ");

        const span = document.createElement("span");
        span.id = `result-${i}`;
        span.name = `result-${i}`;

        input.addEventListener("input", () => {
            updateResult(i);
            updateAllResults();
        });

        container.appendChild(label);
        container.appendChild(input);
        container.appendChild(percent);
        container.appendChild(span);
    }
}

function updateResult(i) {
    const events = parseInt(eventsInput.value, 10);
    const probInput = document.getElementById(`prob-${i}`);
    const resultSpan = document.getElementById(`result-${i}`);

    const p = parseFloat(probInput.value) / 100;
    if (isNaN(p) || p <= 0 || p >= 1) {
        resultSpan.textContent = "";
        return;
    }

    let chance = isNaN(events) || events <= 0 ? null : 1 - Math.pow(1 - p, events);
    const targets = [0.5, 0.90, 0.90];
    const requiredTrials = targets.map(Pt => Math.ceil(Math.log(1 - Pt) / Math.log(1 - p)));

    let html = "";
    if (chance !== null) {
        html += `→ ${Math.round(chance * 10000) / 100}% chance of success in ${events} attempts<br>`;
    }
    html += `Number of attempts for 50% success: ${requiredTrials[0]}<br>`;
    html += `Number of attempts for 90% success: ${requiredTrials[1]}`;

    resultSpan.innerHTML = html;
}

function calculateChanceAllItems(events, probs) {
    const N = probs.length;
    let total = 0;

    for (let mask = 1; mask < (1 << N); mask++) {
        let probMiss = 1;
        let bits = 0;

        for (let i = 0; i < N; i++) {
            if ((mask >> i) & 1) {
                probMiss *= Math.pow(1 - probs[i], events);
                bits++;
            }
        }

        const sign = (bits % 2 === 1) ? 1 : -1;
        total += sign * probMiss;
    }

    return 1 - total;
}

function updateAllResults() {
    const n = parseInt(itemsInput.value, 10);
    const events = parseInt(eventsInput.value, 10);
    if (isNaN(n) || n <= 0 || isNaN(events) || events <= 0) return;

    let probNone = 1;
    let validProbs = [];

    for (let i = 1; i <= n; i++) {
        updateResult(i);
        const input = document.getElementById(`prob-${i}`);
        const p = parseFloat(input.value) / 100;
        if (!isNaN(p)) {
            if (p <= 0) {
                probNone *= 1;
                validProbs.push(0);
            } else if (p >= 1) {
                validProbs.push(1);
            } else {
                probNone *= Math.pow(1 - p, events);
                validProbs.push(p);
            }
        }
    }

    let totalProb = validProbs.reduce((sum, p) => sum + p, 0);
    const resultDiv = document.getElementById("result");

    if (totalProb > 1) {
    for (let i = 1; i <= n; i++) {
        const input = document.getElementById(`prob-${i}`);
        input.style.borderColor = "red";
    }
        resultDiv.innerHTML = `
            <div style="color: red; font-weight: bold;">
                Total probability exceeds 100%! Please adjust the values.
            </div>`;
        return;
    } else {
        for (let i = 1; i <= n; i++) {
            const input = document.getElementById(`prob-${i}`);
            input.style.borderColor = "";
        }
    }

    const probAtLeastOne = 1 - probNone;
    const probAllItems = calculateChanceAllItems(events, validProbs);

    let expectedItems = validProbs.reduce((sum, p) => sum + (1 - Math.pow(1 - p, events)), 0);

    resultDiv.innerHTML = `
        <strong>Results for ${events} attempts</strong><br><br>
        <strong>Probability of getting at least one item:</strong> ${Math.round(probAtLeastOne * 10000) / 100}%<br>
        <strong>Probability of getting all items at least once:</strong> ${Math.round(probAllItems * 10000) / 100}%<br>
        <strong>Expected number of items collected:</strong> ${Math.round(expectedItems * 100) / 100}
    `;

    let datasets = [];

    validProbs.forEach((p, index) => {
        let data = [];
        for (let n = 1; n <= maxAttempts; n++) {
            const chance = 1 - Math.pow(1 - p, n);
            data.push({ x: n, y: chance * 100 });
        }
        datasets.push({
            label: `Item ${index + 1}`,
            data,
            fill: false,
            borderColor: `hsl(${index * 60}, 70%, 50%)`,
            tension: 0.2,
            pointRadius: 0 
        });
    });

    let dataAtLeastOne = [];
    for (let n = 1; n <= maxAttempts; n++) {
        let probNone = 1;
        for (let p of validProbs) {
            probNone *= Math.pow(1 - p, n);
        }
        dataAtLeastOne.push({ x: n, y: (1 - probNone) * 100 });
    }

    let dataAllItems = [];
    for (let n = 1; n <= maxAttempts; n++) {
        let total = 0;
        const N = validProbs.length;

        for (let mask = 1; mask < (1 << N); mask++) {
            let probMiss = 1;
            let bits = 0;

            for (let i = 0; i < N; i++) {
                if ((mask >> i) & 1) {
                    probMiss *= Math.pow(1 - validProbs[i], n);
                    bits++;
                }
            }

            const sign = (bits % 2 === 1) ? 1 : -1;
            total += sign * probMiss;
        }

        const probAll = 1 - total;
        dataAllItems.push({ x: n, y: probAll * 100 });
    }

    function getThemeColor(variable) {
        return getComputedStyle(document.body).getPropertyValue(variable).trim();
    }

    if ( n > 1){
        datasets.push({
        label: "Getting at least one item",
        data: dataAtLeastOne,
        fill: false,
        borderColor: getThemeColor('--curve-any-item'),        
        borderDash: [5, 5],
        tension: 0.2,
        pointRadius: 0 
        });

        datasets.push({
            label: "Getting all items",
            data: dataAllItems,
            fill: false,
            borderColor: getThemeColor('--curve-all-items'),
            borderDash: [3, 3],
            tension: 0.2,
            pointRadius: 0 
        });
    }

    

    const ctx = document.getElementById("successChart").getContext("2d");
    if (chart) {
        chart.data.datasets = datasets;
        chart.update();
    } else {
        chart = new Chart(ctx, {
            type: 'line',
            data: { datasets },
            options: {
                responsive: true,
                animation: false,
                scales: {
                    x: {
                        type: 'linear',
                        title: { display: true, text: 'Number of Attempts' },
                        min: 1,
                        max: maxAttempts
                    },
                    y: {
                        title: { display: true, text: 'Success Probability (%)' },
                        min: 0,
                        max: 100
                    }
                },
                plugins: {
                    legend: {
                        position: 'top'
                    },
                    tooltip: {
                        mode: 'nearest',
                        intersect: false
                    }
                }
            }
        });
    }

}
