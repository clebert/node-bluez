// @ts-check

import {SystemDBus} from '@clebert/node-d-bus';
import {Adapter, timeout} from './lib/cjs';

(async () => {
  const dBus = new SystemDBus();

  await dBus.connectAsExternal();

  try {
    await dBus.hello();

    const [adapter] = await Adapter.getAll(dBus);

    if (!adapter) {
      throw new Error('Adapter not found.');
    }

    await adapter.setPowered(true);

    await adapter.setDiscoveryFilter({
      serviceUUIDs: ['xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx'],
      transport: 'le',
    });

    await adapter.startDiscovery();

    let device;

    try {
      device = await timeout(adapter.waitForDevice('XX:XX:XX:XX:XX:XX'), 5000);
    } finally {
      await adapter.stopDiscovery();
    }

    await timeout(device.connect(), 5000);

    const gattCharacteristic = await timeout(
      device.waitForGattCharacteristic('xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx'),
      5000
    );

    await gattCharacteristic.writeValue([
      'f'.charCodeAt(0),
      'o'.charCodeAt(0),
      'o'.charCodeAt(0),
    ]);

    await device.disconnect();
  } finally {
    dBus.disconnect();
  }
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
