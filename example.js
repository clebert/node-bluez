import {Adapter} from './lib/index.js';
import {SystemDBus} from '@clebert/node-d-bus';

const dBus = new SystemDBus();

await dBus.connectAsExternal();

try {
  await dBus.hello();

  const [adapter] = await Adapter.getAll(dBus);

  if (!adapter) {
    throw new Error(`Adapter not found.`);
  }

  const unlockAdapter = await adapter.lock.aquire();

  try {
    await adapter.setPowered(true);

    await adapter.setDiscoveryFilter({
      serviceUUIDs: [`xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`],
      transport: `le`,
    });

    await adapter.startDiscovery();

    let device;

    try {
      device = await adapter.waitForDevice(`XX:XX:XX:XX:XX:XX`);
    } finally {
      await adapter.stopDiscovery();
    }

    await device.connect();

    const gattCharacteristic = await device.waitForGattCharacteristic(
      `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`,
    );

    await gattCharacteristic.writeValue([
      `f`.charCodeAt(0),
      `o`.charCodeAt(0),
      `o`.charCodeAt(0),
    ]);

    await device.disconnect();
  } finally {
    unlockAdapter();
  }
} finally {
  dBus.disconnect();
}
