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

		@diffProperty('registry')
		public diffPropertyRegistry(previousValue: FactoryRegistry, value: FactoryRegistry): PropertyChangeRecord {
			const changed = previousValue !== value;
			if (changed) {
				const position = this._registries.indexOf(previousValue);
				if (position > -1) {
					this._registries[position] = value;
				}
				else {
					this._registries.push(value);
				}
			}
			return {
				changed,
				value
			};
		}
	};
	return Registry;
}

export default RegistryMixin;
