
let reportList = [];           
let pendingAddCoinId = null;   
const CACHE_TTL_MS = 2 * 60 * 1000;


const coinsMap = {};  


let liveTimer = null;          
let liveChart = null;        
let seriesBySymbol = {};       
const MAX_POINTS = 60;        

$(document).ready(function () {

  loadCoins();

 
  $('#manage-cancel').on('click', function () {
    pendingAddCoinId = null;
  });

 
  const liveTab = document.getElementById('live-tab');
  const coinsTab = document.getElementById('coins-tab');

  liveTab.addEventListener('shown.bs.tab', function () {
    startLiveReport();   
  });
  coinsTab.addEventListener('shown.bs.tab', function () {
    stopLiveReport();    
  });
});


function loadCoins() {
  $("#coins").html(`
    <div class="progress">
      <div class="progress-bar progress-bar-striped progress-bar-animated" style="width:100%">
        Loading coins...
      </div>
    </div>
  `);

  $.ajax({
    url: "https://api.coingecko.com/api/v3/coins/list",
    method: "GET",
    success: function (data) {
      $("#coins").empty();

      data.slice(0, 10).forEach(function (coin) {
       
        coinsMap[coin.id] = (coin.symbol || "").toUpperCase();

        const inReport = reportList.includes(coin.id);
        $("#coins").append(`
          <div class="col-md-4 coin-card">
            <div class="card shadow-sm h-100">
              <div class="card-body">
                <div class="badge-wrap">
                  <h5 class="card-title mb-0">${coin.name}</h5>
                  <span id="badge-${coin.id}" class="badge bg-primary selected-badge ${inReport ? 'show' : ''}">
                    Selected
                  </span>
                </div>
                <p class="card-text text-muted">${coin.symbol}</p>

                <button class="btn btn-sm btn-warning me-2"
                        onclick="toggleReport('${coin.id}')">
                  Toggle Report
                </button>

                <button class="btn btn-sm btn-info"
                        onclick="showMoreInfo('${coin.id}')">
                  More Info
                </button>

                <div id="info-${coin.id}" class="more-info mt-2" style="display:none;"></div>
              </div>
            </div>
          </div>
        `);
      });
    },
    error: function () {
      $("#coins").html("<p class='text-danger'>Failed to load coins.</p>");
    }
  });
}

function toggleReport(coinId) {
  const infoDiv = $("#info-" + coinId);

  if (reportList.includes(coinId)) {
  
    reportList = reportList.filter(c => c !== coinId);
    alert(coinId + " removed from report.");
    updateBadge(coinId, false);
    updateReport();
   
    if (infoDiv.is(":visible")) infoDiv.slideUp();
    
    refreshLiveSeriesFromSelection();
    return;
  }


  if (reportList.length < 5) {
    reportList.push(coinId);
    alert(coinId + " added to report.");
    updateBadge(coinId, true);
    updateReport();
    if (infoDiv.is(":visible")) infoDiv.slideUp();
    refreshLiveSeriesFromSelection();
  } else {
   
    pendingAddCoinId = coinId;
    populateManageModal();
    const modal = new bootstrap.Modal(document.getElementById('manageModal'));
    modal.show();
  }
}

function populateManageModal() {
  const list = $('#manage-list');
  list.empty();

  reportList.forEach(function (id) {
    const li = $(`
      <li class="list-group-item d-flex align-items-center justify-content-between">
        <span>${id}</span>
        <button class="btn btn-sm btn-outline-danger">Remove</button>
      </li>
    `);

    li.find('button').on('click', function () {
      if (!pendingAddCoinId) return;

      
      reportList = reportList.filter(c => c !== id);
      updateBadge(id, false);

     
      if (!reportList.includes(pendingAddCoinId)) {
        reportList.push(pendingAddCoinId);
        updateBadge(pendingAddCoinId, true);
        alert(pendingAddCoinId + " added to report.");
      }

      pendingAddCoinId = null;
      updateReport();

  
      refreshLiveSeriesFromSelection();

    
      const modalEl = document.getElementById('manageModal');
      const modal = bootstrap.Modal.getInstance(modalEl);
      modal.hide();
    });

    list.append(li);
  });
}

function updateReport() {
  if (reportList.length === 0) {
    $("#report").text("No coins in report yet.");
  } else {
    $("#report").text(reportList.join(", "));
  }
}

function updateBadge(coinId, selected) {
  const b = $("#badge-" + coinId);
  if (selected) b.addClass("show"); else b.removeClass("show");
}


function showMoreInfo(coinId) {
  const div = $("#info-" + coinId);

  if (div.is(":visible")) {
    div.slideUp();
    return;
  }

  div.html(`
    <div class="progress">
      <div class="progress-bar progress-bar-striped progress-bar-animated" style="width:100%">
        Loading info...
      </div>
    </div>
  `).slideDown();

  const cacheKey = "coin-" + coinId;
  const saved = localStorage.getItem(cacheKey);
  const now = Date.now();

  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      if (now - parsed.time < CACHE_TTL_MS) {
        renderInfo(parsed.data, div);
        return;
      }
    } catch (e) {  }
  }

  $.ajax({
    url: "https://api.coingecko.com/api/v3/coins/" + coinId,
    method: "GET",
    success: function (data) {
      localStorage.setItem(cacheKey, JSON.stringify({ data, time: now }));
      renderInfo(data, div);
    },
    error: function () {
      div.html("<p class='text-danger'>Failed to load details.</p>");
    }
  });
}

function renderInfo(data, targetDiv) {
  const img = (data.image && data.image.small) ? data.image.small : "";
  const usd = data.market_data?.current_price?.usd ?? "-";
  const eur = data.market_data?.current_price?.eur ?? "-";
  const ils = data.market_data?.current_price?.ils ?? "-";

  targetDiv.html(`
    <img src="${img}" alt="${data.name}" width="40"><br>
    <strong>USD:</strong> US$ ${usd}<br>
    <strong>EUR:</strong> €${eur}<br>
    <strong>ILS:</strong> ₪${ils}
  `);
}


function startLiveReport() {

  stopLiveReport();

  
  $("#live-loading").removeClass("d-none");

 
  seriesBySymbol = {};
  const options = {
    zoomEnabled: false,
    animationEnabled: false,
    title: { text: "Live Prices (USD)" },
    axisX: { title: "Time" },
    axisY: { title: "Price (USD)", includeZero: false },
    legend: { cursor: "pointer", verticalAlign: "top" },
    data: [] 
  };

  $("#liveChart").CanvasJSChart(options);
  liveChart = $("#liveChart").CanvasJSChart();

  
  refreshLiveSeriesFromSelection();

 
  liveTimer = setInterval(fetchAndPlotLivePrices, 2000);

  
  $("#live-loading").addClass("d-none");
}


function stopLiveReport() {
  if (liveTimer) {
    clearInterval(liveTimer);
    liveTimer = null;
  }
}


function refreshLiveSeriesFromSelection() {
  if (!liveChart) return;

 
  const newData = [];
  seriesBySymbol = {};

 
  const selectedSymbols = reportList
    .map(id => coinsMap[id])
    .filter(sym => !!sym); 

  selectedSymbols.forEach(function (sym) {
    const series = {
      type: "line",
      name: sym,                      
      showInLegend: true,
      markerSize: 2,
      dataPoints: []                  
    };
    newData.push(series);
    seriesBySymbol[sym] = series;
  });

  liveChart.options.data = newData;
  liveChart.render();
}


function fetchAndPlotLivePrices() {
  if (!liveChart) return;

  const symbols = Object.keys(seriesBySymbol); 
  if (symbols.length === 0) {
    liveChart.render();
    return;
  }

  
  const fsyms = symbols.join(",");
  const url = "https://min-api.cryptocompare.com/data/pricemulti?fsyms=" + encodeURIComponent(fsyms) + "&tsyms=USD,EUR";



  $.ajax({
    url: url,
    method: "GET",
    success: function (resp) {
      const now = new Date();

      symbols.forEach(function (sym) {
        const priceObj = resp[sym];
        if (!priceObj || typeof priceObj.USD !== "number") {
    
          return;
        }

       
        const s = seriesBySymbol[sym];
        if (!s) return;
        s.dataPoints.push({ x: now, y: priceObj.USD });

        
        if (s.dataPoints.length > MAX_POINTS) {
          s.dataPoints.splice(0, s.dataPoints.length - MAX_POINTS);
        }
      });

      liveChart.render();
    },
    error: function () {
      
    }
  });
}


