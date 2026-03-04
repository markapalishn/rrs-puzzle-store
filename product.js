const formatRub = (value) =>
  new Intl.NumberFormat("ru-RU", {
    style: "currency",
    currency: "RUB",
    maximumFractionDigits: 0
  }).format(value);

const getProductId = () => {
  const params = new URLSearchParams(window.location.search);
  const fromQuery = params.get("id");
  if (fromQuery) return fromQuery;

  const chunks = window.location.pathname.split("/").filter(Boolean);
  return chunks[chunks.length - 1] || "";
};

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

const getProductById = async (id) => {
  try {
    const apiResponse = await fetch(`./api/products/${encodeURIComponent(id)}`);
    if (apiResponse.ok) return await apiResponse.json();
  } catch (_error) {}

  const products = await loadProducts();
  return products.find((item) => item.id === id) || null;
};

const renderProduct = async () => {
  const id = getProductId();
  const target = document.getElementById("product-details");
  const product = await getProductById(id);

  if (!product) {
    target.innerHTML = "<p>Товар не найден.</p>";
    return;
  }

  target.innerHTML = `
    ${
      product.image
        ? `<img class="product-image" src="${product.image}" alt="${product.name}" />`
        : `<div class="placeholder product-image" aria-hidden="true"></div>`
    }
    <div>
      <h1>${product.name}</h1>
      <p>${product.description}</p>
      <p class="price">${formatRub(product.price)}</p>
      <h3>Характеристики</h3>
      <ul class="characteristics">
        ${(product.characteristics || []).map((item) => `<li>${item}</li>`).join("")}
      </ul>
      <div class="row">
        <button class="btn btn--ghost" id="checkout-btn">Оплатить</button>
        <button class="dolyame-pay-btn" type="button" id="dolyame-btn">
          <span class="dolyame-pay-btn__badge">
            <img src="./logo/Branding%20badge%E2%80%93white.svg" alt="Долями" />
          </span>
          <span class="dolyame-pay-btn__text">${getInstallmentText(product.price)}</span>
          <span class="dolyame-pay-btn__arrow" aria-hidden="true">›</span>
        </button>
      </div>
    </div>
  `;

  document.getElementById("checkout-btn").addEventListener("click", () => {
    startWidgetCheckout(product, false);
  });

  document.getElementById("dolyame-btn").addEventListener("click", () => {
    startWidgetCheckout(product, true);
  });
};

renderProduct().catch((error) => {
  console.error(error);
});
