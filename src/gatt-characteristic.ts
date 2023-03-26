import type {DBus} from '@clebert/node-d-bus';

import {ProxyObject} from '@clebert/node-d-bus';
import {
  arrayType,
  assertType,
  dictEntryType,
  stringType,
  structType,
  uint8Type,
  variantType,
} from 'd-bus-type-system';

/**
 * https://git.kernel.org/pub/scm/bluetooth/bluez.git/tree/doc/gatt-api.txt
 */
export class GattCharacteristic extends ProxyObject {
  static readonly interfaceName = `org.bluez.GattCharacteristic1`;

  constructor(dBus: DBus, objectPath: string) {
    super(dBus, `org.bluez`, objectPath, GattCharacteristic.interfaceName);
  }

  async writeValue(bytes: readonly number[]): Promise<void> {
    await this.callMethod(
      `WriteValue`,
      [arrayType(uint8Type), arrayType(dictEntryType(stringType, variantType))],
      [bytes, [[`type`, [stringType, `reliable`]]]],
    );
  }

  async readValue(): Promise<readonly number[]> {
    const {args} = await this.callMethod(
      `ReadValue`,
      [arrayType(dictEntryType(stringType, variantType))],
      [[]],
    );

    assertType(structType(arrayType(uint8Type)), args);

    return args[0];
  }
}
