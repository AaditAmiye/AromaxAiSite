import { useState, useEffect } from 'react';
import { deviceService } from '../services/device/DeviceService';
import { DeviceState, TransportMode } from '../types/device';
import { ALL_NON_LIGHTING_CHANNEL_IDS, UNASSIGNED_CHANNEL_IDS } from '../data/aromas';

export function useDevice() {
  const [deviceState, setDeviceState] = useState<DeviceState>(deviceService.getState());

  useEffect(() => {
    const unsubscribe = deviceService.subscribe((state) => {
      setDeviceState(state);
    });
    return unsubscribe;
  }, []);

  const isAllOn =
    deviceState.activeChannels.length >= ALL_NON_LIGHTING_CHANNEL_IDS.length &&
    ALL_NON_LIGHTING_CHANNEL_IDS.every((id) => deviceState.activeChannels.includes(id));

  const areAllUnassignedOn =
    UNASSIGNED_CHANNEL_IDS.length > 0 &&
    UNASSIGNED_CHANNEL_IDS.every((id) => deviceState.activeChannels.includes(id));

  const isAnyUnassignedOn =
    UNASSIGNED_CHANNEL_IDS.some((id) => deviceState.activeChannels.includes(id));

  return {
    ...deviceState,
    isAllOn,
    areAllUnassignedOn,
    isAnyUnassignedOn,
    allNonLightingCount: ALL_NON_LIGHTING_CHANNEL_IDS.length,
    unassignedChannelIds: UNASSIGNED_CHANNEL_IDS,
    setTransportMode: (mode: TransportMode) => deviceService.setTransportMode(mode),
    setEspHost: (host: string) => deviceService.setEspHost(host),
    setDeviceId: (id: string) => deviceService.setDeviceId(id),
    setFan: (enabled: boolean) => deviceService.setFan(enabled),
    toggleFan: () => deviceService.toggleFan(),
    checkConnectivity: () => deviceService.checkConnectivity(),
    testChannel: (channelId: string, durationSeconds: number) =>
      deviceService.testChannel(channelId, durationSeconds),
    toggleChannel: (channelId: string) => deviceService.toggleChannel(channelId),
    setUnassignedPins: (enable: boolean) => deviceService.setUnassignedPins(enable),
    setRgbLight: (r: number, g: number, b: number) => deviceService.setRgbLight(r, g, b),
    toggleLightChannel: (channelId: 'H02' | 'H03' | 'H13') => deviceService.toggleLightChannel(channelId),
    triggerOtaUpdate: (customUrl?: string) => deviceService.triggerOtaUpdate(customUrl),
    requestWifiScan: () => deviceService.requestWifiScan(),
    configureWifi: (ssid: string, password = '') => deviceService.configureWifi(ssid, password),
    claimDevice: (deviceId: string, claimCode: string, ownerUid?: string) =>
      deviceService.claimDevice(deviceId, claimCode, ownerUid),
    turnAllOn: () => deviceService.turnAllOn(),
    turnAllOff: () => deviceService.turnAllOff(),
    stopAll: () => deviceService.stopAll()
  };
}
