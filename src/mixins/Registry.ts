import FactoryRegistry from '../FactoryRegistry';
import { WidgetBase, diffProperty } from './../WidgetBase';
import {
	PropertyChangeRecord,
	Constructor,
	WidgetProperties
} from '../interfaces';

export interface RegistryMixinProperties extends WidgetProperties {
	registry: FactoryRegistry;
}

export function RegistryMixin<T extends Constructor<WidgetBase<RegistryMixinProperties>>>(base: T): T {
	class Registry extends base {

		factorySize: number | undefined;

		@diffProperty('registry')
		public diffPropertyRegistry(previousValue: FactoryRegistry, value: FactoryRegistry): PropertyChangeRecord {
			const size = value ? value.size : undefined;
			const same = previousValue === value && this.factorySize === size;
			this.factorySize = size;
			if (!same) {
				const index = this._registries.indexOf(previousValue);
				index > -1 ? this._registries[index] = value : this._registries.push(value);
			}
			return { changed: !same, value };
		}
	};
	return Registry;
}

export default RegistryMixin;
