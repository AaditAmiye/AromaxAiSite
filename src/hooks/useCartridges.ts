import { useState, useEffect } from 'react';
import { cartridgeService } from '../services/cartridges/cartridgeService';
import { AromaChannel } from '../types/aroma';

export function useCartridges() {
  const [cartridges, setCartridges] = useState<AromaChannel[]>(cartridgeService.getCartridges());

  useEffect(() => {
    const unsubscribe = cartridgeService.subscribe((updated) => {
      setCartridges(updated);
    });
    return unsubscribe;
  }, []);

  const channelMap = cartridgeService.getChannelMap();
  const workingChannels = cartridges.filter(
    (c) => c.status === 'working' && !c.isLighting && !c.isAirflow
  );
  const workingChannelIds = workingChannels.map((c) => c.id);
  const unassignedChannels = cartridges.filter(
    (c) => c.status === 'unassigned' || c.category === 'unassigned'
  );

  return {
    cartridges,
    channelMap,
    workingChannels,
    workingChannelIds,
    unassignedChannels,
    updateChannel: (id: string, updates: Partial<AromaChannel>) =>
      cartridgeService.updateChannel(id, updates),
    resetToDefaults: () => cartridgeService.resetToDefaults(),
    findChannelForSmell: (query: string) => cartridgeService.findChannelForSmell(query)
  };
}
