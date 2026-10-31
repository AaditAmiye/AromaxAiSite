import { AromaChannel } from '../../types/aroma';
import { AROMA_CHANNELS as DEFAULT_AROMA_CHANNELS } from '../../data/aromas';
import { db, isFirebaseConfigured } from '../firebase/firebaseClient';
import { ref, set, get, onValue } from 'firebase/database';

const LOCAL_STORAGE_KEY = 'aromaxai_custom_cartridges';
const DEVICE_ID = 'aromaxai-master-01';

type CartridgeListener = (cartridges: AromaChannel[]) => void;

class CartridgeService {
  private cartridges: AromaChannel[] = [];
  private listeners = new Set<CartridgeListener>();
  private isInitialized = false;

  constructor() {
    // 1. Initialize from baseline defaults
    this.cartridges = JSON.parse(JSON.stringify(DEFAULT_AROMA_CHANNELS));

    // 2. Immediately hydrate from localStorage for instantaneous UI render
    this.hydrateFromLocalStorage();
    if (typeof window !== 'undefined') {
      (window as any).__AROMAXAI_DYNAMIC_CHANNEL_MAP = this.getChannelMap();
    }

    // 3. Hydrate from server API & Firebase asynchronously
    if (typeof window !== 'undefined') {
      setTimeout(() => {
        this.syncWithBackendAndFirebase();
      }, 0);
    }
  }

  private hydrateFromLocalStorage() {
    if (typeof localStorage === 'undefined') return;
    try {
      const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (stored) {
        const parsed: AromaChannel[] = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          this.mergeCartridges(parsed);
        }
      }
    } catch (err) {
      console.warn('[CartridgeService] localStorage hydration warning:', err);
    }
  }

  private mergeCartridges(customList: Partial<AromaChannel>[]) {
    const map = new Map<string, AromaChannel>();
    // Baseline first
    for (const ch of DEFAULT_AROMA_CHANNELS) {
      map.set(ch.id.toUpperCase(), { ...ch });
    }
    // Overlay custom
    for (const c of customList) {
      if (!c.id) continue;
      const upperId = c.id.toUpperCase();
      const existing = map.get(upperId);
      if (existing) {
        map.set(upperId, {
          ...existing,
          ...c,
          id: upperId,
          channelNumber: existing.channelNumber,
          board: existing.board,
          boardIndex: existing.boardIndex
        });
      }
    }
    this.cartridges = Array.from(map.values()).sort((a, b) => a.channelNumber - b.channelNumber);
    this.notify();
  }

  private async syncWithBackendAndFirebase() {
    if (this.isInitialized) return;
    this.isInitialized = true;

    // Try fetching from server-side persistent endpoint
    try {
      const res = await fetch('/api/cartridges');
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.cartridges) && data.cartridges.length > 0) {
          this.mergeCartridges(data.cartridges);
          this.saveToLocalStorage();
        }
      }
    } catch (err) {
      console.debug('[CartridgeService] Backend sync notice:', err);
    }

    // Try syncing with Firebase Realtime Database
    if (isFirebaseConfigured && db) {
      try {
        const cartridgeRef = ref(db, `devices/${DEVICE_ID}/cartridges`);
        // Initial fetch
        const snapshot = await get(cartridgeRef);
        if (snapshot.exists()) {
          const val = snapshot.val();
          if (Array.isArray(val)) {
            this.mergeCartridges(val);
            this.saveToLocalStorage();
          } else if (typeof val === 'object' && val !== null) {
            const list = Object.values(val) as AromaChannel[];
            this.mergeCartridges(list);
            this.saveToLocalStorage();
          }
        } else {
          // Push current state to Firebase so it is permanently seeded
          await set(cartridgeRef, this.cartridges);
        }

        // Realtime listener for cross-device synchronization
        onValue(cartridgeRef, (snap) => {
          if (snap.exists()) {
            const val = snap.val();
            const list = Array.isArray(val) ? val : (Object.values(val || {}) as AromaChannel[]);
            if (list.length > 0) {
              this.mergeCartridges(list);
              this.saveToLocalStorage();
            }
          }
        });
      } catch (err) {
        console.warn('[CartridgeService] Firebase sync warning:', err);
      }
    }
  }

  private saveToLocalStorage() {
    if (typeof localStorage === 'undefined') return;
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(this.cartridges));
    } catch {
      // ignore
    }
  }

  private notify() {
    if (typeof window !== 'undefined') {
      (window as any).__AROMAXAI_DYNAMIC_CHANNEL_MAP = this.getChannelMap();
    }
    for (const listener of this.listeners) {
      try {
        listener([...this.cartridges]);
      } catch (err) {
        console.error('[CartridgeService] Listener error:', err);
      }
    }
  }

  public subscribe(listener: CartridgeListener): () => void {
    this.listeners.add(listener);
    listener([...this.cartridges]);
    return () => {
      this.listeners.delete(listener);
    };
  }

  public getCartridges(): AromaChannel[] {
    return [...this.cartridges];
  }

  public getChannelMap(): Record<string, AromaChannel> {
    const map: Record<string, AromaChannel> = {};
    for (const ch of this.cartridges) {
      map[ch.id] = ch;
    }
    return map;
  }

  public getChannel(id: string): AromaChannel | undefined {
    return this.cartridges.find((c) => c.id.toUpperCase() === id.trim().toUpperCase());
  }

  public getWorkingChannels(): AromaChannel[] {
    return this.cartridges.filter(
      (c) => c.status === 'working' && !c.isLighting && !c.isAirflow
    );
  }

  public getWorkingChannelIds(): string[] {
    return this.getWorkingChannels().map((c) => c.id);
  }

  /**
   * Dynamically finds the best matching channel for a requested smell query.
   * e.g., if H01 is named "Pizza", findChannelForSmell("pizza") returns H01.
   * e.g., if H01 is changed to "Rain", findChannelForSmell("rain") returns H01.
   */
  public findChannelForSmell(query: string): AromaChannel | undefined {
    const q = query.trim().toLowerCase();
    if (!q) return undefined;

    // 1. Direct name match
    const exact = this.cartridges.find(
      (c) => c.name.toLowerCase() === q && c.status === 'working'
    );
    if (exact) return exact;

    // 2. Name contains query
    const partial = this.cartridges.find(
      (c) => c.status === 'working' && c.name.toLowerCase().includes(q)
    );
    if (partial) return partial;

    // 3. Keywords / chemicalCompound match
    const keywordMatch = this.cartridges.find((c) => {
      if (c.status !== 'working') return false;
      if (c.keywords?.some((k) => k.toLowerCase().includes(q) || q.includes(k.toLowerCase()))) {
        return true;
      }
      if (c.description?.toLowerCase().includes(q)) return true;
      if (c.chemicalCompound?.toLowerCase().includes(q)) return true;
      return false;
    });
    if (keywordMatch) return keywordMatch;

    return undefined;
  }

  /**
   * Updates an individual channel and permanently persists to:
   * 1. In-memory state & localStorage
   * 2. Backend server (/api/cartridges)
   * 3. Firebase Realtime Database
   */
  public async updateChannel(
    id: string,
    updates: Partial<AromaChannel>
  ): Promise<{ success: boolean; error?: string }> {
    const upperId = id.trim().toUpperCase();
    const idx = this.cartridges.findIndex((c) => c.id.toUpperCase() === upperId);
    if (idx === -1) {
      return { success: false, error: `Channel ${id} not found.` };
    }

    const current = this.cartridges[idx];
    const updatedChannel: AromaChannel = {
      ...current,
      ...updates,
      id: upperId,
      channelNumber: current.channelNumber,
      board: current.board,
      boardIndex: current.boardIndex,
      lastModified: Date.now()
    };

    // If an unassigned channel was given a valid scent name, upgrade its status to working unless specified
    if (
      current.status === 'unassigned' &&
      updates.name &&
      updates.name.trim() !== current.name &&
      (!updates.status || updates.status === 'unassigned')
    ) {
      updatedChannel.status = 'working';
      if (updatedChannel.category === 'unassigned') {
        updatedChannel.category = 'savory';
      }
    }

    this.cartridges[idx] = updatedChannel;
    this.saveToLocalStorage();
    this.notify();

    // Persist to Server API
    try {
      await fetch(`/api/cartridges/${upperId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedChannel)
      });
    } catch (err) {
      console.warn('[CartridgeService] Server persist failed:', err);
    }

    // Persist to Firebase Realtime Database
    if (isFirebaseConfigured && db) {
      try {
        await Promise.all([
          set(ref(db, `devices/${DEVICE_ID}/cartridges/${idx}`), updatedChannel),
          set(ref(db, `cartridges/${upperId}`), updatedChannel)
        ]);
      } catch (err) {
        console.warn('[CartridgeService] Firebase persist warning:', err);
      }
    }

    return { success: true };
  }

  /**
   * Resets all cartridges back to factory defaults
   */
  public async resetToDefaults(): Promise<{ success: boolean; error?: string }> {
    this.cartridges = JSON.parse(JSON.stringify(DEFAULT_AROMA_CHANNELS));
    this.saveToLocalStorage();
    this.notify();

    try {
      await fetch('/api/cartridges/reset', { method: 'POST' });
    } catch {
      // ignore
    }

    if (isFirebaseConfigured && db) {
      try {
        await set(ref(db, `devices/${DEVICE_ID}/cartridges`), this.cartridges);
      } catch (err) {
        console.warn('[CartridgeService] Firebase reset warning:', err);
      }
    }

    return { success: true };
  }
}

export const cartridgeService = new CartridgeService();
