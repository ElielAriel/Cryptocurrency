// ✅ Function to load Bitcoin info on page load
function loadBitcoinInfo() {
  $('#bitcoin-info').html(`
    <div class="d-flex justify-content-center">
      <div class="spinner-border text-warning" role="status">
        <span class="visually-hidden">Loading Bitcoin info...</span>
      </div>
    </div>
  `);

  $.ajax({
    url: 'https://api.coingecko.com/api/v3/coins/bitcoin',
    method: 'GET',
    success: function (data) {
      const image = data.image.large;
      const priceUsd = data.market_data.current_price.usd;
      const priceEur = data.market_data.current_price.eur;
      const priceIls = data.market_data.current_price.ils;

      $('#bitcoin-info').html(`
        <img src="${image}" alt="Bitcoin" width="80" class="mb-3"><br>
        <h4>${data.name}</h4>
        <p>
          <strong>Price USD:</strong> $${priceUsd}<br>
          <strong>Price EUR:</strong> €${priceEur}<br>
          <strong>Price ILS:</strong> ₪${priceIls}
        </p>
      `);
    },
    error: function () {
      $('#bitcoin-info').html('<p class="text-danger">Failed to load Bitcoin info.</p>');
    }
  });
}

// ✅ When the document is ready
$(document).ready(function () {
  // Load Bitcoin info immediately
  loadBitcoinInfo();

  // Handle Load Coins button
  $('#loadCoins').click(function () {
    const button = $(this);
    button.prop('disabled', true).text('Loading...');

    $('#coins-container').html(`
      <div class="d-flex justify-content-center">
        <div class="spinner-border text-primary" role="status">
          <span class="visually-hidden">Loading coins...</span>
        </div>
      </div>
    `);

    $.ajax({
      url: 'https://api.coingecko.com/api/v3/coins/list',
      method: 'GET',
      success: function (data) {
        const coinsToShow = data.slice(0, 10);
        $('#coins-container').empty();

        coinsToShow.forEach(function (coin) {
          const coinId = coin.id;

          $('#coins-container').append(`
            <div class="col-md-4 mb-4">
              <div class="card shadow-sm h-100">
                <div class="card-body">
                  <h5 class="card-title">${coin.name}</h5>
                  <p class="card-text">
                    <strong>Symbol:</strong> ${coin.symbol}<br>
                    <strong>ID:</strong> ${coinId}
                  </p>
                  <button class="btn btn-sm btn-info" data-id="${coinId}">More Info</button>
                  <div class="more-info mt-3" id="info-${coinId}" style="display: none;"></div>
                </div>
              </div>
            </div>
          `);
        });

        // Handle "More Info" buttons
        $('.btn-info').click(function () {
          const coinId = $(this).data('id');
          const infoDiv = $(`#info-${coinId}`);

          if (infoDiv.is(':visible')) {
            infoDiv.slideUp();
            return;
          }

          infoDiv.html(`
            <div class="d-flex justify-content-center">
              <div class="spinner-border text-secondary" role="status">
                <span class="visually-hidden">Loading details...</span>
              </div>
            </div>
          `).slideDown();

          $.ajax({
            url: `https://api.coingecko.com/api/v3/coins/${coinId}`,
            method: 'GET',
            success: function (coinData) {
              const image = coinData.image.large;
              const priceUsd = coinData.market_data.current_price.usd;
              const priceEur = coinData.market_data.current_price.eur;
              const priceIls = coinData.market_data.current_price.ils;

              infoDiv.html(`
                <img src="${image}" alt="${coinData.name}" width="50"><br>
                <strong>Price USD:</strong> $${priceUsd}<br>
                <strong>Price EUR:</strong> €${priceEur}<br>
                <strong>Price ILS:</strong> ₪${priceIls}
              `);
            },
            error: function () {
              infoDiv.html('<p class="text-danger">Failed to load details.</p>');
            }
          });
        });

        button.prop('disabled', false).text('Load Coins');
      },
      error: function () {
        $('#coins-container').html('<p class="text-danger">Failed to load coins.</p>');
        button.prop('disabled', false).text('Load Coins');
      }
    });
  });
});


