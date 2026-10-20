let mapsPromise;

export function loadYandexMaps(apiKey) {
  if (mapsPromise) return mapsPromise;
  mapsPromise = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    const timeout = setTimeout(() => fail(), 20_000);
    function fail() {
      clearTimeout(timeout);
      script.remove();
      mapsPromise = null;
      reject(
        new Error(
          "Не удалось загрузить карту. Попробуйте открыть Яндекс Карты по ссылке.",
        ),
      );
    }
    script.src = `https://api-maps.yandex.ru/2.1/?${new URLSearchParams({ apikey: apiKey, lang: "ru_RU" })}`;
    script.async = true;
    script.onerror = fail;
    script.onload = () => {
      if (!window.ymaps) return fail();
      window.ymaps.ready(() => {
        clearTimeout(timeout);
        resolve(window.ymaps);
      });
    };
    document.head.append(script);
  });
  return mapsPromise;
}

export function mapDestination(address) {
  return /москва/i.test(address) ? address : `Москва, ${address}`;
}
export function yandexRouteUrl(address, coordinates = null) {
  const from = coordinates
    ? `${coordinates.latitude},${coordinates.longitude}`
    : "";
  return `https://yandex.ru/maps/?${new URLSearchParams({ mode: "routes", rtext: `${from}~${mapDestination(address)}`, rtt: "mt" })}`;
}
