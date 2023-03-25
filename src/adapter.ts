import type {DBus} from '@clebert/node-d-bus';
import {
  MemberElement,
  ObjectElement,
  ProxyObject,
  SystemDBus,
} from '@clebert/node-d-bus';
import {
  arrayType,
  assertType,
  booleanType,
  dictEntryType,
  objectPathType,
  stringType,
  variantType,
} from 'd-bus-type-system';
import {Device} from './device.js';
import {Lock} from './lock.js';

export interface DiscoveryFilter {
  readonly serviceUUIDs?: readonly string[];
  readonly transport?: 'auto' | 'bredr' | 'le';
}

export interface WaitForDeviceOptions {
  /** Default: `50` milliseconds (ms) */
  readonly pollInterval?: number;

  /** Default: `false` */
  readonly resolveServiceData?: boolean;
}

const locks = new Map<string, Lock>();

/**
 * https://git.kernel.org/pub/scm/bluetooth/bluez.git/tree/doc/adapter-api.txt
 */
export class Adapter extends ProxyObject {
  static readonly interfaceName = `org.bluez.Adapter1`;

  static async getAll(
    dBus: DBus,
    address?: string,
  ): Promise<readonly Adapter[]> {
    const objectElements = await ObjectElement.getAll(dBus, `org.bluez`);

    return objectElements
      .filter((objectElement) =>
        objectElement.hasInterface(
          Adapter.interfaceName,
          address ? new MemberElement(`Address`, address) : undefined,
        ),
      )
      .map(({objectPath}) => new Adapter(dBus, objectPath));
  }

  static async use<TResult>(
    operation: (adapter: Adapter) => Promise<TResult>,
    address?: string,
  ): Promise<TResult> {
    const dBus = new SystemDBus();

    await dBus.connectAsExternal();

    try {
      await dBus.hello();

      const [adapter] = await Adapter.getAll(dBus, address);

      if (!adapter) {
        throw new Error(`Adapter not found.`);
      }

      const unlockAdapter = await adapter.lock.aquire();

      try {
        return await operation(adapter);
      } finally {
        unlockAdapter();
      }
    } finally {
      dBus.disconnect();
    }
  }

  constructor(dBus: DBus, objectPath: string) {
    super(dBus, `org.bluez`, objectPath, Adapter.interfaceName);
  }

  get lock(): Lock {
    const lock = locks.get(this.objectPath) ?? new Lock();

    if (!locks.has(this.objectPath)) {
      locks.set(this.objectPath, lock);
    }

    return lock;
  }

  async waitForDevice(
    address: string,
    options: WaitForDeviceOptions = {},
  ): Promise<Device> {
    let device: Device | undefined;

    while (
      !(device = (await this.getDevices(address))[0]) ||
      (options.resolveServiceData && !(await device.getServiceData()))
    ) {
      await new Promise((resolve) =>
        setTimeout(resolve, options.pollInterval ?? 50),
      );
    }

    return device;
  }

  async getDevices(address?: string): Promise<readonly Device[]> {
    const objectElements = await this.getObjectElements();

    return objectElements
      .filter(
        (objectElement) =>
          objectElement.objectPath.startsWith(this.objectPath) &&
          objectElement.hasInterface(
            Device.interfaceName,
            address ? new MemberElement(`Address`, address) : undefined,
          ),
      )
      .map(({objectPath}) => new Device(this.dBus, objectPath));
  }

  async removeDevice(device: Device): Promise<void> {
    await this.callMethod(
      `RemoveDevice`,
      [objectPathType],
      [device.objectPath],
    );
  }

  async startDiscovery(): Promise<void> {
    await this.callMethod(`StartDiscovery`);
  }

  async stopDiscovery(): Promise<void> {
    await this.callMethod(`StopDiscovery`);
  }

  async setDiscoveryFilter(filter: DiscoveryFilter = {}): Promise<void> {
    await this.callMethod(
      `SetDiscoveryFilter`,
      [arrayType(dictEntryType(stringType, variantType))],
      [
        [
          ...(filter.serviceUUIDs
            ? [[`UUIDs`, [arrayType(stringType), filter.serviceUUIDs]]]
            : []),
          ...(filter.transport
            ? [[`Transport`, [stringType, filter.transport]]]
            : []),
        ],
      ],
    );
  }

  async isDiscovering(): Promise<boolean> {
    const value = await this.getProperty(`Discovering`);

    assertType(booleanType, value);

    return value;
  }

  async isPowered(): Promise<boolean> {
    const value = await this.getProperty(`Powered`);

    assertType(booleanType, value);

    return value;
  }

  async setPowered(value: boolean): Promise<void> {
    await this.setProperty(`Powered`, booleanType, value);
  }
}
