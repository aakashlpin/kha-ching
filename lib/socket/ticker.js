import { KiteTicker } from 'kiteconnect';

const ticker = {};

export const useKiteTicker = ({
  apiKey,
  accessToken,
  onConnect,
  onDisconnect,
  onError,
  onClose,
  onReconnect,
  onNoReconnect,
  onOrderUpdate
}) => {
  const cacheKey = `${apiKey}_${accessToken}}`;
  if (ticker[cacheKey]) {
    return ticker[cacheKey];
  }

  const kt = new KiteTicker({
    api_key: apiKey,
    access_token: accessToken
  });

  kt.connect();

  onConnect && kt.on('connect', onConnect);
  onDisconnect && kt.on('disconnect', onDisconnect);
  onError && kt.on('error', onError);
  onClose && kt.on('close', onClose);
  onReconnect && kt.on('reconnect', onReconnect);
  onNoReconnect && kt.on('noreconnect', onNoReconnect);

  onOrderUpdate && kt.on('order_update', onOrderUpdate);

  ticker[cacheKey] = kt;
  return ticker[cacheKey];
};
