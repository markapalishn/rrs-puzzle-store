const formatRub = (value) =>
  new Intl.NumberFormat("ru-RU", {
    style: "currency",
    currency: "RUB",
    maximumFractionDigits: 0
  }).format(value);

const getPaymentsWidget = () => {
  if (!window.cp || !window.cp.CloudPayments) return null;
  return new window.cp.CloudPayments();
};

const getPageUrl = (filename) => new URL(`./${filename}`, window.location.href).href;

const buildIntentParams = (product, dolyameOnly = false) => {
  const params = {
    publicTerminalId: "test_api_00000000000000000000002",
    description: `Оплата товара: ${product.name}`,
    paymentSchema: "Single",
    amount: product.price,
    currency: "RUB",
    culture: "ru-RU",
    skin: "classic",
    externalId: `order_${Date.now()}`,
    userInfo: {
      accountId: product.id,
      email: ""
    },
    successRedirectUrl: getPageUrl("success.html"),
    failRedirectUrl: getPageUrl("fail.html")
  };

  if (dolyameOnly) {
    params.restrictedPaymentMethods = [
      "Card",
      "TcsInstallment",
      "Sbp",
      "TinkoffPay",
      "MirPay",
      "ForeignCard",
      "SberPay"
    ];
  }

  return params;
};

const startWidgetCheckout = async (product, dolyameOnly = false) => {
  const payments = getPaymentsWidget();
  if (!payments) return;

  try {
    const intentParams = buildIntentParams(product, dolyameOnly);
    await payments.start(intentParams);
  } catch (_error) {}
};

const getInstallmentText = (price) => {
  const installmentAmount = Math.round(price / 4);
  return `4 платежа по ${formatRub(installmentAmount)}`;
};

const loadProducts = async () => {
  try {
    const apiResponse = await fetch("./api/products");
    if (apiResponse.ok) return await apiResponse.json();
  } catch (_error) {}

  const staticResponse = await fetch("./data/products.json");
  if (!staticResponse.ok) {
    throw new Error("Не удалось загрузить список товаров");
  }

  return staticResponse.json();
};

const renderProducts = async () => {
  const grid = document.getElementById("products-grid");
  const products = await loadProducts();

  grid.innerHTML = products
    .map(
      (product) => `
      <article class="card">
        ${
          product.image
            ? `<img class="product-image" src="${product.image}" alt="${product.name}" />`
            : `<div class="placeholder product-image" aria-hidden="true"></div>`
        }
        <h3>${product.name}</h3>
        <p class="muted">${product.description}</p>
        <p class="price">${formatRub(product.price)}</p>
        <div class="card__actions">
          <a class="btn btn--primary" href="./product.html?id=${encodeURIComponent(product.id)}">Подробнее</a>
          <button class="dolyame-pay-btn" type="button" data-dolyame-id="${product.id}">
            <span class="dolyame-pay-btn__badge">
              <img src="./logo/Branding%20badge%E2%80%93white.svg" alt="Долями" />
            </span>
            <span class="dolyame-pay-btn__text">${getInstallmentText(product.price)}</span>
            <span class="dolyame-pay-btn__arrow" aria-hidden="true">›</span>
          </button>
        </div>
      </article>
    `
    )
    .join("");

  grid.querySelectorAll("[data-dolyame-id]").forEach((button) => {
    button.addEventListener("click", () => {
      const productId = button.getAttribute("data-dolyame-id");
      const product = products.find((item) => String(item.id) === String(productId));
      if (!product) return;
      startWidgetCheckout(product, true);
    });
  });
};

const startCarousel = () => {
  const track = document.getElementById("carousel-track");
  if (!track) return;

  const slides = track.children.length;
  let index = 0;

  setInterval(() => {
    index = (index + 1) % slides;
    track.style.transform = `translateX(-${index * 100}%)`;
  }, 3600);
};

renderProducts().catch((error) => {
  console.error(error);
});
startCarousel();
