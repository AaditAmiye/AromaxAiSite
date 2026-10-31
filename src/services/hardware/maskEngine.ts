import { HardwareMasks } from '../../types/aroma';

export interface HardwareChannelIndex {
  board: 'master' | 'slave';
  index: number; // 0 - 16
  bitMask: number; // 1 << index
}

// Master has 17 channels: H01 to H17 (indices 0 to 16)
// Slave has 17 channels: H18 to H34 (indices 0 to 16)
// H30 is the Fan on Slave (index 12: 30 - 18 = 12)
export const FAN_CHANNEL_ID = 'H30';
export const FAN_SLAVE_INDEX = 12;
export const FAN_BITMASK = 1 << FAN_SLAVE_INDEX; // 4096

/**
 * Converts an application channel ID (e.g. "H28", "H05") into board and hardware index.
 */
export function channelToHardwareIndex(channelId: string): HardwareChannelIndex | null {
  const match = channelId.trim().toUpperCase().match(/^H(\d{1,2})$/);
  if (!match) return null;

  const num = parseInt(match[1], 10);
  if (num < 1 || num > 34) return null;

  if (num <= 17) {
    const index = num - 1; // 0..16
    return {
      board: 'master',
      index,
      bitMask: 1 << index
    };
  } else {
    const index = num - 18; // 0..16
    return {
      board: 'slave',
      index,
      bitMask: 1 << index
    };
  }
}

/**
 * Calculates masterMask and slaveMask from an array of active channel IDs.
 * ALWAYS maintains the fan bit (H30, Slave bit 12) active unless enforceFanOff is true.
 */
export function channelsToMasks(
  channelIds: string[],
  options?: { enforceFanOff?: boolean }
): HardwareMasks {
  let masterMask = 0;
  let slaveMask = 0;

  for (const rawId of channelIds) {
    const hw = channelToHardwareIndex(rawId);
    if (!hw) continue;

    if (hw.board === 'master') {
      masterMask |= hw.bitMask;
    } else {
      slaveMask |= hw.bitMask;
    }
  }

  // Hardware Rule: The fan (H30, Slave index 12) is ALWAYS ON during normal operation
  if (!options?.enforceFanOff) {
    slaveMask |= FAN_BITMASK;
  }

  return {
    masterMask,
    slaveMask
  };
}

/**
 * Reconstructs active channel IDs from masterMask and slaveMask
 */
export function masksToChannels(
  masterMask: number,
  slaveMask: number,
  includeAirflowAndLighting = false
): string[] {
  const channels: string[] = [];

  // Master channels: H01 to H17
  for (let i = 0; i <= 16; i++) {
    if ((masterMask & (1 << i)) !== 0) {
      const num = i + 1;
      const id = `H${num.toString().padStart(2, '0')}`;
      if (!includeAirflowAndLighting) {
        if (id === 'H02' || id === 'H03' || id === 'H13') continue;
      }
      channels.push(id);
    }
  }

  // Slave channels: H18 to H34
  for (let i = 0; i <= 16; i++) {
    if ((slaveMask & (1 << i)) !== 0) {
      const num = i + 18;
      const id = `H${num.toString().padStart(2, '0')}`;
      if (!includeAirflowAndLighting) {
        if (id === FAN_CHANNEL_ID) continue; // Skip reporting fan as an aroma
      }
      channels.push(id);
    }
  }

  return channels;
}
