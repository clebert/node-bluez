import type {DBus} from '@clebert/node-d-bus';

import {GattCharacteristic} from './gatt-characteristic.js';
import {MemberElement, ProxyObject} from '@clebert/node-d-bus';
import {
  arrayType,
  assertType,
  booleanType,
  dictEntryType,
  stringType,
  uint8Type,
  variantType,
} from 'd-bus-type-system';

export interface WaitForGattCharacteristicOptions {
  /** Default: `50` */
  readonly pollInterval?: number;
}

/**
 * https://git.kernel.org/pub/scm/bluetooth/bluez.git/tree/doc/device-api.txt
 */
export class Device extends ProxyObject {
  static readonly interfaceName = `org.bluez.Device1`;

  constructor(dBus: DBus, objectPath: string) {
    super(dBus, `org.bluez`, objectPath, Device.interfaceName);
  }

  async waitForGattCharacteristic(
    uuid: string,
    options: WaitForGattCharacteristicOptions = {},
  ): Promise<GattCharacteristic> {
    let gattCharacteristic: GattCharacteristic | undefined;

    while (
      !(gattCharacteristic = (await this.getGattCharacteristics(uuid))[0])
    ) {
      await new Promise((resolve) =>
        setTimeout(resolve, options.pollInterval ?? 50),
      );
    }

    return gattCharacteristic;
  }

  async getGattCharacteristics(
    uuid?: string,
  ): Promise<readonly GattCharacteristic[]> {
    const objectElements = await this.getObjectElements();

    return objectElements
      .filter(
        (objectElement) =>
          objectElement.objectPath.startsWith(this.objectPath) &&
          objectElement.hasInterface(
            GattCharacteristic.interfaceName,
            uuid ? new MemberElement(`UUID`, uuid) : undefined,
          ),
      )
      .map(({objectPath}) => new GattCharacteristic(this.dBus, objectPath));
  }

  async connect(): Promise<void> {
    while (true) {
      try {
        await this.callMethod(`Connect`);

        return;
      } catch (error) {
        if (
          error instanceof Error &&
          !error.message.includes(`Software caused connection abort`)
        ) {
          throw error;
        }

        await this.callMethod(`Disconnect`);
      }
    }
  }

  async disconnect(): Promise<void> {
    await this.callMethod(`Disconnect`);
  }

  async isConnected(): Promise<boolean> {
    const value = await this.getProperty(`Connected`);

    assertType(booleanType, value);

    return value;
  }

  async getAddress(): Promise<string> {
    const value = await this.getProperty(`Address`);

    assertType(stringType, value);

    return value;
  }

  async getServiceData(): Promise<
    Readonly<Record<string, readonly number[]>> | undefined
  > {
    const value = await this.getProperty(`ServiceData`);

    if (value === undefined) {
      return undefined;
    }

    assertType(arrayType(dictEntryType(stringType, variantType)), value);

    const serviceData: Record<string, readonly number[]> = {};

    for (const entry of value) {
      const bytes = entry[1][1];

      assertType(arrayType(uint8Type), bytes);

      serviceData[entry[0]] = bytes;
    }

    return serviceData;
  }
}
