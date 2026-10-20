import { useEffect, useRef, useState } from "react";
import {
  loadYandexMaps,
  mapDestination,
  yandexRouteUrl,
} from "../maps/yandexMaps";
import Icon from "./Icon";

const MAPS_API_KEY = import.meta.env.VITE_YANDEX_MAPS_API_KEY || "";

export default function CampusMap({ address, name, apiKey = MAPS_API_KEY }) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const mountedRef = useRef(false);
  const [isActive, setIsActive] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [coordinates, setCoordinates] = useState(null);
  const [isLocating, setIsLocating] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);
  useEffect(() => {
    if (!isActive || !apiKey) return;
    let cancelled = false;
    let map;
    loadYandexMaps(apiKey)
      .then((ymaps) => {
        if (cancelled) return;
        map = new ymaps.Map(containerRef.current, {
          center: [55.76, 37.62],
          zoom: 11,
          controls: ["zoomControl", "routePanelControl"],
        });
        mapRef.current = map;
        const panel = map.controls.get("routePanelControl").routePanel;
        panel.state.set({
          type: "masstransit",
          fromEnabled: true,
          toEnabled: false,
          to: mapDestination(address),
        });
        panel.options.set({
          allowSwitch: false,
          types: { masstransit: true, pedestrian: true, auto: true },
        });
        setIsReady(true);
      })
      .catch((requestError) => {
        if (!cancelled) setError(requestError.message);
      });
    return () => {
      cancelled = true;
      map?.destroy();
      mapRef.current = null;
    };
  }, [isActive, address, apiKey]);

  function locateUser() {
    if (!navigator.geolocation || !window.isSecureContext) {
      setError(
        "Геопозиция недоступна. Введите точку отправления вручную на карте.",
      );
      return;
    }
    setIsLocating(true);
    setError("");
    // Один запрос после нажатия; координаты не записываются в БД или историю.
    navigator.geolocation.getCurrentPosition(
      (position) => {
        if (!mountedRef.current) return;
        const location = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        };
        setCoordinates(location);
        setIsLocating(false);
        mapRef.current?.controls
          .get("routePanelControl")
          .routePanel.state.set("from", [
            location.latitude,
            location.longitude,
          ]);
      },
      () => {
        if (!mountedRef.current) return;
        setIsLocating(false);
        setError(
          "Не удалось определить местоположение. Можно указать отправление вручную в Яндекс Картах.",
        );
      },
      { enableHighAccuracy: false, timeout: 10_000, maximumAge: 0 },
    );
  }
  if (!address)
    return <p className="muted">Для этого места адрес пока не указан.</p>;
  return (
    <section className="campus-map" aria-label={`Карта: ${name}`}>
      {!isActive ? (
        <div className="map-placeholder">
          <Icon name="pin" />
          <strong>Добраться до корпуса</strong>
          <p>
            Карту предоставляет Яндекс. Она загрузится после нажатия; геопозиция
            — только по отдельному запросу.
          </p>
          <button className="primary-button" onClick={() => setIsActive(true)}>
            Показать карту
            <Icon name="arrowRight" />
          </button>
        </div>
      ) : (
        <>
          {apiKey ? (
            <>
              <div className="map-canvas" ref={containerRef} />
              {!isReady && !error && <p role="status">Загружаем карту…</p>}
            </>
          ) : (
            <iframe
              title={`Яндекс Карты: ${name}`}
              src={`https://yandex.ru/map-widget/v1/?${new URLSearchParams({ text: mapDestination(address), z: "16" })}`}
              className="map-canvas"
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            />
          )}
          <button
            className="secondary-button"
            onClick={locateUser}
            disabled={isLocating || (!!apiKey && !isReady && !error)}
          >
            <Icon name="locate" />
            {isLocating ? "Определяем положение…" : "Маршрут от меня"}
          </button>
          <p className="map-note">
            {coordinates ? "Положение определено. " : ""}
            {apiKey
              ? "Укажите отправление на карте или разрешите геопозицию. Координаты передаются Яндексу для маршрута."
              : "Маршрут откроется в Яндекс Картах. Геопозиция передаётся при переходе по ссылке."}
          </p>
        </>
      )}
      {error && (
        <p className="error-banner" role="alert">
          {error}
        </p>
      )}
      <a
        className="map-link"
        href={yandexRouteUrl(address, coordinates)}
        target="_blank"
        rel="noreferrer"
      >
        Открыть маршрут в Яндекс Картах
        <Icon name="external" />
      </a>
    </section>
  );
}
